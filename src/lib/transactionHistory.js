import { dataService } from "./dataService";

export async function loadTransactionHistory(userId) {
  const [transactions, deposits, withdrawals, investments] = await Promise.all([
    dataService.listForUser("transactions", userId).catch(() => []),
    dataService.listForUser("deposits", userId).catch(() => []),
    dataService.listForUser("withdrawals", userId).catch(() => []),
    dataService.listForUser("investments", userId).catch(() => []),
  ]);

  const hasLoggedEvent = (type, item) => transactions.some((transaction) =>
    transaction.type === type
    && Number(transaction.amount || 0) === Number(item.amount || 0)
    && Math.abs(new Date(transaction.createdAt) - new Date(item.createdAt)) < 300000
  );

  const sourceItems = [
    ...deposits.flatMap((item) => {
      const type = item.depositType === "balance"
        ? "balance_funding_submitted"
        : item.depositType === "investment" ? "investment_funding_submitted" : "deposit_submitted";
      return hasLoggedEvent(type, item) ? [] : [{
        id: `deposit-${item.id}`,
        type,
        label: item.depositType === "balance"
          ? "Balance funding submitted"
          : item.investmentId ? "Investment funding submitted" : `Wallet deposit submitted${item.methodName ? ` via ${item.methodName}` : ""}`,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt,
      }];
    }),
    ...withdrawals.flatMap((item) => {
      const type = item.type === "referral" ? "referral_withdrawal" : "withdrawal_requested";
      return hasLoggedEvent(type, item) ? [] : [{
        id: `withdrawal-${item.id}`,
        type,
        label: item.type === "referral" ? "Referral withdrawal requested" : "Available balance withdrawal requested",
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt,
      }];
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

  return [...transactions, ...sourceItems]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
