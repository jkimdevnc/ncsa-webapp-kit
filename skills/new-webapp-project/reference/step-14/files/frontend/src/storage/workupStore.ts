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

// The API accepts only these as a workup_id (backend/app/analyses.py, WORKUP_ID_PATTERN).
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

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
// A Workup whose id the API wouldn't accept keeps its name and values and gets a new id.
export function loadWorkup(): Workup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return null;
    }
    const data: unknown = JSON.parse(raw);
    if (!isWorkup(data)) {
      return null;
    }
    return ID_PATTERN.test(data.id) ? data : { ...data, id: newId() };
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

// Calls onChange with the Workup another tab of this browser just saved, so two open tabs don't overwrite each other.
// Returns a function that stops watching. Browsers send no event when the stored text doesn't change, so two tabs
// can't keep updating each other.
export function watchWorkup(onChange: (workup: Workup) => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key !== KEY) {
      return;
    }
    const workup = loadWorkup();
    if (workup) {
      onChange(workup);
    }
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

// A random UUID v4. crypto.randomUUID exists only in a secure context (HTTPS or localhost), so plain HTTP on another
// host name falls back to building one from crypto.getRandomValues, which works everywhere.
function newId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newWorkup(): Workup {
  return { schema_version: 1, id: newId(), name: "Untitled Workup", values: {} };
}
