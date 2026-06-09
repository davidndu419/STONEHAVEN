import { createHash, randomBytes } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { assertRecoveryAllowed, buildRecoveredUserProfile } from "./recoveryPolicy.js";

initializeApp();

const db = getFirestore();
const auth = getAuth();
const options = { region: "us-central1", enforceAppCheck: false };
const DAY = 24 * 60 * 60 * 1000;
const referralBonusFor = (capital) => ({
  200: 20, 300: 30, 400: 40, 500: 50, 600: 60, 700: 70, 800: 80, 1000: 100,
}[capital] || 0);

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  return request.auth;
}

function roleOf(request) {
  return request.auth?.token?.role || "user";
}

function requireAdminMfa(request, superOnly = false) {
  requireAuth(request);
  const role = roleOf(request);
  if ((superOnly && role !== "superadmin") || (!superOnly && !["superadmin", "sub-admin"].includes(role))) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }
}

function text(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function activeProfile(uid) {
  const profile = await db.doc(`users/${uid}`).get();
  if (!profile.exists || profile.data().status !== "active") {
    throw new HttpsError("permission-denied", "An active profile is required.");
  }
  return profile;
}

async function resolveAdminId(requested) {
  const adminId = text(requested || "HERITAGE-HQ", 80).toUpperCase();
  if (adminId === "HERITAGE-HQ") return adminId;
  const scope = await db.doc(`adminScopes/${adminId}`).get();
  if (!scope.exists || scope.data().active !== true) {
    throw new HttpsError("invalid-argument", "Advisor ID is invalid.");
  }
  return adminId;
}

function userProfile(uid, input, adminId) {
  return {
    userId: uid,
    name: text(input.name, 120),
    email: text(input.email, 320).toLowerCase(),
    phone: text(input.phone, 40),
    country: text(input.country, 80),
    role: "user",
    adminId,
    referralCode: text(input.referralCode, 40),
    referredBy: text(input.referredBy, 40),
    availableBalance: 0,
    referralBalance: 0,
    lockedBalance: 0,
    kycStatus: "unverified",
    status: "active",
    onboarded: false,
    createdAt: FieldValue.serverTimestamp(),
    lastLogin: FieldValue.serverTimestamp(),
  };
}

export const recoverMissingProfile = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const profileRef = db.doc(`users/${identity.uid}`);
  const controlRef = db.doc(`accountControls/${identity.uid}`);
  const timestamp = FieldValue.serverTimestamp();
  const profile = buildRecoveredUserProfile({
    uid: identity.uid,
    email: identity.token.email,
    name: identity.token.name,
    timestamp,
  });

  await db.runTransaction(async (transaction) => {
    const [current, control] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(controlRef),
    ]);
    if (current.exists) throw new HttpsError("already-exists", "Profile already exists.");
    try {
      assertRecoveryAllowed(control.exists ? control.data() : null);
    } catch (error) {
      throw new HttpsError("permission-denied", error.message);
    }
    transaction.create(profileRef, profile);
    transaction.set(controlRef, {
      uid: identity.uid,
      status: "active",
      reason: "Legacy profile recovery",
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: identity.uid,
      adminId: "HERITAGE-HQ",
    }, { merge: true });
    transaction.set(db.collection("securityAudit").doc(), {
      action: "missing_profile_recovered",
      targetUserId: identity.uid,
      role: "user",
      adminId: "HERITAGE-HQ",
      createdAt: timestamp,
    });
  });

  return { recovered: true, role: "user", adminId: "HERITAGE-HQ" };
});

