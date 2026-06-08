export const INVESTMENT_MODES = [
  { value: "crypto", label: "Crypto" },
  { value: "stock", label: "Stock" },
  { value: "flash", label: "Flash" },
];

export function normalizeInvestmentMode(value) {
  if (value === "stocks") return "stock";
  return INVESTMENT_MODES.some((mode) => mode.value === value) ? value : "crypto";
}

export function investmentModeLabel(value) {
  return INVESTMENT_MODES.find((mode) => mode.value === normalizeInvestmentMode(value))?.label || "Crypto";
}

export function investmentRoute(value) {
  const mode = normalizeInvestmentMode(value);
  return `/dashboard/${mode === "stock" ? "stock" : mode}-investment`;
}
