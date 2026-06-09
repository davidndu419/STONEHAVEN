import { dataService } from "./dataService";
import { httpsCallable } from "firebase/functions";
import { firebaseEnabled, functions } from "./firebase";
import { investmentDurationSeconds } from "./lockedBalance";

const callableEnabled = firebaseEnabled && import.meta.env.VITE_USE_CLOUD_FUNCTIONS === "true";

async function call(name, payload) {
  const result = await httpsCallable(functions, name)(payload);
  return result.data;
}

export async function createAdminInvitation(profile) {
  const invitation = {
    token: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: profile.email.toLowerCase(),
    adminId: profile.adminId || `ADM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    createdAt: new Date().toISOString()
  };
  if (firebaseEnabled) {
    await dataService.create("adminInvitations", invitation);
  }
  return invitation;
}

export async function setManagedUserStatus(userId, status) {
  return dataService.updateUser(userId, { status });
}

export async function softDeleteManagedUser(userId, reason) {
  return dataService.updateUser(userId, {
    status: "deleted",
    disabledAt: new Date().toISOString(),
    disabledBy: "local-demo",
    disabledReason: reason,
  });
}

export async function syncAdminProfileMetadata(userId) {
  return dataService.getUser(userId);
}

export async function submitKyc(payload) {
  const created = await dataService.create("kycSubmissions", payload);
  await dataService.updateUser(payload.userId, { kycStatus: "pending" });
  return created;
}

export async function reviewKyc(payload) {
  await dataService.update("kycSubmissions", payload.submissionId, {
    status: payload.status,
    rejectionReason: payload.rejectionReason || "",
    requestDetails: payload.requestDetails || "",
    reviewedAt: new Date().toISOString(),
  });
  await dataService.updateUser(payload.userId, {
    kycStatus: payload.status === "approved" ? "verified" : "rejected",
  });
  return { status: payload.status };
}

export async function createInvestmentIntent(payload) {
  if (callableEnabled) return call("createInvestmentIntent", payload);
  return dataService.create("investments", payload.localRecord);
}

export async function submitDepositIntent(payload) {
  if (callableEnabled) return call("submitDepositIntent", payload);
  const deposit = await dataService.create("deposits", payload.localRecord);
  await dataService.log({
    ...payload.transaction,
    type: "deposit",
    label: "Deposit submitted",
    depositId: deposit.id,
    sourceId: deposit.id,
  }).catch(() => {});
  if (payload.investmentId) {
    await dataService.update("investments", payload.investmentId, {
      fundingSource: "new_deposit",
      status: "pending",
    });
  }
  return deposit;
}

export async function requestWithdrawalIntent(payload) {
  if (callableEnabled) return call("requestWithdrawalIntent", payload);
  const withdrawal = await dataService.create("withdrawals", payload.localRecord);
  await dataService.log({
    ...payload.transaction,
    type: "withdrawal",
    label: "Withdrawal submitted",
    withdrawalId: withdrawal.id,
    sourceId: withdrawal.id,
    withdrawalType: payload.type === "referral" ? "referral" : "available",
  }).catch(() => {});
  return withdrawal;
}

export async function activateInvestmentFromBalance(payload) {
  if (callableEnabled) return call("activateInvestmentFromBalance", payload);
  if (firebaseEnabled) {
    const investment = (await dataService.listForUser("investments", payload.userId))
      .find((item) => item.id === payload.investmentId);
    const profile = await dataService.getUser(payload.userId);
    if (!investment || !profile) throw new Error("Investment intent was not found.");
    const amount = Number(investment.type === "flash" ? investment.capital : investment.weeklyCapital || 0);
    if (Number(profile.availableBalance || 0) < amount) throw new Error("Available balance is insufficient.");
    const reference = `SH-${profile.userId.slice(-6).toUpperCase()}-${investment.ticker || "PLAN"}-BAL`;
    const deposit = await dataService.create("deposits", {
      userId: profile.userId,
      userName: profile.name,
      adminId: profile.adminId,
      methodId: "available-balance",
      methodName: "Available Balance",
      amount,
      balanceContribution: amount,
      totalRequired: amount,
      reference,
      transactionHash: reference,
      proofUrl: "",
      status: "pending",
      investmentId: investment.id,
      week: Number(investment.completedWeeks || 0) + 1,
      depositType: "balance",
    });
    await dataService.log({
      userId: profile.userId,
      adminId: profile.adminId,
      type: "balance_funding_submitted",
      label: `${investment.planName} balance funding submitted`,
      amount,
      status: "pending",
    }).catch(() => {});
    await dataService.update("investments", investment.id, {
      fundingSource: "available_balance",
      status: "pending",
    });
    return { depositId: deposit.id, investmentId: investment.id, status: "pending" };
  }
  const investment = (await dataService.listForUser("investments", payload.userId))
    .find((item) => item.id === payload.investmentId);
  const profile = await dataService.getUser(payload.userId);
  if (!investment || !profile) throw new Error("Investment intent was not found.");
  const amount = Number(investment.type === "flash" ? investment.capital : investment.weeklyCapital || 0);
  if (Number(profile.availableBalance || 0) < amount) throw new Error("Available balance is insufficient.");
  const activatedAt = new Date().toISOString();
  const maturityAt = investment.type === "flash"
    ? new Date(Date.now() + Number(investment.durationHours) * 3600000).toISOString()
    : new Date(Date.now() + Number(investment.totalWeeks) * 7 * 86400000).toISOString();
  await dataService.updateUser(profile.userId, {
    availableBalance: Number(profile.availableBalance) - amount,
  });
  await dataService.update("investments", investment.id, {
    fundingSource: "available_balance",
    status: investment.type === "flash" ? "flash active" : "active",
    completedWeeks: 1,
    currentWeek: 1,
    capitalAmount: amount,
    durationSeconds: investmentDurationSeconds(investment),
    activeElapsedSeconds: 0,
    lockedEarned: 0,
    startedAt: activatedAt,
    lastActivatedAt: activatedAt,
    totalPausedSeconds: 0,
    lastLockedCalculationAt: activatedAt,
    maturityAt,
    nextDueAt: investment.type === "flash" ? null : new Date(Date.now() + 7 * 86400000).toISOString(),
    timeline: [{ week: 1, status: "approved", amount, approvedAt: activatedAt, fundingSource: "available_balance" }],
  });
  await dataService.log({
    userId: profile.userId,
    adminId: profile.adminId,
    type: "investment_activated",
    label: `${investment.planName} activated from available balance`,
    amount,
    status: "active",
  });
  return { investmentId: investment.id, status: "active" };
}

export async function cancelInvestmentIntent({ investmentId, userId }) {
  const investment = (await dataService.listForUser("investments", userId))
    .find((item) => item.id === investmentId);
  if (!investment) throw new Error("Investment intent was not found.");
  if (investment.status !== "awaiting_funding") {
    throw new Error("Only investments awaiting funding can be closed.");
  }
  const deposits = await dataService.listForUser("deposits", userId);
  if (deposits.some((item) => item.investmentId === investmentId && item.status === "pending")) {
    throw new Error("This investment already has a funding request awaiting administrator review.");
  }
  await dataService.update("investments", investmentId, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  });
  return { investmentId, status: "cancelled" };
}