export const provisionPublicProfile = onCall(options, async (request) => {
  const identity = requireAuth(request);
  if (["superadmin", "sub-admin"].includes(roleOf(request))) {
    throw new HttpsError("permission-denied", "Administrator profiles require trusted recovery.");
  }
  const profileRef = db.doc(`users/${identity.uid}`);
  if ((await profileRef.get()).exists) throw new HttpsError("already-exists", "Profile already exists.");
  const input = request.data || {};
  const adminId = await resolveAdminId(input.adminId);
  const controlRef = db.doc(`accountControls/${identity.uid}`);
  await db.runTransaction(async (transaction) => {
    const control = await transaction.get(controlRef);
    try {
      assertRecoveryAllowed(control.exists ? control.data() : null);
    } catch (error) {
      throw new HttpsError("permission-denied", error.message);
    }
    transaction.create(profileRef, userProfile(identity.uid, input, adminId));
    transaction.set(controlRef, {
      uid: identity.uid,
      status: "active",
      reason: "Public registration",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: identity.uid,
      adminId,
    }, { merge: true });
  });
  await auth.setCustomUserClaims(identity.uid, { role: "user", adminId });
  return { role: "user", adminId };
});

export const createAdminInvitation = onCall(options, async (request) => {
  requireAdminMfa(request, true);
  const input = request.data || {};
  const email = text(input.email, 320).toLowerCase();
  if (!email.includes("@")) throw new HttpsError("invalid-argument", "Valid email is required.");
  const adminId = text(
    input.adminId || `${text(input.name, 40).split(" ")[0]}-${randomBytes(3).toString("hex")}`,
    80,
  ).toUpperCase();
  if ((await db.doc(`adminScopes/${adminId}`).get()).exists) {
    throw new HttpsError("already-exists", "Admin ID is already assigned.");
  }
  const token = randomBytes(32).toString("base64url");
  await db.collection("adminInvitations").add({
    email,
    adminId,
    name: text(input.name, 120),
    phone: text(input.phone, 40),
    country: text(input.country, 80),
    role: "sub-admin",
    status: "pending",
    tokenHash: tokenHash(token),
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 86400000),
  });
  return { token, email, adminId };
});

export const acceptAdminInvitation = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const token = text(request.data?.token, 200);
  const matches = await db.collection("adminInvitations")
    .where("tokenHash", "==", tokenHash(token))
    .limit(1)
    .get();
  if (matches.empty) throw new HttpsError("permission-denied", "Invitation is invalid.");
  const invitationRef = matches.docs[0].ref;
  const invitation = matches.docs[0].data();
  if (invitation.status !== "pending" || invitation.expiresAt.toDate() <= new Date()) {
    throw new HttpsError("permission-denied", "Invitation is expired or already used.");
  }
  if (text(identity.token.email, 320).toLowerCase() !== invitation.email) {
    throw new HttpsError("permission-denied", "Invitation email does not match this account.");
  }
  const input = request.data?.profile || {};
  const profile = {
    ...userProfile(identity.uid, input, invitation.adminId),
    name: invitation.name || text(input.name, 120),
    email: invitation.email,
    phone: invitation.phone || text(input.phone, 40),
    country: invitation.country || text(input.country, 80),
    role: "sub-admin",
    kycStatus: "verified",
    onboarded: true,
    mfaRequired: false,
  };
  await db.runTransaction(async (transaction) => {
    const controlRef = db.doc(`accountControls/${identity.uid}`);
    const [current, control] = await Promise.all([
      transaction.get(invitationRef),
      transaction.get(controlRef),
    ]);
    if (!current.exists || current.data().status !== "pending") {
      throw new HttpsError("aborted", "Invitation was already used.");
    }
    try {
      assertRecoveryAllowed(control.exists ? control.data() : null);
    } catch (error) {
      throw new HttpsError("permission-denied", error.message);
    }
    transaction.create(db.doc(`users/${identity.uid}`), profile);
    transaction.set(controlRef, {
      uid: identity.uid,
      status: "active",
      reason: "Sub-admin invitation accepted",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
      adminId: invitation.adminId,
    }, { merge: true });
    transaction.create(db.doc(`adminScopes/${invitation.adminId}`), {
      adminId: invitation.adminId,
      ownerUserId: identity.uid,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.update(invitationRef, {
      status: "accepted",
      acceptedBy: identity.uid,
      acceptedAt: FieldValue.serverTimestamp(),
      tokenHash: FieldValue.delete(),
    });
  });
  await auth.setCustomUserClaims(identity.uid, {
    role: "sub-admin",
    adminId: invitation.adminId,
    mfaRequired: true,
  });
  return { role: "sub-admin", adminId: invitation.adminId, mfaRequired: true };
});

