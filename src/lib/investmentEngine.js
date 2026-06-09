import { dataService } from "./dataService";
import { getPlatformSettings } from "./enterprise";
import { createInvestmentIntent } from "./securityApi";
import { firebaseEnabled } from "./firebase";
import {
  calculateLiveLockedBalance,
  investmentDurationSeconds,
  snapshotInvestmentProgress,
} from "./lockedBalance";

const DAY = 24 * 60 * 60 * 1000;
export const referralBonusFor = (capital) => ({ 200: 20, 300: 30, 400: 40, 500: 50, 600: 60, 700: 70, 800: 80, 1000: 100 }[capital] || 0);
export const weeksForDuration = (months) => Number(months) === 2 ? 8 : 13;
export const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY).toISOString();
export const addHours = (date, hours) => new Date(new Date(date).getTime() + hours * 60 * 60 * 1000).toISOString();

export function calculatePlan(tier, durationMonths) {
  const weeks = weeksForDuration(durationMonths);
  const projectedReturn = Number(durationMonths) === 2 ? Number(tier.return2Months) : Number(tier.return3Months);
  const totalCapital = Number(tier.weeklyCapital) * weeks;
  const netProfit = projectedReturn - totalCapital;
  return { weeks, projectedReturn, totalCapital, netProfit, roi: totalCapital ? (netProfit / totalCapital) * 100 : 0 };
}

export async function createWeeklyInvestment({ user, asset, tier, durationMonths, type }) {
  const values = calculatePlan(tier, durationMonths);
  const localRecord = {
    userId: user.userId, userName: user.name, adminId: user.adminId, type,
    planId: asset.id, investmentType: type, duration: `${durationMonths} months`,
    expectedMaturityDate: addDays(new Date(), values.weeks * 7),
    assetId: asset.id, assetName: asset.name, ticker: asset.ticker,
    planName: `${asset.name} ${durationMonths}-Month Plan`,
    weeklyCapital: Number(tier.weeklyCapital), projectedReturn: values.projectedReturn,
    durationMonths: Number(durationMonths), totalWeeks: values.weeks, completedWeeks: 0,
    capital: values.totalCapital, roi: values.roi, expectedProfit: values.netProfit,
    expectedReturn: values.projectedReturn, fundingSource: "", status: "awaiting_funding",
    pausedDays: 0, referralBonusPaid: false, timeline: [],
    referencePrice: asset.referencePrice || 0,
    capitalAmount: 0, durationSeconds: values.weeks * 7 * 24 * 60 * 60,
    activeElapsedSeconds: 0, lockedEarned: 0, lastActivatedAt: null,
    totalPausedSeconds: 0, lastLockedCalculationAt: null, currentWeek: 0,
  };
  return createInvestmentIntent({
    type,
    assetId: asset.id,
    weeklyCapital: Number(tier.weeklyCapital),
    durationMonths: Number(durationMonths),
    localRecord,
  });
}

export async function createFlashInvestment({ user, settings, tier }) {
  const localRecord = {
    userId: user.userId, userName: user.name, adminId: user.adminId, type: "flash",
    planId: tier.id, investmentType: "flash", duration: `${settings.durationHours} hours`,
    expectedMaturityDate: addHours(new Date(), settings.durationHours),
    assetId: tier.id, assetName: settings.name, ticker: "FLASH", planName: settings.name,
    capital: Number(tier.capital), projectedReturn: Number(tier.returnAmount),
    durationHours: Number(settings.durationHours), completedWeeks: 0, totalWeeks: 1,
    roi: Number(tier.capital) ? ((Number(tier.returnAmount) - Number(tier.capital)) / Number(tier.capital)) * 100 : 0,
    expectedProfit: Number(tier.returnAmount) - Number(tier.capital),
    expectedReturn: Number(tier.returnAmount), fundingSource: "", status: "awaiting_funding", timeline: [],
    capitalAmount: 0, durationSeconds: Number(settings.durationHours) * 60 * 60,
    activeElapsedSeconds: 0, lockedEarned: 0, lastActivatedAt: null,
    totalPausedSeconds: 0, lastLockedCalculationAt: null, currentWeek: 0,
  };
  return createInvestmentIntent({
    type: "flash",
    tierId: tier.id,
    settingsId: settings.id,
    localRecord,
  });
}

async function notify(investment, type, title, message) {
  await dataService.create("notifications", {
    userId: investment.userId, adminId: investment.adminId, type, title, message, read: false,
  });
}

