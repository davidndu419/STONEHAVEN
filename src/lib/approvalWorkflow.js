import { dataService } from "./dataService";
import { createNotification } from "./enterprise";
import { approveInvestmentDeposit, rejectInvestmentDeposit } from "./investmentEngine";

const now = () => new Date().toISOString();

function requestTransactionMatches(transaction, collection, item) {
  const sourceId = collection === "deposits"
    ? transaction.depositId || transaction.sourceId
    : transaction.withdrawalId || transaction.sourceId;
  if (sourceId) return sourceId === item.id;

  const legacyTypes = collection === "deposits"
    ? ["deposit", "deposit_submitted", "balance_funding_submitted", "investment_funding_submitted", "weekly_deposit"]
    : ["withdrawal", "withdrawal_requested", "referral_withdrawal"];
  return legacyTypes.includes(transaction.type)
    && Number(transaction.amount || 0) === Number(item.amount || 0)
    && Math.abs(new Date(transaction.createdAt) - new Date(item.createdAt)) < 300000;
}

async function updateRequestTransaction(collection, item, status, actor, reason) {
  const transactions = await dataService.listForUser("transactions", item.userId);
  const transaction = transactions.find((entry) => requestTransactionMatches(entry, collection, item));
  if (!transaction) return;

  const reviewedAt = now();
  const changes = status === "approved"
    ? {
        label: collection === "deposits" ? "Deposit" : "Withdrawal",
        status: "approved",
        reviewedAt,
        approvedAt: reviewedAt,
        approvedBy: actor.userId,
      }
    : {
        label: collection === "deposits" ? "Deposit" : "Withdrawal",
        status: "declined",
        reviewedAt,
        declinedAt: reviewedAt,
        declinedBy: actor.userId,
        declineReason: reason,
      };
  await dataService.update("transactions", transaction.id, changes);
}

function notificationMessage(collection, item, status, reason) {
  const label = collection === "deposits" ? "deposit" : "withdrawal";
  const amount = `$${Number(item.amount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return status === "approved"
    ? `Your ${label} of ${amount} was approved.`
    : `Your ${label} of ${amount} was declined.\nReason: ${reason}`;
}

export async function reviewFinancialRequest({ collection, item, status, reason = "", actor }) {
  if (!["deposits", "withdrawals"].includes(collection)) throw new Error("Unsupported approval request.");
  if (!["approved", "declined"].includes(status)) throw new Error("Unsupported approval decision.");
  if (status === "declined" && !reason.trim()) throw new Error("A decline reason is required.");
  if (item.status !== "pending") throw new Error("This request has already been reviewed.");

  if (collection === "withdrawals" && status === "approved") {
    const user = await dataService.getUser(item.userId);
    const field = item.type === "referral" ? "referralBalance" : "availableBalance";
    const current = Number(user?.[field] || 0);
    if (current < Number(item.amount)) throw new Error("The user's current balance is insufficient for this approval.");
    await dataService.updateUser(item.userId, { [field]: current - Number(item.amount) });
  }

  if (collection === "deposits" && status === "approved" && !item.investmentId) {
    const user = await dataService.getUser(item.userId);
    await dataService.updateUser(item.userId, {
      availableBalance: Number(user?.availableBalance || 0) + Number(item.amount),
    });
  }
  if (collection === "deposits" && status === "approved" && item.investmentId) {
    await approveInvestmentDeposit(item);
  }
  if (collection === "deposits" && status === "declined" && item.investmentId) {
    await declineInvestmentFunding({ investmentId: item.investmentId, reason: reason.trim(), actor });
  }

  const reviewedAt = now();
  const changes = status === "approved"
    ? { status: "approved", reviewedAt, approvedAt: reviewedAt, approvedBy: actor.userId }
    : {
        status: "declined",
        reviewedAt,
        declineReason: reason.trim(),
        declinedAt: reviewedAt,
        declinedBy: actor.userId,
      };

  await dataService.update(collection, item.id, changes);
  await updateRequestTransaction(collection, item, status, actor, reason.trim());

  const singular = collection === "deposits" ? "Deposit" : "Withdrawal";
  await Promise.all([
    createNotification({
      userId: item.userId,
      adminId: item.adminId,
      type: singular.toLowerCase(),
      title: `${singular} ${status}`,
      message: notificationMessage(collection, item, status, reason.trim()),
    }),
    dataService.create("adminAuditRecords", {
      userId: item.userId,
      adminId: item.adminId,
      type: `${singular.toLowerCase()}_${status}`,
      label: `${singular} ${status}`,
      amount: Number(item.amount),
      status,
      reason: reason.trim(),
      adminActorId: actor.userId,
      adminActorName: actor.name,
      targetId: item.id,
    }),
  ]);
}

export async function declineInvestmentFunding({ investmentId, reason, actor }) {
  const investments = await dataService.list("investments", actor.adminId, true);
  const investment = investments.find((item) => item.id === investmentId);
  if (!investment) return;

  const declinedAt = now();

  // 1. Update status back to awaiting_funding and record decline details
  await dataService.update("investments", investment.id, {
    status: "awaiting_funding",
    declinedAt,
    declinedBy: actor.userId,
    declineReason: reason,
  });

  // 2. Find any pending deposits for this investment and update them
  const deposits = await dataService.list("deposits", investment.adminId, true);
  const pendingDeposit = deposits.find((d) => d.investmentId === investment.id && d.status === "pending");
  if (pendingDeposit) {
    await rejectInvestmentDeposit(pendingDeposit);
    await dataService.update("deposits", pendingDeposit.id, {
      status: "declined",
      reviewedAt: declinedAt,
      declineReason: reason,
      declinedAt,
      declinedBy: actor.userId,
    });
  }

  // 3. Create user-visible transaction: Investment Funding Declined
  await dataService.log({
    userId: investment.userId,
    adminId: investment.adminId,
    type: "investment_funding_declined",
    label: "Investment Funding Declined",
    amount: Number(pendingDeposit?.amount || 0),
    status: "declined",
    reason: reason,
    visibility: "user",
    createdAt: declinedAt,
  });

  // 4. Send notification with reason
  await createNotification({
    userId: investment.userId,
    adminId: investment.adminId,
    type: "investment",
    title: "Investment Funding Declined",
    message: `Your funding request for ${investment.planName} was declined. Reason: ${reason}`,
  });
}

export async function approveInvestmentFunding({ investmentId, actor }) {
  const deposits = await dataService.list("deposits", actor.adminId, true);
  const pendingDeposit = deposits.find((d) => d.investmentId === investmentId && d.status === "pending");
  if (pendingDeposit) {
    await reviewFinancialRequest({
      collection: "deposits",
      item: pendingDeposit,
      status: "approved",
      actor
    });
  } else {
    // fallback if no pending deposit
    const investments = await dataService.list("investments", actor.adminId, true);
    const investment = investments.find((item) => item.id === investmentId);
    if (investment) {
      await approveInvestmentDeposit({
        id: `manual-approve-${Date.now()}`,
        investmentId: investment.id,
        adminId: investment.adminId,
        userId: investment.userId,
        amount: investment.type === "flash" ? investment.capital : investment.weeklyCapital,
        createdAt: now(),
      });
    }
  }
}
