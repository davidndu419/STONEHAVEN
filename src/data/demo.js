export const ADMIN_ID = "HERITAGE-HQ";

export const seedUsers = [
  {
    userId: "demo-user",
    name: "Olivia Bennett",
    email: "user@stonehaven.test",
    password: "demo123",
    phone: "+1 202 555 0188",
    country: "United States",
    role: "user",
    adminId: ADMIN_ID,
    referralCode: "OLIVIA24",
    referredBy: "",
    availableBalance: 133000,
    referralBalance: 640,
    lockedBalance: 503000,
    kycStatus: "unverified",
    status: "active",
    onboarded: true,
    preference: "crypto",
    createdAt: "2026-01-12T10:00:00.000Z",
    lastLogin: new Date().toISOString(),
  },
  {
    userId: "demo-admin",
    name: "James Whitmore",
    email: "admin@stonehaven.test",
    password: "demo123",
    phone: "+1 202 555 0142",
    country: "United States",
    role: "sub-admin",
    adminId: ADMIN_ID,
    referralCode: "JAMESHQ",
    referredBy: "",
    availableBalance: 0,
    referralBalance: 0,
    lockedBalance: 0,
    kycStatus: "verified",
    status: "active",
    onboarded: true,
    createdAt: "2025-11-08T10:00:00.000Z",
    lastLogin: new Date().toISOString(),
  },
  {
    userId: "demo-superadmin",
    name: "Eleanor Stone",
    email: "superadmin@stonehaven.test",
    password: "demo123",
    phone: "+1 202 555 0100",
    country: "United States",
    role: "superadmin",
    adminId: "GLOBAL",
    referralCode: "FOUNDER",
    referredBy: "",
    availableBalance: 0,
    referralBalance: 0,
    lockedBalance: 0,
    kycStatus: "verified",
    status: "active",
    onboarded: true,
    createdAt: "2025-01-01T10:00:00.000Z",
    lastLogin: new Date().toISOString(),
  },
  {
    userId: "client-sarah",
    name: "Sarah Mitchell",
    email: "sarah@example.com",
    phone: "+44 7700 900123",
    country: "United Kingdom",
    role: "user",
    adminId: ADMIN_ID,
    referralCode: "SARAH81",
    referredBy: "OLIVIA24",
    availableBalance: 48600,
    referralBalance: 200,
    lockedBalance: 148000,
    kycStatus: "verified",
    status: "active",
    onboarded: true,
    createdAt: "2026-03-14T10:00:00.000Z",
    lastLogin: "2026-06-05T16:20:00.000Z",
  },
];

export const seedMethods = [
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

export const seedDeposits = [
  {
    id: "dep-001",
    userId: "client-sarah",
    userName: "Sarah Mitchell",
    adminId: ADMIN_ID,
    methodId: "method-usdt",
    methodName: "USDT (TRC20)",
    amount: 600,
    reference: "SH-SARAH-AAPL-W1",
    transactionHash: "0x38f...91ad",
    proofUrl: "",
    status: "pending",
    createdAt: "2026-06-06T09:30:00.000Z",
  },
];

export const seedWithdrawals = [
  {
    id: "with-001",
    userId: "client-sarah",
    userName: "Sarah Mitchell",
    adminId: ADMIN_ID,
    type: "investment",
    amount: 1200,
    method: "Bank transfer",
    accountDetails: "Barclays ···· 8821",
    status: "pending",
    createdAt: "2026-06-05T13:20:00.000Z",
  },
];

export const seedTransactions = [
  {
    id: "tx-001",
    userId: "demo-user",
    adminId: ADMIN_ID,
    type: "deposit_approved",
    label: "Weekly deposit approved",
    amount: 600,
    status: "approved",
    createdAt: "2026-06-01T12:00:00.000Z",
  },
  {
    id: "tx-002",
    userId: "demo-user",
    adminId: ADMIN_ID,
    type: "referral_bonus",
    label: "Referral bonus earned",
    amount: 60,
    status: "completed",
    createdAt: "2026-05-28T12:00:00.000Z",
  },
];

export const seedFlashSettings = [{
  id: "flash-settings-hq",
  adminId: ADMIN_ID,
  name: "Stonehaven Flash",
  durationHours: 24,
  active: true,
}];

export const seedFlashTiers = [
  [50, 80], [100, 150], [200, 300], [300, 450], [500, 700], [1000, 1300],
].map(([capital, returnAmount], index) => ({
  id: `flash-tier-${index + 1}`, adminId: ADMIN_ID, capital, returnAmount, active: true,
}));

const weeklyTiers = [
  [200, 87000, 88000], [300, 87000, 108000], [400, 107000, 128000], [500, 127000, 148000],
  [600, 147000, 168000], [700, 167000, 188000], [800, 187000, 208000], [1000, 227000, 248000],
].map(([weeklyCapital, return2Months, return3Months]) => ({ weeklyCapital, return2Months, return3Months, active: true }));

export const seedCoins = [
  { id: "coin-btc", adminId: ADMIN_ID, name: "Bitcoin", ticker: "BTC", tradingViewSymbol: "BINANCE:BTCUSDT", active: true, logoUrl: "", tiers: weeklyTiers },
  { id: "coin-eth", adminId: ADMIN_ID, name: "Ethereum", ticker: "ETH", tradingViewSymbol: "BINANCE:ETHUSDT", active: true, logoUrl: "", tiers: weeklyTiers },
  { id: "coin-sol", adminId: ADMIN_ID, name: "Solana", ticker: "SOL", tradingViewSymbol: "BINANCE:SOLUSDT", active: true, logoUrl: "", tiers: weeklyTiers },
];

export const seedStocks = [
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

export const seedInvestments = [{
  id: "investment-demo-btc",
  userId: "demo-user", userName: "Olivia Bennett", adminId: ADMIN_ID,
  type: "crypto", assetId: "coin-btc", assetName: "Bitcoin", ticker: "BTC",
  planName: "Bitcoin 3-Month Heritage Plan", weeklyCapital: 600, projectedReturn: 168000,
  durationMonths: 3, totalWeeks: 13, completedWeeks: 3, status: "active",
  startedAt: "2026-05-16T10:00:00.000Z", nextDueAt: "2026-06-13T10:00:00.000Z",
  maturityAt: "2026-08-15T10:00:00.000Z", pausedDays: 0, referralBonusPaid: true,
  timeline: [
    { week: 1, status: "approved", amount: 600, submittedAt: "2026-05-16T09:00:00.000Z", approvedAt: "2026-05-16T10:00:00.000Z" },
    { week: 2, status: "approved", amount: 600, submittedAt: "2026-05-23T09:00:00.000Z", approvedAt: "2026-05-23T10:00:00.000Z" },
    { week: 3, status: "approved", amount: 600, submittedAt: "2026-05-30T09:00:00.000Z", approvedAt: "2026-05-30T10:00:00.000Z" },
  ],
  createdAt: "2026-05-16T09:00:00.000Z",
}];

export const seedNotifications = [];
