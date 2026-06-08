import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

initializeApp();

const apply = process.env.APPLY_ACCOUNT_CONTROLS_BACKFILL === "true";
const db = getFirestore();
const users = await db.collection("users").get();
const pending = [];

for (const user of users.docs) {
  const control = await db.doc(`accountControls/${user.id}`).get();
  if (control.exists) continue;
  const profile = user.data();
  const status = ["active", "suspended", "deleted", "blocked"].includes(profile.status)
    ? profile.status
    : "blocked";
  pending.push({
    uid: user.id,
    status,
    adminId: profile.adminId || "",
    createdAt: profile.createdAt || null,
  });
}

console.table(pending.map(({ uid, status, adminId }) => ({ uid, status, adminId })));
if (!apply) {
  console.log("Dry run only. Set APPLY_ACCOUNT_CONTROLS_BACKFILL=true to apply.");
  process.exit(0);
}

for (const item of pending) {
  await db.doc(`accountControls/${item.uid}`).create({
    uid: item.uid,
    status: item.status,
    reason: "Phase 1 lifecycle control backfill",
    createdAt: item.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "backfillAccountControls",
    adminId: item.adminId,
  });
}

console.log(`Created ${pending.length} account control records.`);