async function payReferralBonus(investment) {
  if (investment.referralBonusPaid || investment.type === "flash") return false;
  const investor = await dataService.getUser(investment.userId);
  if (!investor?.referredBy) return false;
  const scopedUsers = await dataService.listUsers(investment.adminId);
  const referrer = scopedUsers.find((item) => item.referralCode === investor.referredBy);
  const settings = await getPlatformSettings();
  const amount = Number(settings.referralBonuses?.[investment.weeklyCapital] ?? referralBonusFor(investment.weeklyCapital));
  if (!referrer || !amount) return false;
  await dataService.updateUser(referrer.userId, { referralBalance: Number(referrer.referralBalance || 0) + amount });
  await dataService.log({ userId: referrer.userId, adminId: referrer.adminId, type: "referral_bonus_earned", label: `Referral bonus from ${investor.name}`, amount, status: "completed" });
  await notify({ ...investment, userId: referrer.userId }, "referral", "Referral bonus earned", `${investor.name} activated Week 1. ${amount} USD was credited.`);
  return true;
}

export async function approveInvestmentDeposit(deposit) {
  if (!deposit.investmentId) return;
  const investments = await dataService.list("investments", deposit.adminId, true);
  const investment = investments.find((item) => item.id === deposit.investmentId);
  if (!investment || ["completed", "deleted", "flash done"].includes(investment.status)) return;
  const approvedAt = new Date().toISOString();
  const user = await dataService.getUser(investment.userId);
  const requiredAmount = Number(investment.type === "flash" ? investment.capital : investment.weeklyCapital || 0);
  const submittedAmount = Number(deposit.amount || 0);
  const balanceContribution = Number(deposit.balanceContribution || 0);
  const fullyFromBalance = deposit.depositType === "balance";
  const fundingTotal = fullyFromBalance ? balanceContribution : submittedAmount + balanceContribution;
  if (requiredAmount <= 0 || fundingTotal !== requiredAmount) {
    throw new Error("This funding request does not match the investment's required capital.");
  }
  const fundedAmount = requiredAmount;
  if (balanceContribution > Number(user.availableBalance || 0)) {
    throw new Error("The user's available balance is no longer sufficient for this funding request.");
  }
  await dataService.updateUser(user.userId, {
    availableBalance: Number(user.availableBalance || 0) - balanceContribution,
  });

  if (investment.type === "flash") {
    const maturityAt = addHours(approvedAt, investment.durationHours);
    await dataService.update("investments", investment.id, {
      status: "flash active", startedAt: approvedAt, maturityAt,
      capitalAmount: Number(investment.capitalAmount || 0) + fundedAmount,
      durationSeconds: investmentDurationSeconds(investment),
      activeElapsedSeconds: 0, lockedEarned: 0, lastActivatedAt: approvedAt,
      totalPausedSeconds: 0, lastLockedCalculationAt: approvedAt, currentWeek: 1,
      timeline: [{ week: 1, status: "approved", amount: fundedAmount, depositId: deposit.id, submittedAt: deposit.createdAt, approvedAt }],
    });
    await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: "flash_activated", label: `${investment.planName} activated`, amount: fundedAmount, status: "active" });
    await notify(investment, "investment", "Flash investment activated", `Your ${investment.planName} countdown has started.`);
    return;
  }

  const week = Number(deposit.week || investment.completedWeeks + 1);
  const timeline = [...(investment.timeline || []).filter((item) => item.week !== week), {
    week, status: "approved", amount: fundedAmount, depositId: deposit.id,
    submittedAt: deposit.createdAt, approvedAt,
  }].sort((a, b) => a.week - b.week);
  const completedWeeks = Math.max(investment.completedWeeks || 0, week);
  const firstApproval = completedWeeks === 1;
  const approvedAtMs = new Date(approvedAt).getTime();
  const overduePauseAt =
    investment.status === "active" && investment.nextDueAt
      ? new Date(investment.nextDueAt).getTime() + DAY
      : 0;
  const effectivePausedAt = investment.pausedAt
    ? new Date(investment.pausedAt).getTime()
    : overduePauseAt > 0 && approvedAtMs > overduePauseAt
      ? overduePauseAt
      : 0;
  const resumed =
    ["paused", "frozen"].includes(investment.status) || effectivePausedAt > 0;
  const updates = {
    timeline,
    completedWeeks,
    currentWeek: completedWeeks,
    capitalAmount: Number(investment.capitalAmount || 0) + fundedAmount,
    durationSeconds: investmentDurationSeconds(investment),
    status: "active",
  };
  if (firstApproval) {
    updates.startedAt = approvedAt;
    updates.maturityAt = addDays(approvedAt, investment.totalWeeks * 7);
    updates.activeElapsedSeconds = 0;
    updates.lockedEarned = 0;
    updates.lastActivatedAt = approvedAt;
    updates.totalPausedSeconds = 0;
    updates.lastLockedCalculationAt = approvedAt;
    updates.referralBonusPaid = await payReferralBonus(investment);
  }
  if (resumed && effectivePausedAt) {
    const resumedAt = approvedAtMs;
    const pausedSeconds = Math.max(0, (resumedAt - effectivePausedAt) / 1000);
    const pausedDays = pausedSeconds / 86400;
    const progress = calculateLiveLockedBalance(investment, resumedAt);
    updates.pausedDays = Number(investment.pausedDays || 0) + pausedDays;
    updates.totalPausedSeconds = Number(investment.totalPausedSeconds || 0) + pausedSeconds;
    updates.activeElapsedSeconds = progress.activeElapsedSeconds;
    updates.lockedEarned = progress.lockedEarned;
    updates.lastActivatedAt = approvedAt;
    updates.lastLockedCalculationAt = approvedAt;
    updates.maturityAt = new Date(new Date(investment.maturityAt).getTime() + pausedSeconds * 1000).toISOString();
    updates.pausedAt = null;
  }
  updates.nextDueAt = addDays(approvedAt, 7);

  await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: firstApproval ? "investment_activated" : resumed ? "investment_resumed" : "weekly_deposit_approved", label: firstApproval ? `${investment.planName} activated` : `Week ${week} approved`, amount: fundedAmount, status: "approved" });
  if (firstApproval) await notify(investment, "investment", investment.type === "stock" ? "Shares purchased successfully" : "Investment activated", `${investment.planName} is now active.`);
  await dataService.update("investments", investment.id, updates);
}

