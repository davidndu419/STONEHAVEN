export const BLOCKED_LIFECYCLE_STATUSES = new Set(["suspended", "deleted", "blocked"]);

export function assertRecoveryAllowed(control) {
  if (control && BLOCKED_LIFECYCLE_STATUSES.has(control.status)) {
    const error = new Error(`Account recovery is unavailable because this account is ${control.status}.`);
    error.code = "permission-denied";
    throw error;
  }
}

export function buildRecoveredUserProfile({ uid, email, name, timestamp }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const fallbackName = String(name || normalizedEmail.split("@")[0] || "Stonehaven Client")
    .trim()
    .slice(0, 120);
  return {
    userId: uid,
    name: fallbackName,
    email: normalizedEmail,
    phone: "",
    country: "",
    role: "user",
    adminId: "HERITAGE-HQ",
    referralCode: `LEGACY-${uid.slice(0, 8).toUpperCase()}`,
    referredBy: "",
    availableBalance: 0,
    referralBalance: 0,
    lockedBalance: 0,
    kycStatus: "unverified",
    status: "active",
    onboarded: false,
    createdAt: timestamp,
    lastLogin: timestamp,
  };
}
