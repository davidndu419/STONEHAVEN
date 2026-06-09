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
    await rejectInvestmentDeposit(item);
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
