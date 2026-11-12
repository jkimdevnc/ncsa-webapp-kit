// The only module that touches localStorage (docs/decisions/0003). Workups stay on this device until Analyze; if they
// move to the server later, only this module changes.

export type Workup = {
  schema_version: 1;
  id: string;
  name: string;
  // What was typed, as text, keyed by variable code. Text keeps a half-typed value such as "183." across a reload.
  values: Record<string, string>;
};

const KEY = "mosaic:workup";

function isWorkup(data: unknown): data is Workup {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const w = data as Record<string, unknown>;
  return (
    w.schema_version === 1 &&
    typeof w.id === "string" &&
    typeof w.name === "string" &&
    typeof w.values === "object" &&
    w.values !== null &&
    Object.values(w.values).every((v) => typeof v === "string")
  );
}

// Storage can be unavailable (private mode, blocked, full) or hold something else: then there is no stored Workup.
export function loadWorkup(): Workup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return null;
    }
    const data: unknown = JSON.parse(raw);
    return isWorkup(data) ? data : null;
  } catch {
    return null;
  }
}

// If storage can't be written, the Workup still works for this visit; it just isn't kept.
export function saveWorkup(workup: Workup): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(workup));
  } catch {
    // Nothing else to do: the page keeps working without storage.
  }
}

export function newWorkup(): Workup {
  return { schema_version: 1, id: crypto.randomUUID(), name: "Untitled Workup", values: {} };
}