export const setManagedUserStatus = onCall(options, async (request) => {
  requireAdminMfa(request);
  const userId = text(request.data?.userId, 128);
  const status = request.data?.status;
  if (!["active", "suspended"].includes(status)) throw new HttpsError("invalid-argument", "Invalid status.");
  const targetRef = db.doc(`users/${userId}`);
  const target = await targetRef.get();
  if (!target.exists) throw new HttpsError("not-found", "User was not found.");
  if (["deleted", "blocked"].includes(target.data().status)) {
    throw new HttpsError("failed-precondition", "Deleted or blocked accounts require a dedicated security review.");
  }
  if (roleOf(request) === "sub-admin" && target.data().adminId !== request.auth.token.adminId) {
    throw new HttpsError("permission-denied", "User is outside your administrative scope.");
  }
  if (roleOf(request) === "sub-admin" && target.data().role !== "user") {
    throw new HttpsError("permission-denied", "Sub-admins can manage client status only.");
  }
  const scopeRef = target.data().role === "sub-admin"
    ? db.doc(`adminScopes/${target.data().adminId}`)
    : null;
  const controlRef = db.doc(`accountControls/${userId}`);
  await db.runTransaction(async (transaction) => {
    transaction.update(targetRef, { status, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(controlRef, {
      uid: userId,
      status,
      reason: text(request.data?.reason || `Account ${status} by administrator`, 500),
      createdAt: target.data().createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
      adminId: target.data().adminId || "",
    }, { merge: true });
    if (scopeRef) transaction.update(scopeRef, { active: status === "active" });
  });
  await auth.revokeRefreshTokens(userId);
  return { status };
});

export const softDeleteManagedUser = onCall(options, async (request) => {
  requireAdminMfa(request);
  const userId = text(request.data?.userId, 128);
  const reason = text(request.data?.reason, 500);
  if (!reason) throw new HttpsError("invalid-argument", "Deletion reason is required.");
  const targetRef = db.doc(`users/${userId}`);
  const target = await targetRef.get();
  if (!target.exists) throw new HttpsError("not-found", "User was not found.");
  if (roleOf(request) === "sub-admin"
    && (target.data().adminId !== request.auth.token.adminId || target.data().role !== "user")) {
    throw new HttpsError("permission-denied", "User is outside your administrative authority.");
  }
  const now = FieldValue.serverTimestamp();
  await db.runTransaction(async (transaction) => {
    transaction.update(targetRef, {
      status: "deleted",
      disabledAt: now,
      disabledBy: request.auth.uid,
      disabledReason: reason,
      updatedAt: now,
    });
    transaction.set(db.doc(`accountControls/${userId}`), {
      uid: userId,
      status: "deleted",
      reason,
      createdAt: target.data().createdAt || now,
      updatedAt: now,
      updatedBy: request.auth.uid,
      adminId: target.data().adminId || "",
    }, { merge: true });
    if (target.data().role === "sub-admin") {
      transaction.set(db.doc(`adminScopes/${target.data().adminId}`), { active: false }, { merge: true });
    }
  });
  await auth.updateUser(userId, { disabled: true });
  await auth.revokeRefreshTokens(userId);
  return { status: "deleted" };
});

export const syncAdminProfileMetadata = onCall(options, async (request) => {
  requireAdminMfa(request, true);
  const userId = text(request.data?.userId, 128);
  const identity = await auth.getUser(userId);
  const role = identity.customClaims?.role;
  const adminId = text(identity.customClaims?.adminId, 80);
  if (!["superadmin", "sub-admin"].includes(role) || !adminId) {
    throw new HttpsError("failed-precondition", "Target administrator claims are incomplete.");
  }
  const profileRef = db.doc(`users/${userId}`);
  const controlRef = db.doc(`accountControls/${userId}`);
  await db.runTransaction(async (transaction) => {
    const [profile, control] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(controlRef),
    ]);
    if (!profile.exists) {
      throw new HttpsError("failed-precondition", "Recover the normal user profile before syncing admin metadata.");
    }
    try {
      assertRecoveryAllowed(control.exists ? control.data() : null);
    } catch (error) {
      throw new HttpsError("permission-denied", error.message);
    }
    transaction.update(profileRef, {
      role,
      adminId,
      mfaRequired: false,
      onboarded: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(controlRef, {
      uid: userId,
      status: "active",
      reason: "Administrator profile metadata synchronized",
      createdAt: profile.data().createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
      adminId,
    }, { merge: true });
    if (role === "sub-admin") {
      transaction.set(db.doc(`adminScopes/${adminId}`), {
        adminId,
        ownerUserId: userId,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
  return { role, adminId };
});

export const submitKyc = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const profile = await activeProfile(identity.uid);
  const input = request.data || {};
  const documents = input.documents || {};
  if (!documents.idFront || !documents.idBack || !documents.selfie || !documents.proofOfAddress) {
    throw new HttpsError("invalid-argument", "All KYC documents are required.");
  }
  const submissionRef = db.collection("kycSubmissions").doc();
  const submission = {
    userId: identity.uid,
    userName: profile.data().name,
    adminId: profile.data().adminId,
    legalName: text(input.legalName, 160),
    dateOfBirth: text(input.dateOfBirth, 20),
    nationality: text(input.nationality, 80),
    address: text(input.address, 500),
    idType: text(input.idType, 40),
    documents,
    status: "pending",
    rejectionReason: "",
    requestDetails: "",
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (transaction) => {
    transaction.set(submissionRef, submission);
    transaction.update(profile.ref, { kycStatus: "pending" });
  });
  return { id: submissionRef.id, status: "pending" };
});

export const reviewKyc = onCall(options, async (request) => {
  requireAdminMfa(request);
  const submissionRef = db.doc(`kycSubmissions/${text(request.data?.submissionId, 128)}`);
  const submission = await submissionRef.get();
  if (!submission.exists) throw new HttpsError("not-found", "KYC submission was not found.");
  if (roleOf(request) === "sub-admin" && submission.data().adminId !== request.auth.token.adminId) {
    throw new HttpsError("permission-denied", "Submission is outside your administrative scope.");
  }
  const status = request.data?.status;
  if (!["approved", "rejected"].includes(status)) throw new HttpsError("invalid-argument", "Invalid decision.");
  const profileStatus = status === "approved" ? "verified" : "rejected";
  await db.runTransaction(async (transaction) => {
    transaction.update(submissionRef, {
      status,
      rejectionReason: status === "rejected" ? text(request.data?.rejectionReason, 500) : "",
      requestDetails: text(request.data?.requestDetails, 500),
      reviewedBy: request.auth.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(db.doc(`users/${submission.data().userId}`), { kycStatus: profileStatus });
  });
  return { status: profileStatus };
});

export const createInvestmentIntent = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const profile = await activeProfile(identity.uid);
  const input = request.data || {};
  const type = input.type;
  if (!["flash", "crypto", "stock"].includes(type)) throw new HttpsError("invalid-argument", "Invalid type.");
  let values;
  if (type === "flash") {
    const [tier, settings] = await Promise.all([
      db.doc(`flashTiers/${text(input.tierId, 128)}`).get(),
      db.doc(`flashSettings/${text(input.settingsId, 128)}`).get(),
    ]);
    if (!tier.exists || !settings.exists || !tier.data().active
      || tier.data().adminId !== profile.data().adminId
      || settings.data().adminId !== profile.data().adminId) {
      throw new HttpsError("invalid-argument", "Flash plan is unavailable.");
    }
    values = {
      planId: tier.id,
      investmentType: "flash",
      duration: `${Number(settings.data().durationHours)} hours`,
      expectedMaturityDate: new Date(Date.now() + Number(settings.data().durationHours) * 60 * 60 * 1000).toISOString(),
      assetId: tier.id,
      assetName: settings.data().name,
      ticker: "FLASH",
      planName: settings.data().name,
      capital: Number(tier.data().capital),
      projectedReturn: Number(tier.data().returnAmount),
      durationHours: Number(settings.data().durationHours),
      completedWeeks: 0,
      totalWeeks: 1,
      roi: Number(tier.data().capital)
        ? ((Number(tier.data().returnAmount) - Number(tier.data().capital)) / Number(tier.data().capital)) * 100
        : 0,
      expectedProfit: Number(tier.data().returnAmount) - Number(tier.data().capital),
      expectedReturn: Number(tier.data().returnAmount),
    };
  } else {
    const asset = await db.doc(`${type === "crypto" ? "coins" : "stocks"}/${text(input.assetId, 128)}`).get();
    const weeklyCapital = Number(input.weeklyCapital);
    const durationMonths = Number(input.durationMonths);
    const tier = asset.data()?.tiers?.find(
      (item) => item.active && Number(item.weeklyCapital) === weeklyCapital,
    );
    if (!asset.exists || !asset.data().active || asset.data().adminId !== profile.data().adminId
      || !tier || ![2, 3].includes(durationMonths)) {
      throw new HttpsError("invalid-argument", "Investment tier is unavailable.");
    }
    values = {
      planId: asset.id,
      investmentType: type,
      duration: `${durationMonths} months`,
      expectedMaturityDate: new Date(Date.now() + (durationMonths === 2 ? 8 : 13) * 7 * DAY).toISOString(),
      assetId: asset.id,
      assetName: asset.data().name,
      ticker: asset.data().ticker,
      planName: `${asset.data().name} ${durationMonths}-Month Plan`,
      weeklyCapital,
      projectedReturn: Number(durationMonths === 2 ? tier.return2Months : tier.return3Months),
      durationMonths,
      totalWeeks: durationMonths === 2 ? 8 : 13,
      completedWeeks: 0,
      referencePrice: Number(asset.data().referencePrice || 0),
      capital: weeklyCapital * (durationMonths === 2 ? 8 : 13),
      roi: weeklyCapital
        ? ((Number(durationMonths === 2 ? tier.return2Months : tier.return3Months)
          - weeklyCapital * (durationMonths === 2 ? 8 : 13))
          / (weeklyCapital * (durationMonths === 2 ? 8 : 13))) * 100
        : 0,
      expectedProfit: Number(durationMonths === 2 ? tier.return2Months : tier.return3Months)
        - weeklyCapital * (durationMonths === 2 ? 8 : 13),
      expectedReturn: Number(durationMonths === 2 ? tier.return2Months : tier.return3Months),
    };
  }
  const record = {
    ...values,
    userId: identity.uid,
    userName: profile.data().name,
    adminId: profile.data().adminId,
    type,
    fundingSource: "",
    status: "awaiting_funding",
    pausedDays: 0,
    referralBonusPaid: false,
    timeline: [],
    createdAt: FieldValue.serverTimestamp(),
  };
  const created = await db.collection("investments").add(record);
  return { id: created.id, ...record, createdAt: new Date().toISOString() };
});

export const submitDepositIntent = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const profile = await activeProfile(identity.uid);
  const input = request.data || {};
  const method = await db.doc(`depositMethods/${text(input.methodId, 128)}`).get();
  if (!method.exists || !method.data().active || method.data().adminId !== profile.data().adminId) {
    throw new HttpsError("invalid-argument", "Deposit method is unavailable.");
  }
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpsError("invalid-argument", "Invalid amount.");
  const balanceContribution = Number(input.balanceContribution || 0);
  const totalRequired = Number(input.totalRequired || amount);
  const depositRef = db.collection("deposits").doc();
  const transactionRef = db.collection("transactions").doc();
  const deposit = {
    userId: identity.uid,
    userName: profile.data().name,
    adminId: profile.data().adminId,
    methodId: method.id,
    methodName: method.data().name,
    amount,
    reference: text(input.reference, 120),
    transactionHash: text(input.transactionHash, 200),
    proofUrl: text(input.proofUrl, 1000),
    status: "pending",
    investmentId: text(input.investmentId, 128),
    week: Number(input.week || 0) || null,
    depositType: input.investmentId ? "investment" : "general",
    balanceContribution,
    totalRequired,
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (transaction) => {
    let investmentRef;
    if (input.investmentId) {
      investmentRef = db.doc(`investments/${text(input.investmentId, 128)}`);
      const investment = await transaction.get(investmentRef);
      if (!investment.exists || investment.data().userId !== identity.uid
        || !["awaiting_funding", "pending", "paused", "active"].includes(investment.data().status)) {
        throw new HttpsError("failed-precondition", "Investment intent is unavailable.");
      }
      const required = Number(Number(input.week || 0) > 1
        ? investment.data().weeklyCapital
        : investment.data().type === "flash"
          ? investment.data().capital
          : investment.data().weeklyCapital);
      if (amount + balanceContribution !== required
        || totalRequired !== required
        || balanceContribution < 0
        || balanceContribution > Number(profile.data().availableBalance || 0)) {
        throw new HttpsError("invalid-argument", "Funding amount does not match the investment.");
      }
    }
    transaction.set(depositRef, deposit);
    transaction.set(transactionRef, {
      userId: identity.uid,
      adminId: profile.data().adminId,
      type: "deposit",
      label: "Deposit submitted",
      amount,
      status: "pending",
      depositId: depositRef.id,
      sourceId: depositRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (investmentRef) {
      transaction.update(investmentRef, {
        fundingSource: "new_deposit",
        status: "pending_approval",
      });
    }
  });
  return { id: depositRef.id, ...deposit, createdAt: new Date().toISOString() };
});

export const requestWithdrawalIntent = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const profile = await activeProfile(identity.uid);
  const input = request.data || {};
  const type = input.type;
  const amount = Number(input.amount);
  const balance = type === "referral"
    ? Number(profile.data().referralBalance || 0)
    : Number(profile.data().availableBalance || 0);
  if (!["investment", "referral"].includes(type)
    || !Number.isFinite(amount) || amount <= 0 || amount > balance) {
    throw new HttpsError("invalid-argument", "Withdrawal request is invalid.");
  }
  const settingsQuery = await db.collection("platformSettings").where("key", "==", "platform").limit(1).get();
  const settings = settingsQuery.docs[0]?.data() || {};
  if (settings.kycRequired && settings.withdrawalLimitEnabled
    && profile.data().kycStatus !== "verified"
    && amount > Number(settings.unverifiedWithdrawalLimit || 500)) {
    throw new HttpsError("failed-precondition", "KYC verification is required.");
  }
  const withdrawalRef = db.collection("withdrawals").doc();
  const transactionRef = db.collection("transactions").doc();
  const withdrawal = {
    userId: identity.uid,
    userName: profile.data().name,
    adminId: profile.data().adminId,
    type,
    amount,
    method: text(input.method, 80),
    accountDetails: text(input.accountDetails, 1000),
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (transaction) => {
    transaction.set(withdrawalRef, withdrawal);
    transaction.set(transactionRef, {
      userId: identity.uid,
      adminId: profile.data().adminId,
      type: "withdrawal",
      label: "Withdrawal submitted",
      amount,
      status: "pending",
      withdrawalId: withdrawalRef.id,
      withdrawalType: type === "referral" ? "referral" : "available",
      sourceId: withdrawalRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: withdrawalRef.id, ...withdrawal, createdAt: new Date().toISOString() };
});

export const activateInvestmentFromBalance = onCall(options, async (request) => {
  const identity = requireAuth(request);
  const investmentId = text(request.data?.investmentId, 128);
  if (!investmentId) throw new HttpsError("invalid-argument", "Investment intent is required.");
  const profileRef = db.doc(`users/${identity.uid}`);
  const investmentRef = db.doc(`investments/${investmentId}`);
  const transactionRef = db.collection("transactions").doc();
  const notificationRef = db.collection("notifications").doc();

  const result = await db.runTransaction(async (transaction) => {
    const [profile, investment] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(investmentRef),
    ]);
    if (!profile.exists || profile.data().status !== "active") {
      throw new HttpsError("permission-denied", "An active profile is required.");
    }
    if (!investment.exists || investment.data().userId !== identity.uid
      || !["awaiting_funding", "pending"].includes(investment.data().status)) {
      throw new HttpsError("failed-precondition", "Investment intent is unavailable.");
    }

    const plan = investment.data();
    const amount = Number(plan.type === "flash" ? plan.capital : plan.weeklyCapital);
    const availableBalance = Number(profile.data().availableBalance || 0);
    if (!Number.isFinite(amount) || amount <= 0 || availableBalance < amount) {
      throw new HttpsError("failed-precondition", "Available balance is insufficient.");
    }

    const activatedAt = new Date();
    const maturityAt = new Date(activatedAt.getTime()
      + (plan.type === "flash" ? Number(plan.durationHours) * 60 * 60 * 1000 : Number(plan.totalWeeks) * 7 * DAY));
    const status = plan.type === "flash" ? "flash active" : "active";
    let referrer = null;
    let bonus = 0;
    if (plan.type !== "flash" && !plan.referralBonusPaid && profile.data().referredBy) {
      const referrerQuery = db.collection("users")
        .where("referralCode", "==", profile.data().referredBy)
        .limit(1);
      const settingsQuery = db.collection("platformSettings").where("key", "==", "platform").limit(1);
      const [referrerSnapshot, settingsSnapshot] = await Promise.all([
        transaction.get(referrerQuery),
        transaction.get(settingsQuery),
      ]);
      referrer = referrerSnapshot.docs[0] || null;
      if (referrer?.data().adminId !== profile.data().adminId) referrer = null;
      const settings = settingsSnapshot.docs[0]?.data() || {};
      bonus = Number(settings.referralBonuses?.[plan.weeklyCapital] ?? referralBonusFor(plan.weeklyCapital));
    }

    transaction.update(profileRef, {
      availableBalance: availableBalance - amount,
    });
    transaction.update(investmentRef, {
      fundingSource: "available_balance",
      status,
      completedWeeks: 1,
      currentWeek: 1,
      capitalAmount: amount,
      durationSeconds: plan.type === "flash"
        ? Number(plan.durationHours) * 60 * 60
        : Number(plan.totalWeeks) * 7 * 24 * 60 * 60,
      activeElapsedSeconds: 0,
      lockedEarned: 0,
      startedAt: FieldValue.serverTimestamp(),
      lastActivatedAt: activatedAt.toISOString(),
      totalPausedSeconds: 0,
      lastLockedCalculationAt: activatedAt.toISOString(),
      maturityAt: maturityAt.toISOString(),
      nextDueAt: plan.type === "flash" ? null : new Date(activatedAt.getTime() + 7 * DAY).toISOString(),
      timeline: [{
        week: 1,
        status: "approved",
        amount,
        fundingSource: "available_balance",
        approvedAt: activatedAt.toISOString(),
      }],
    });
    transaction.set(transactionRef, {
      userId: identity.uid,
      adminId: profile.data().adminId,
      type: "investment_activated",
      label: `${plan.planName} activated from available balance`,
      amount,
      status: "active",
      sourceId: investmentRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(notificationRef, {
      userId: identity.uid,
      adminId: profile.data().adminId,
      type: "investment",
      title: "Investment activated",
      message: `${plan.planName} is now active.`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (referrer && bonus > 0) {
        transaction.update(referrer.ref, {
          referralBalance: Number(referrer.data().referralBalance || 0) + bonus,
        });
        transaction.update(investmentRef, { referralBonusPaid: true });
        transaction.set(db.collection("transactions").doc(), {
          userId: referrer.id,
          adminId: profile.data().adminId,
          type: "referral_bonus_earned",
          label: `Referral bonus from ${profile.data().name}`,
          amount: bonus,
          status: "completed",
          createdAt: FieldValue.serverTimestamp(),
        });
    }
    return { investmentId, status: "active" };
  });
  return result;
});
