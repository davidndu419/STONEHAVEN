import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();

const ADMIN_ID = "HERITAGE-HQ";

const weeklyTiers = [
  [200, 87000, 88000], [300, 87000, 108000], [400, 107000, 128000], [500, 127000, 148000],
  [600, 147000, 168000], [700, 167000, 188000], [800, 187000, 208000], [1000, 227000, 248000],
].map(([weeklyCapital, return2Months, return3Months]) => ({ weeklyCapital, return2Months, return3Months, active: true }));

const coins = [
  { id: "coin-btc", adminId: ADMIN_ID, name: "Bitcoin", ticker: "BTC", tradingViewSymbol: "BINANCE:BTCUSDT", active: true, logoUrl: "", tiers: weeklyTiers },
  { id: "coin-eth", adminId: ADMIN_ID, name: "Ethereum", ticker: "ETH", tradingViewSymbol: "BINANCE:ETHUSDT", active: true, logoUrl: "", tiers: weeklyTiers },
  { id: "coin-sol", adminId: ADMIN_ID, name: "Solana", ticker: "SOL", tradingViewSymbol: "BINANCE:SOLUSDT", active: true, logoUrl: "", tiers: weeklyTiers },
];

const stocks = [
  {
    id: "stock-aapl", adminId: ADMIN_ID, name: "Apple Inc.", ticker: "AAPL", tradingViewSymbol: "NASDAQ:AAPL",
    sector: "Technology", active: true, logoUrl: "", marketCap: "$3.02T", weekHigh: "$237.49", weekLow: "$164.08",
    peRatio: "31.4", about: "Apple designs consumer technology, software, and services used around the world.",
    whyInvest: "A durable ecosystem, recurring services revenue, and substantial free cash flow.",
    historicalReturns: "Five-year illustrative return: +286%.", referencePrice: 189.23, tiers: weeklyTiers,
  },
  {
    id: "stock-nvda", adminId: ADMIN_ID, name: "NVIDIA Corporation", ticker: "NVDA", tradingViewSymbol: "NASDAQ:NVDA",
    sector: "Semiconductors", active: true, logoUrl: "", marketCap: "$2.98T", weekHigh: "$152.89", weekLow: "$75.61",
    peRatio: "47.8", about: "NVIDIA develops accelerated computing platforms for AI, graphics, and data centers.",
    whyInvest: "Category leadership in accelerated computing and sustained demand for AI infrastructure.",
    historicalReturns: "Five-year illustrative return: +2,740%.", referencePrice: 121, tiers: weeklyTiers,
  },
  {
    id: "stock-msft", adminId: ADMIN_ID, name: "Microsoft Corporation", ticker: "MSFT", tradingViewSymbol: "NASDAQ:MSFT",
    sector: "Technology", active: true, logoUrl: "", marketCap: "$3.18T", weekHigh: "$468.35", weekLow: "$344.77",
    peRatio: "35.1", about: "Microsoft provides cloud, productivity, operating system, gaming, and AI products.",
    whyInvest: "Diversified recurring revenue and a leading enterprise cloud and AI position.",
    historicalReturns: "Five-year illustrative return: +224%.", referencePrice: 427.3, tiers: weeklyTiers,
  },
];

const flashSettings = [{
  id: "flash-settings-hq",
  adminId: ADMIN_ID,
  name: "Stonehaven Flash",
  durationHours: 24,
  active: true,
}];

const flashTiers = [
  [50, 80], [100, 150], [200, 300], [300, 450], [500, 700], [1000, 1300],
].map(([capital, returnAmount], index) => ({
  id: `flash-tier-${index + 1}`, adminId: ADMIN_ID, capital, returnAmount, active: true,
}));

const depositMethods = [
  {
    id: "method-usdt",
    adminId: ADMIN_ID,
    name: "USDT (TRC20)",
    type: "Crypto",
    label: "Tether USDT",
    details: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    extraInfo: "Use the TRC20 network only. Minimum deposit: $50.",
    active: true,
    iconUrl: "",
  },
  {
    id: "method-bank",
    adminId: ADMIN_ID,
    name: "Private Bank Transfer",
    type: "Bank",
    label: "Stonehaven Client Trust",
    details: "Account 8047 2219 031 · Routing 021000021",
    extraInfo: "Include your deposit reference in the transfer memo.",
    active: true,
    iconUrl: "",
  },
];

const platformSettings = [{
  id: "platform-global",
  adminId: "GLOBAL",
  key: "platform",
  platformName: "Stonehaven Investment Group",
  logoUrl: "",
  maintenanceMode: false,
  kycRequired: true,
  withdrawalLimitEnabled: true,
  unverifiedWithdrawalLimit: 500,
  referralEnabled: true,
  referralBonuses: { 200: 20, 300: 30, 400: 40, 500: 50, 600: 60, 700: 70, 800: 80, 1000: 100 },
  testimonialEnabled: true,
  testimonialMinInterval: 8,
  testimonialMaxInterval: 15,
}];

async function seedCollection(name, items) {
  console.log(`Seeding collection "${name}"...`);
  for (const item of items) {
    const { id: docId, ...data } = item;
    const ref = db.collection(name).doc(docId);
    await ref.set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  Seeded ${name}/${docId}`);
  }
}

async function run() {
  try {
    await seedCollection("coins", coins);
    await seedCollection("stocks", stocks);
    await seedCollection("flashSettings", flashSettings);
    await seedCollection("flashTiers", flashTiers);
    await seedCollection("depositMethods", depositMethods);
    await seedCollection("platformSettings", platformSettings);
    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

run();
