import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

async function run() {
  try {
    const collections = ["coins", "stocks", "flashSettings", "flashTiers", "depositMethods"];
    for (const col of collections) {
      const snap = await db.collection(col).get();
      console.log(`Collection "${col}" has ${snap.size} documents.`);
      snap.forEach(doc => {
        console.log(`  [${doc.id}]:`, JSON.stringify(doc.data()));
      });
    }
    process.exit(0);
  } catch (err) {
    console.error("Error reading collections:", err);
    process.exit(1);
  }
}

run();
