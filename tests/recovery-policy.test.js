import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assertRecoveryAllowed,
  buildRecoveredUserProfile,
} from "../functions/src/recoveryPolicy.js";

describe("missing-profile recovery policy", () => {
  test("always builds a normal user profile regardless of caller claims", () => {
    const timestamp = "server-time";
    const profile = buildRecoveredUserProfile({
      uid: "admin-claimed-uid",
      email: "ADMIN@example.test",
      name: "Claimed Admin",
      timestamp,
      role: "superadmin",
      adminId: "GLOBAL",
    });
    assert.deepEqual({
      role: profile.role,
      adminId: profile.adminId,
      availableBalance: profile.availableBalance,
      referralBalance: profile.referralBalance,
      lockedBalance: profile.lockedBalance,
      kycStatus: profile.kycStatus,
      status: profile.status,
    }, {
      role: "user",
      adminId: "HERITAGE-HQ",
      availableBalance: 0,
      referralBalance: 0,
      lockedBalance: 0,
      kycStatus: "unverified",
      status: "active",
    });
    assert.equal(profile.email, "admin@example.test");
  });

  test("allows absent or active lifecycle controls", () => {
    assert.doesNotThrow(() => assertRecoveryAllowed(null));
    assert.doesNotThrow(() => assertRecoveryAllowed({ status: "active" }));
  });

  test("denies suspended, deleted, and blocked lifecycle controls", () => {
    for (const status of ["suspended", "deleted", "blocked"]) {
      assert.throws(
        () => assertRecoveryAllowed({ status }),
        (error) => error.code === "permission-denied" && error.message.includes(status),
      );
    }
  });
});
