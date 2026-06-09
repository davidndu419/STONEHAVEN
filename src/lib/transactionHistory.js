import { dataService } from "./dataService";

export async function loadTransactionHistory(userId) {
  const [transactions, deposits, withdrawals] = await Promise.all([
    dataService.listForUser("transactions", userId).catch(() => []),
    dataService.listForUser("deposits", userId).catch(() => []),
    dataService.listForUser("withdrawals", userId).catch(() => []),
  ]);

  const allowedUserTransactionTypes = new Set([
    "referral_bonus_earned",
    "referral_bonus",
    "investment_approved",
    "investment_funding_declined",
    "investment_completed",
    "investment_matured",
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
  ];

  const filteredTransactions = transactions.filter((item) =>
    item.visibility !== "admin_only" && allowedUserTransactionTypes.has(item.type)
  );

  return [
    ...filteredTransactions,
    ...sourceItems,
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
