import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "stonehaven-security-test";
const MFA = { firebase: { sign_in_second_factor: "totp" } };
let environment;

const profile = (userId, overrides = {}) => ({
  userId,
  name: `User ${userId}`,
  email: `${userId}@example.test`,
  phone: "+10000000000",
  country: "United States",
  role: "user",
  adminId: "ADMIN-A",
  referralCode: `REF-${userId}`,
  referredBy: "",
  availableBalance: 0,
  referralBalance: 0,
  lockedBalance: 0,
  kycStatus: "unverified",
  status: "active",
  onboarded: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  lastLogin: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  await environment.cleanup();
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "user-a"), profile("user-a")),
      setDoc(doc(db, "users", "user-b"), profile("user-b", { adminId: "ADMIN-B" })),
      setDoc(doc(db, "users", "suspended"), profile("suspended", { status: "suspended" })),
      setDoc(doc(db, "accountControls", "suspended-recovery"), {
        uid: "suspended-recovery",
        status: "suspended",
      }),
      setDoc(doc(db, "accountControls", "deleted-recovery"), {
        uid: "deleted-recovery",
        status: "deleted",
      }),
      setDoc(doc(db, "accountControls", "blocked-recovery"), {
        uid: "blocked-recovery",
        status: "blocked",
      }),
      setDoc(doc(db, "users", "admin-a"), profile("admin-a", {
        role: "sub-admin",
        adminId: "ADMIN-A",
        kycStatus: "verified",
      })),
      setDoc(doc(db, "users", "admin-b"), profile("admin-b", {
        role: "sub-admin",
        adminId: "ADMIN-B",
        kycStatus: "verified",
      })),
      setDoc(doc(db, "users", "super"), profile("super", {
        role: "superadmin",
        adminId: "GLOBAL",
        kycStatus: "verified",
      })),
      setDoc(doc(db, "deposits", "deposit-a"), {
        userId: "user-a",
        adminId: "ADMIN-A",
        amount: 200,
        status: "pending",
      }),
      setDoc(doc(db, "deposits", "deposit-b"), {
        userId: "user-b",
        adminId: "ADMIN-B",
        amount: 300,
        status: "pending",
      }),
      setDoc(doc(db, "transactions", "transaction-a"), {
        userId: "user-a",
        adminId: "ADMIN-A",
        type: "deposit",
        label: "Deposit submitted",
        amount: 200,
        status: "pending",
        depositId: "deposit-a",
        sourceId: "deposit-a",
        createdAt: "2026-06-09T10:00:00.000Z",
      }),
    ]);
  });
});

