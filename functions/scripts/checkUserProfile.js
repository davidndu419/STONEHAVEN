import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

async function run() {
  const uid = "bh9X2yH11OfRvuQTRl2pFTMAGg52";
  try {
    const profileSnap = await db.doc(`users/${uid}`).get();
    if (!profileSnap.exists) {
      console.log(`User profile for ${uid} does not exist!`);
    } else {
      console.log(`User profile for ${uid}:`, JSON.stringify(profileSnap.data(), null, 2));
    }
    
    const controlSnap = await db.doc(`accountControls/${uid}`).get();
    if (!controlSnap.exists) {
      console.log(`Account controls for ${uid} does not exist!`);
    } else {
      console.log(`Account controls for ${uid}:`, JSON.stringify(controlSnap.data(), null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error("Error reading user profile:", err);
    process.exit(1);
  }
}

run();
