const SECOND = 1000;
const DAY_SECONDS = 24 * 60 * 60;
const DAY_MS = DAY_SECONDS * SECOND;
const WEEK_SECONDS = 7 * DAY_SECONDS;
const ACTIVE_STATUSES = new Set(["active", "flash active"]);
const LOCKED_STATUSES = new Set(["active", "flash active", "paused", "frozen"]);
const COMPLETED_STATUSES = new Set(["completed", "flash done", "deleted", "cancelled"]);

function secondsBetween(start, end) {
  const startTime = new Date(start || 0).getTime();
  const endTime = new Date(end || 0).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.max(0, (endTime - startTime) / SECOND);
}

export function investmentDurationSeconds(investment) {
  const stored = Number(investment.durationSeconds || 0);
  if (stored > 0) return stored;
  if (investment.type === "flash") return Number(investment.durationHours || 0) * 60 * 60;
  return Number(investment.totalWeeks || 0) * WEEK_SECONDS;
}

function legacyElapsedSeconds(investment, now) {
  if (!investment.startedAt) return 0;
  const effectiveEnd = ACTIVE_STATUSES.has(investment.status)
    ? now
    : investment.pausedAt || investment.lastLockedCalculationAt || now;
  return Math.max(
    0,
    secondsBetween(investment.startedAt, effectiveEnd) - Number(investment.totalPausedSeconds || 0),
  );
}

export function calculateLiveLockedBalance(investment, now = Date.now()) {
  const durationSeconds = investmentDurationSeconds(investment);
  const projectedReturn = Math.max(0, Number(investment.projectedReturn || investment.expectedReturn || 0));
  if (!durationSeconds || !LOCKED_STATUSES.has(investment.status) || COMPLETED_STATUSES.has(investment.status)) {
    return {
      lockedEarned: 0,
      progressPercent: COMPLETED_STATUSES.has(investment.status) ? 100 : 0,
      activeElapsedSeconds: 0,
      remainingSeconds: durationSeconds,
      isMatured: COMPLETED_STATUSES.has(investment.status),
      isPaymentOverdue: false,
    };
  }

  const hasStoredElapsed = Object.hasOwn(investment, "activeElapsedSeconds");
  const storedElapsed = Number(investment.activeElapsedSeconds || 0);
  const paymentPauseAt =
    investment.type !== "flash" && investment.nextDueAt
      ? new Date(investment.nextDueAt).getTime() + DAY_MS
      : 0;
  const isPaymentOverdue =
    ACTIVE_STATUSES.has(investment.status) &&
    Number.isFinite(paymentPauseAt) &&
    paymentPauseAt > 0 &&
    new Date(now).getTime() > paymentPauseAt;
  const effectiveNow = isPaymentOverdue ? paymentPauseAt : now;
  const baseElapsed = hasStoredElapsed
    ? storedElapsed
    : legacyElapsedSeconds(investment, effectiveNow);
  const currentSegment = ACTIVE_STATUSES.has(investment.status) && investment.lastActivatedAt
    ? secondsBetween(investment.lastActivatedAt, effectiveNow)
    : 0;
  const activeElapsedSeconds = Math.min(durationSeconds, Math.max(0, baseElapsed + currentSegment));
  const calculatedLocked = projectedReturn * (activeElapsedSeconds / durationSeconds);
  const lockedEarned = Math.min(
    projectedReturn,
    Math.max(Number(investment.lockedEarned || 0), calculatedLocked),
  );
  const isMatured = activeElapsedSeconds >= durationSeconds;

  return {
    lockedEarned,
    progressPercent: Math.min(100, (activeElapsedSeconds / durationSeconds) * 100),
    activeElapsedSeconds,
    remainingSeconds: Math.max(0, durationSeconds - activeElapsedSeconds),
    isMatured,
    isPaymentOverdue,
  };
}

export function calculateTotalLockedBalance(investments, now = Date.now()) {
  return investments.reduce(
    (total, investment) => total + calculateLiveLockedBalance(investment, now).lockedEarned,
    0,
  );
}

export function calculateTotalPortfolio({ availableBalance = 0, referralBalance = 0 }, investments, now = Date.now()) {
  return Number(availableBalance || 0)
    + Number(referralBalance || 0)
    + calculateTotalLockedBalance(investments, now);
}

export function formatInvestmentTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const days = Math.floor(seconds / DAY_SECONDS);
  const hours = Math.floor((seconds % DAY_SECONDS) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${remainder}s`;
}

export function snapshotInvestmentProgress(investment, now = Date.now()) {
  const metrics = calculateLiveLockedBalance(investment, now);
  return {
    activeElapsedSeconds: metrics.activeElapsedSeconds,
    lockedEarned: metrics.lockedEarned,
    lastLockedCalculationAt: new Date(now).toISOString(),
  };
}
