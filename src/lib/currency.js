import { useAuth } from "../context/AuthContext";

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
];

export const EXCHANGE_RATES = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  NGN: 1500,
};

export function getCurrencySymbol(currencyCode) {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  return currency ? currency.symbol : "$";
}

export function convertFromUSD(amountUSD, currencyCode) {
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  return amountUSD * rate;
}

export function formatCurrency(amountUSD, currencyCode) {
  const amount = convertFromUSD(amountUSD, currencyCode);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function useCurrency() {
  const { user } = useAuth();
  const currencyCode = user?.currency || "USD";

  return {
    currencyCode,
    symbol: getCurrencySymbol(currencyCode),
    format: (amountUSD) => formatCurrency(amountUSD || 0, currencyCode),
  };
}
