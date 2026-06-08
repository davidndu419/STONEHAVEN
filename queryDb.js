import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

// Manually parse env file
const envFile = fs.readFileSync(".env", "utf8");
const config = {};
envFile.split("\n").forEach((line) => {
  const match = line.match(/^\s*(VITE_FIREBASE_[A-Z_]+)\s*=\s*"?([^"\r\n]+)"?/);
  if (match) {
    config[match[1]] = match[2].trim();
  }
});

const firebaseConfig = {
  apiKey: config.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID,
};

console.log("Firebase config loaded:", JSON.stringify(firebaseConfig, null, 2));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  for (const name of ["coins", "stocks", "flashSettings", "flashTiers"]) {
    try {
      const snap = await getDocs(collection(db, name));
      console.log(`Collection "${name}" has ${snap.size} documents.`);
      snap.forEach((doc) => {
        console.log(`  Document ${doc.id}:`, JSON.stringify(doc.data()));
      });
    } catch (e) {
      console.error(`Error checking "${name}":`, e.message);
    }
  }
}

checkCollections();
