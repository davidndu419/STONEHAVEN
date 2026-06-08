import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

initializeApp();

const assignments = JSON.parse(process.env.ADMIN_CLAIMS_JSON || "[]");
const apply = process.env.APPLY_ADMIN_CLAIMS === "true";
const allowedRoles = new Set(["superadmin", "sub-admin"]);

if (!Array.isArray(assignments) || assignments.length === 0) {
  throw new Error("ADMIN_CLAIMS_JSON must be a non-empty JSON array.");
}

for (const assignment of assignments) {
  const { uid, role, adminId } = assignment;
  if (!uid || !allowedRoles.has(role) || !adminId) {
    throw new Error("Each assignment requires uid, adminId, and an administrator role.");
  }
}

if (!apply) {
  console.log("Dry run only. Set APPLY_ADMIN_CLAIMS=true to apply:");
  console.table(assignments);
  process.exit(0);
}

const auth = getAuth();
const db = getFirestore();

for (const { uid, role, adminId } of assignments) {
  const identity = await auth.getUser(uid);
  const profileRef = db.doc(`users/${uid}`);
  const profile = await profileRef.get();
  if (!profile.exists) throw new Error(`Missing Firestore profile for ${uid}.`);

  await auth.setCustomUserClaims(uid, {
    ...(identity.customClaims || {}),
    role,
    adminId,
    mfaRequired: false,
  });
  await profileRef.update({
    role,
    adminId,
    mfaRequired: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`accountControls/${uid}`).set({
    uid,
    status: profile.data().status === "active" ? "active" : profile.data().status,
    reason: "Administrator claims bootstrap",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "bootstrapAdminClaims",
    adminId,
  }, { merge: true });
  if (role === "sub-admin") {
    await db.doc(`adminScopes/${adminId}`).set({
      adminId,
      ownerUserId: uid,
      active: profile.data().status === "active",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await db.collection("securityAudit").add({
    action: "admin_claims_bootstrap",
    targetUserId: uid,
    role,
    adminId,
    createdAt: FieldValue.serverTimestamp(),
  });
  await auth.revokeRefreshTokens(uid);
  console.log(`Applied ${role} claims to ${uid}.`);
}
