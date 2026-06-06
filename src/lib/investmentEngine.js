import { dataService } from "./dataService";

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
  const created = await dataService.create("investments", {
    userId: user.userId, userName: user.name, adminId: user.adminId, type,
    assetId: asset.id, assetName: asset.name, ticker: asset.ticker,
    planName: `${asset.name} ${durationMonths}-Month Plan`,
    weeklyCapital: Number(tier.weeklyCapital), projectedReturn: values.projectedReturn,
    durationMonths: Number(durationMonths), totalWeeks: values.weeks, completedWeeks: 0,
    status: "pending", pausedDays: 0, referralBonusPaid: false, timeline: [],
    referencePrice: asset.referencePrice || 0,
  });
  return created;
}

export async function createFlashInvestment({ user, settings, tier }) {
  return dataService.create("investments", {
    userId: user.userId, userName: user.name, adminId: user.adminId, type: "flash",
    assetId: tier.id, assetName: settings.name, ticker: "FLASH", planName: settings.name,
    capital: Number(tier.capital), projectedReturn: Number(tier.returnAmount),
    durationHours: Number(settings.durationHours), completedWeeks: 0, totalWeeks: 1,
    status: "pending", timeline: [],
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
  const amount = referralBonusFor(investment.weeklyCapital);
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

  if (investment.type === "flash") {
    const maturityAt = addHours(approvedAt, investment.durationHours);
    await dataService.update("investments", investment.id, {
      status: "flash active", startedAt: approvedAt, maturityAt,
      timeline: [{ week: 1, status: "approved", amount: deposit.amount, depositId: deposit.id, submittedAt: deposit.createdAt, approvedAt }],
    });
    await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: "flash_activated", label: `${investment.planName} activated`, amount: deposit.amount, status: "active" });
    await notify(investment, "investment", "Flash investment activated", `Your ${investment.planName} countdown has started.`);
    return;
  }

  const week = Number(deposit.week || investment.completedWeeks + 1);
  const timeline = [...(investment.timeline || []).filter((item) => item.week !== week), {
    week, status: "approved", amount: deposit.amount, depositId: deposit.id,
    submittedAt: deposit.createdAt, approvedAt,
  }].sort((a, b) => a.week - b.week);
  const completedWeeks = Math.max(investment.completedWeeks || 0, week);
  const firstApproval = completedWeeks === 1;
  const resumed = investment.status === "paused";
  const updates = { timeline, completedWeeks, status: "active" };
  if (firstApproval) {
    updates.startedAt = approvedAt;
    updates.maturityAt = addDays(approvedAt, investment.totalWeeks * 7);
    updates.referralBonusPaid = await payReferralBonus(investment);
  }
  if (resumed && investment.pausedAt) {
    const pausedDays = Math.max(1, Math.ceil((Date.now() - new Date(investment.pausedAt).getTime()) / DAY));
    updates.pausedDays = Number(investment.pausedDays || 0) + pausedDays;
    updates.maturityAt = addDays(investment.maturityAt, pausedDays);
    updates.pausedAt = null;
  }
  updates.nextDueAt = addDays(approvedAt, 7);

  if (completedWeeks >= investment.totalWeeks) {
    const user = await dataService.getUser(investment.userId);
    updates.status = "completed"; updates.completedAt = approvedAt; updates.nextDueAt = null;
    await dataService.updateUser(user.userId, { availableBalance: Number(user.availableBalance || 0) + Number(investment.projectedReturn) });
    await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: "investment_matured", label: `${investment.planName} matured`, amount: investment.projectedReturn, status: "completed" });
    await notify(investment, "investment", "Investment matured", `${investment.projectedReturn} USD was credited to your available balance.`);
  } else {
    await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: firstApproval ? "investment_activated" : resumed ? "investment_resumed" : "weekly_deposit_approved", label: firstApproval ? `${investment.planName} activated` : `Week ${week} approved`, amount: deposit.amount, status: "approved" });
    if (firstApproval) await notify(investment, "investment", investment.type === "stock" ? "Shares purchased successfully" : "Investment activated", `${investment.planName} is now active.`);
  }
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
  await notify(investment, "deposit", "Deposit rejected", `Your Week ${week} deposit requires resubmission.`);
}

export async function processInvestmentTimers(userId) {
  const investments = await dataService.listForUser("investments", userId);
  const now = Date.now();
  for (const investment of investments) {
    if (investment.status === "flash active" && new Date(investment.maturityAt).getTime() <= now) {
      const user = await dataService.getUser(userId);
      await dataService.updateUser(userId, { availableBalance: Number(user.availableBalance || 0) + Number(investment.projectedReturn) });
      await dataService.update("investments", investment.id, { status: "flash done", completedAt: new Date().toISOString() });
      await dataService.log({ userId, adminId: investment.adminId, type: "flash_matured", label: `${investment.planName} matured`, amount: investment.projectedReturn, status: "completed" });
      await notify(investment, "investment", "Flash investment matured", `${investment.projectedReturn} USD was credited.`);
    } else if (investment.status === "active" && investment.nextDueAt && new Date(investment.nextDueAt).getTime() <= now && investment.reminderSentWeek !== investment.completedWeeks + 1) {
      await dataService.update("investments", investment.id, { reminderSentWeek: investment.completedWeeks + 1 });
      await notify(investment, "deposit", `Week ${investment.completedWeeks + 1} deposit due`, `${investment.weeklyCapital} USD is now due for ${investment.planName}.`);
    }
    if (investment.status === "active" && investment.nextDueAt && new Date(investment.nextDueAt).getTime() + DAY < now) {
      await dataService.update("investments", investment.id, { status: "paused", pausedAt: new Date().toISOString() });
      await dataService.log({ userId, adminId: investment.adminId, type: "investment_paused", label: `${investment.planName} paused after missed deposit`, amount: 0, status: "paused" });
      await notify(investment, "investment", "Investment paused", "Submit the overdue weekly deposit to resume this plan.");
    }
  }
  return dataService.listForUser("investments", userId);
}