export async function rejectInvestmentDeposit(deposit) {
  if (!deposit.investmentId) return;
  const investments = await dataService.list("investments", deposit.adminId, true);
  const investment = investments.find((item) => item.id === deposit.investmentId);
  if (!investment) return;
  const week = Number(deposit.week || investment.completedWeeks + 1);
  const timeline = [...(investment.timeline || []).filter((item) => item.week !== week), {
    week, status: "rejected", amount: deposit.amount, depositId: deposit.id, submittedAt: deposit.createdAt, reviewedAt: new Date().toISOString(),
  }].sort((a, b) => a.week - b.week);
  await dataService.update("investments", investment.id, { timeline });
}

export async function processInvestmentTimers(userId) {
  const investments = await dataService.listForUser("investments", userId);
  if (firebaseEnabled) return investments;
  await reconcileInvestmentTimers(investments);
  return dataService.listForUser("investments", userId);
}

async function matureInvestment(investment, now) {
  const latest = (await dataService.list("investments", investment.adminId, true))
    .find((item) => item.id === investment.id);
  if (!latest || ["completed", "flash done", "deleted", "cancelled"].includes(latest.status)) return false;
  const metrics = calculateLiveLockedBalance(latest, now);
  if (!metrics.isMatured) return false;
  const user = await dataService.getUser(latest.userId);
  const completedAt = new Date(now).toISOString();
  await dataService.updateUser(user.userId, {
    availableBalance: Number(user.availableBalance || 0) + Number(latest.projectedReturn || 0),
  });
  await dataService.update("investments", latest.id, {
    status: latest.type === "flash" ? "flash done" : "completed",
    completedAt,
    activeElapsedSeconds: investmentDurationSeconds(latest),
    lockedEarned: 0,
    lastActivatedAt: null,
    lastLockedCalculationAt: completedAt,
    nextDueAt: null,
  });
  await dataService.log({ userId: latest.userId, adminId: latest.adminId, type: "investment_matured", label: `${latest.planName} matured`, amount: latest.projectedReturn, status: "completed" });
  await notify(latest, "investment", "Investment matured", `${latest.projectedReturn} USD was credited to your available balance.`);
  return true;
}

export async function reconcileInvestmentTimers(investments) {
  const now = Date.now();
  for (const investment of investments) {
    const metrics = calculateLiveLockedBalance(investment, now);
    if (metrics.isMatured && ["active", "flash active"].includes(investment.status)) {
      await matureInvestment(investment, now);
      continue;
    }
    if (investment.status === "active" && investment.nextDueAt && new Date(investment.nextDueAt).getTime() <= now && investment.reminderSentWeek !== investment.completedWeeks + 1) {
      await dataService.update("investments", investment.id, { reminderSentWeek: investment.completedWeeks + 1 });
      await notify(investment, "deposit", `Week ${investment.completedWeeks + 1} deposit due`, `${investment.weeklyCapital} USD is now due for ${investment.planName}.`);
    }
    if (investment.status === "active" && investment.nextDueAt && new Date(investment.nextDueAt).getTime() + DAY < now) {
      const pausedAt = new Date(new Date(investment.nextDueAt).getTime() + DAY).toISOString();
      const snapshot = snapshotInvestmentProgress(investment, new Date(pausedAt).getTime());
      await dataService.update("investments", investment.id, {
        status: "paused",
        pausedAt,
        lastActivatedAt: null,
        ...snapshot,
      });
      await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: "investment_paused", label: `${investment.planName} paused after missed deposit`, amount: 0, status: "paused" });
      await notify(investment, "investment", "Investment paused", "Submit the overdue weekly deposit to resume this plan.");
    }
  }
}
