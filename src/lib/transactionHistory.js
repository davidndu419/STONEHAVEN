import { dataService } from "./dataService";

export async function loadTransactionHistory(userId) {
  const [transactions, deposits, withdrawals, investments] = await Promise.all([
    dataService.listForUser("transactions", userId).catch(() => []),
    dataService.listForUser("deposits", userId).catch(() => []),
    dataService.listForUser("withdrawals", userId).catch(() => []),
    dataService.listForUser("investments", userId).catch(() => []),
  ]);

  const requestTransactionTypes = new Set([
    "deposit", "deposit_submitted", "deposit_approved", "deposit_rejected", "deposit_declined",
    "balance_funding_submitted", "investment_funding_submitted", "weekly_deposit",
    "withdrawal", "withdrawal_requested", "withdrawal_approved", "withdrawal_rejected",
    "withdrawal_declined", "withdrawal_hold", "referral_withdrawal",
  ]);

  const sourceItems = [
    ...deposits.map((item) => {
      const type = item.depositType === "balance" || item.depositType === "investment"
        ? "investment_deposit"
        : "deposit";
      return {
        id: `deposit-${item.id}`,
        type,
        label: item.status === "pending" ? "Deposit submitted" : "Deposit",
        amount: item.amount,
        status: item.status,
        reason: item.declineReason || "",
        createdAt: item.createdAt,
        approvedAt: item.approvedAt,
        declinedAt: item.declinedAt,
      };
    }),
    ...withdrawals.map((item) => {
      return {
        id: `withdrawal-${item.id}`,
        type: "withdrawal",
        withdrawalType: item.type === "referral" ? "referral" : "available",
        label: item.status === "pending"
          ? `${item.type === "referral" ? "Referral" : "Available balance"} withdrawal submitted`
          : `${item.type === "referral" ? "Referral" : "Available balance"} withdrawal`,
        amount: item.amount,
        status: item.status,
        reason: item.declineReason || "",
        createdAt: item.createdAt,
        approvedAt: item.approvedAt,
        declinedAt: item.declinedAt,
      };
    }),
    ...investments
      .filter((item) => ["awaiting_funding", "cancelled"].includes(item.status))
      .map((item) => {
        const closed = item.status === "cancelled";
        return {
        id: `investment-${item.id}`,
        type: closed ? "investment_closed" : "investment_created",
        label: `${item.planName || item.ticker || "Investment"} ${closed ? "closed" : "awaiting funding"}`,
        amount: item.capital || item.weeklyCapital || 0,
        status: closed ? "closed" : item.status,
        createdAt: closed ? item.cancelledAt || item.createdAt : item.createdAt,
      };
      }),
  ];

  return [
    ...transactions.filter((item) =>
      item.visibility !== "admin_only" && !requestTransactionTypes.has(item.type)
    ),
    ...sourceItems,
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
