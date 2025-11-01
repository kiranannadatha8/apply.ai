import type { CompensationRange } from "../types";

const formatCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const formatSalaryRange = (range?: CompensationRange) => {
  if (!range) return null;
  const min = formatCurrency.format(range.min);
  const max = formatCurrency.format(range.max);
  const cadence = range.cadence === "year" ? "year" : range.cadence;
  return `${min} - ${max} / ${cadence}`;
};