describe("profile authority", () => {
  test("authenticated legacy user can create only a safe default profile", async () => {
    const db = environment.authenticatedContext("legacy-user", {
      email: "legacy@example.test",
      role: "user",
      adminId: "HERITAGE-HQ",
    }).firestore();
    await assertSucceeds(setDoc(doc(db, "users", "legacy-user"), profile("legacy-user", {
      email: "legacy@example.test",
      adminId: "HERITAGE-HQ",
      phone: "",
      country: "",
      onboarded: false,
    })));
  });

  test("administrator claims do not change the safe recovery profile contract", async () => {
    const db = environment.authenticatedContext("claimed-admin", {
      email: "claimed-admin@example.test",
      role: "superadmin",
      adminId: "GLOBAL",
      ...MFA,
    }).firestore();
    await assertSucceeds(setDoc(doc(db, "users", "claimed-admin"), profile("claimed-admin", {
      email: "claimed-admin@example.test",
      adminId: "HERITAGE-HQ",
      phone: "",
      country: "",
      onboarded: false,
    })));
    const privilegedDb = environment.authenticatedContext("claimed-admin-privileged", {
      email: "claimed-admin-privileged@example.test",
      role: "superadmin",
      adminId: "GLOBAL",
      ...MFA,
    }).firestore();
    await assertFails(setDoc(doc(privilegedDb, "users", "claimed-admin-privileged"), profile(
      "claimed-admin-privileged", {
        email: "claimed-admin-privileged@example.test",
        role: "superadmin",
        adminId: "GLOBAL",
        phone: "",
        country: "",
        onboarded: false,
      },
    )));
  });

  test("suspended, deleted, and blocked lifecycle records deny recovery", async () => {
    for (const userId of ["suspended-recovery", "deleted-recovery", "blocked-recovery"]) {
      const db = environment.authenticatedContext(userId, {
        email: `${userId}@example.test`,
        role: "user",
      }).firestore();
      await assertFails(setDoc(doc(db, "users", userId), profile(userId, {
        phone: "",
        country: "",
        adminId: "HERITAGE-HQ",
        onboarded: false,
      })));
    }
  });

  test("existing profile cannot be overwritten or deleted", async () => {
    const db = environment.authenticatedContext("user-a", {
      email: "user-a@example.test",
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertFails(setDoc(doc(db, "users", "user-a"), profile("user-a", {
      phone: "",
      country: "",
      adminId: "HERITAGE-HQ",
      onboarded: false,
    })));
    await assertFails(deleteDoc(doc(db, "users", "user-a")));
  });

  test("user can update approved profile fields and preferences", async () => {
    const db = environment.authenticatedContext("user-a", {
      email: "user-a@example.test",
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertSucceeds(updateDoc(doc(db, "users", "user-a"), {
      firstName: "Sarah",
      lastName: "Stone",
      name: "Sarah Stone",
      phone: "+1 202 555 0147",
      country: "United States",
      state: "New York",
      city: "New York",
      address: "10 Stonehaven Avenue",
      profilePhotoUrl: "https://example.test/profile.jpg",
      profileUpdatedAt: "2026-06-09T10:00:00.000Z",
      profileUpdatedBy: "user",
      profileUpdateNotice: "User updated profile information.",
      profileChanges: [{
        fieldChanged: "phone",
        oldValue: "+10000000000",
        newValue: "+1 202 555 0147",
        changedAt: "2026-06-09T10:00:00.000Z",
      }],
      notificationPreferences: { financial: true, support: false },
      supportPreferences: { emailReplies: true },
    }));
  });

  test("user profile updates cannot change protected account authority", async () => {
    const db = environment.authenticatedContext("user-a", {
      email: "user-a@example.test",
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    for (const changes of [
      { role: "superadmin" },
      { adminId: "GLOBAL" },
      { status: "suspended" },
      { availableBalance: 1000000 },
      { referralBalance: 1000000 },
      { lockedBalance: 1000000 },
      { kycStatus: "verified" },
      { email: "changed@example.test" },
    ]) {
      await assertFails(updateDoc(doc(db, "users", "user-a"), changes));
    }
  });

  test("clients cannot write account controls", async () => {
    const db = environment.authenticatedContext("user-a", {
      email: "user-a@example.test",
      role: "user",
    }).firestore();
    await assertFails(setDoc(doc(db, "accountControls", "user-a"), {
      uid: "user-a",
      status: "active",
    }));
    await assertFails(updateDoc(doc(db, "accountControls", "suspended-recovery"), {
      status: "active",
    }));
    await assertFails(deleteDoc(doc(db, "accountControls", "suspended-recovery")));
  });

  test("privileged and referral payout fields are rejected during recovery", async () => {
    const forbidden = [
      { availableBalance: 1 },
      { referralBalance: 1 },
      { lockedBalance: 1 },
      { kycStatus: "verified" },
      { status: "suspended" },
      { referralBonusPaid: true },
      { referralEarnings: 500 },
      { payoutEligible: true },
    ];
    for (const [index, changes] of forbidden.entries()) {
      const userId = `forbidden-${index}`;
      const db = environment.authenticatedContext(userId, {
        email: `${userId}@example.test`,
        role: "user",
      }).firestore();
      await assertFails(setDoc(doc(db, "users", userId), profile(userId, {
        phone: "",
        country: "",
        adminId: "HERITAGE-HQ",
        onboarded: false,
        ...changes,
      })));
    }
  });

  test("normal user cannot create a super-admin profile", async () => {
    const db = environment.authenticatedContext("attacker", {
      email: "attacker@example.test",
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertFails(setDoc(doc(db, "users", "attacker"), profile("attacker", {
      role: "superadmin",
      adminId: "GLOBAL",
      availableBalance: 999999,
      kycStatus: "verified",
    })));
  });

  test("user cannot edit role, scope, status, KYC, or balances", async () => {
    const db = environment.authenticatedContext("user-a", {
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    for (const changes of [
      { role: "superadmin" },
      { adminId: "ADMIN-B" },
      { status: "suspended" },
      { kycStatus: "verified" },
      { availableBalance: 5000 },
      { referralBalance: 5000 },
      { lockedBalance: 5000 },
    ]) {
      await assertFails(updateDoc(doc(db, "users", "user-a"), changes));
    }
    await assertSucceeds(updateDoc(doc(db, "users", "user-a"), { name: "Updated Name" }));
  });
});

describe("financial creation", () => {
  test("administrator can review an existing request transaction without replacing it", async () => {
    const db = environment.authenticatedContext("admin-a", {
      role: "sub-admin",
      adminId: "ADMIN-A",
    }).firestore();
    await assertSucceeds(updateDoc(doc(db, "transactions", "transaction-a"), {
      label: "Deposit",
      status: "declined",
      reviewedAt: "2026-06-09T11:00:00.000Z",
      declinedAt: "2026-06-09T11:00:00.000Z",
      declinedBy: "admin-a",
      declineReason: "Insufficient payment proof",
    }));
  });

  test("normal user cannot approve or decline their own request transaction", async () => {
    const db = environment.authenticatedContext("user-a", {
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertFails(updateDoc(doc(db, "transactions", "transaction-a"), {
      label: "Deposit",
      status: "approved",
      reviewedAt: "2026-06-09T11:00:00.000Z",
      approvedAt: "2026-06-09T11:00:00.000Z",
      approvedBy: "user-a",
    }));
  });

  test("administrator can create an internal manual balance adjustment record", async () => {
    const db = environment.authenticatedContext("admin-a", {
      role: "sub-admin",
      adminId: "ADMIN-A",
    }).firestore();
    await assertSucceeds(addDoc(collection(db, "transactions"), {
      userId: "user-a",
      adminId: "ADMIN-A",
      type: "manual_balance_adjustment",
      label: "Available balance added",
      direction: "credit",
      amount: 50,
      balanceType: "available",
      reason: "Account reconciliation",
      status: "completed",
      createdAt: "2026-06-09T10:00:00.000Z",
      createdBy: "admin-a",
      createdByRole: "sub-admin",
      adminActorId: "admin-a",
      adminActorName: "User admin-a",
      beforeBalance: 0,
      afterBalance: 50,
      visibility: "admin_only",
    }));
  });

  test("normal user cannot create an internal manual balance adjustment record", async () => {
    const db = environment.authenticatedContext("user-a", {
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertFails(addDoc(collection(db, "transactions"), {
      userId: "user-a",
      adminId: "ADMIN-A",
      type: "manual_balance_adjustment",
      label: "Available balance added",
      direction: "credit",
      amount: 50,
      balanceType: "available",
      reason: "Unauthorized adjustment",
      status: "pending",
      createdAt: "2026-06-09T10:00:00.000Z",
      createdBy: "user-a",
      createdByRole: "user",
      visibility: "admin_only",
    }));
  });

  test("normal user cannot create financial or audit records directly", async () => {
    const db = environment.authenticatedContext("user-a", {
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    for (const name of [
      "deposits", "withdrawals", "investments", "transactions", "referrals",
      "maturityRecords", "kycSubmissions",
    ]) {
      await assertFails(addDoc(collection(db, name), {
        userId: "user-a",
        adminId: "ADMIN-A",
        amount: 1000,
        status: "approved",
      }));
    }
  });
});

describe("isolation and administrator claims", () => {
  test("user cannot read another user's financial record", async () => {
    const db = environment.authenticatedContext("user-a", {
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertFails(getDoc(doc(db, "deposits", "deposit-b")));
    await assertFails(getDoc(doc(db, "users", "user-b")));
    await assertSucceeds(getDoc(doc(db, "deposits", "deposit-a")));
  });

  test("sub-admin cannot access another administrative scope", async () => {
    const db = environment.authenticatedContext("admin-a", {
      role: "sub-admin",
      adminId: "ADMIN-A",
      ...MFA,
    }).firestore();
    await assertSucceeds(getDoc(doc(db, "users", "user-a")));
    await assertFails(getDoc(doc(db, "users", "user-b")));
    await assertFails(getDoc(doc(db, "deposits", "deposit-b")));
  });

  test("super-admin with MFA can read permitted data across scopes", async () => {
    const db = environment.authenticatedContext("super", {
      role: "superadmin",
      adminId: "GLOBAL",
      ...MFA,
    }).firestore();
    await assertSucceeds(getDoc(doc(db, "users", "user-a")));
    await assertSucceeds(getDoc(doc(db, "users", "user-b")));
    await assertSucceeds(getDoc(doc(db, "deposits", "deposit-b")));
  });

  test("administrator claims without MFA grant administrative access", async () => {
    const db = environment.authenticatedContext("admin-a", {
      role: "sub-admin",
      adminId: "ADMIN-A",
    }).firestore();
    await assertSucceeds(getDoc(doc(db, "users", "user-a")));
  });
});

describe("suspended accounts", () => {
  test("suspended users cannot perform protected actions", async () => {
    const db = environment.authenticatedContext("suspended", {
      role: "user",
      adminId: "ADMIN-A",
    }).firestore();
    await assertFails(getDoc(doc(db, "deposits", "deposit-a")));
    await assertFails(addDoc(collection(db, "supportTickets"), {
      ticketId: "TKT-1",
      userId: "suspended",
      userName: "Suspended User",
      adminId: "ADMIN-A",
      subject: "Help",
      category: "Account",
      status: "open",
      messages: [],
      adminUnread: true,
      userUnread: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    }));
  });
});
