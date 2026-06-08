import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  calculateLiveLockedBalance,
  calculateTotalLockedBalance,
  calculateTotalPortfolio,
} from "../src/lib/lockedBalance.js";

const HOUR = 3600;
const WEEK = 7 * 24 * HOUR;
const startedAt = "2026-01-01T00:00:00.000Z";
const at = (seconds) => new Date(new Date(startedAt).getTime() + seconds * 1000).getTime();

function flash(overrides = {}) {
  return {
    type: "flash",
    status: "flash active",
    projectedReturn: 7000,
    durationSeconds: 24 * HOUR,
    activeElapsedSeconds: 0,
    lockedEarned: 0,
    lastActivatedAt: startedAt,
    ...overrides,
  };
}

function weekly(overrides = {}) {
  return {
    type: "crypto",
    status: "active",
    projectedReturn: 148000,
    durationSeconds: 13 * WEEK,
    activeElapsedSeconds: 0,
    lockedEarned: 0,
    lastActivatedAt: startedAt,
    ...overrides,
  };
}

describe("live locked balance", () => {
  test("flash investment after 1 hour", () => {
    const result = calculateLiveLockedBalance(flash(), at(HOUR));
    assert.equal(Math.round(result.lockedEarned), 292);
    assert.equal(Math.round(result.progressPercent * 10) / 10, 4.2);
  });

  test("flash investment after 12 hours", () => {
    assert.equal(calculateLiveLockedBalance(flash(), at(12 * HOUR)).lockedEarned, 3500);
  });

  test("flash maturity never exceeds projected return", () => {
    const result = calculateLiveLockedBalance(flash(), at(30 * HOUR));
    assert.equal(result.lockedEarned, 7000);
    assert.equal(result.remainingSeconds, 0);
    assert.equal(result.isMatured, true);
  });

  test("weekly plan after one week", () => {
    const result = calculateLiveLockedBalance(weekly(), at(WEEK));
    assert.equal(Math.round(result.lockedEarned), Math.round(148000 / 13));
  });

  test("paused investment remains frozen", () => {
    const investment = weekly({
      status: "paused",
      activeElapsedSeconds: WEEK,
      lockedEarned: 148000 / 13,
      lastActivatedAt: null,
      pausedAt: new Date(at(WEEK)).toISOString(),
    });
    assert.equal(
      calculateLiveLockedBalance(investment, at(3 * WEEK)).lockedEarned,
      calculateLiveLockedBalance(investment, at(8 * WEEK)).lockedEarned,
    );
  });

  test("resumed investment continues from stored progress", () => {
    const investment = weekly({
      activeElapsedSeconds: WEEK,
      lockedEarned: 148000 / 13,
      lastActivatedAt: new Date(at(2 * WEEK)).toISOString(),
    });
    const result = calculateLiveLockedBalance(investment, at(3 * WEEK));
    assert.equal(Math.round(result.activeElapsedSeconds), 2 * WEEK);
  });

  test("weekly maturity reaches projected return", () => {
    const result = calculateLiveLockedBalance(weekly(), at(13 * WEEK));
    assert.equal(result.lockedEarned, 148000);
    assert.equal(result.isMatured, true);
  });

  test("weekly earnings freeze one day after a missed payment", () => {
    const cutoff = at(WEEK + 24 * HOUR);
    const investment = weekly({
      nextDueAt: new Date(at(WEEK)).toISOString(),
    });
    const frozen = calculateLiveLockedBalance(investment, at(3 * WEEK));
    const atCutoff = calculateLiveLockedBalance(investment, cutoff);
    assert.equal(frozen.isPaymentOverdue, true);
    assert.equal(frozen.activeElapsedSeconds, atCutoff.activeElapsedSeconds);
    assert.equal(frozen.lockedEarned, atCutoff.lockedEarned);
  });

  test("multiple simultaneous investments aggregate", () => {
    const total = calculateTotalLockedBalance([
      flash({ projectedReturn: 5000 }),
      flash({ projectedReturn: 2400 }),
      weekly(),
    ], at(12 * HOUR));
    assert.ok(total > 3700);
  });

  test("completed investments contribute zero", () => {
    assert.equal(calculateTotalLockedBalance([
      flash({ status: "flash done" }),
      weekly({ status: "completed" }),
    ], at(13 * WEEK)), 0);
  });

  test("total portfolio includes available, referral, and live locked balances", () => {
    const investments = [flash()];
    assert.equal(calculateTotalPortfolio({
      availableBalance: 1000,
      referralBalance: 500,
    }, investments, at(12 * HOUR)), 5000);
  });
});
