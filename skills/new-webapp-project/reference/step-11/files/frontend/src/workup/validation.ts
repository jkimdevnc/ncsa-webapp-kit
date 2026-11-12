import type { components } from "../api/schema";

export type Variable = components["schemas"]["Variable"];

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;

// The error to show for a typed value, or null when it's fine. Empty is fine: it isn't recorded yet.
// The possible range's limits are allowed, as on the API (backend/app/analyses.py).
export function valueError(text: string, variable: Variable): string | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  if (!NUMBER.test(trimmed)) {
    return "Not a number.";
  }
  const value = Number(trimmed);
  const { min, max } = variable.possible_range;
  if (value < min || value > max) {
    return `Not possible: outside ${min}–${max} ${variable.unit}.`;
  }
  return null;
}
