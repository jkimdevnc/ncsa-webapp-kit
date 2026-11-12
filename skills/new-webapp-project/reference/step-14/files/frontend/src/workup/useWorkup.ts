import { useEffect, useState } from "react";

import { loadWorkup, newWorkup, saveWorkup, watchWorkup, type Workup } from "../storage/workupStore";

// The Workup on this device. Every change is saved in the browser only; nothing goes to the API (docs/decisions/0003).
export function useWorkup() {
  const [workup, setWorkup] = useState<Workup>(() => loadWorkup() ?? newWorkup());

  useEffect(() => {
    saveWorkup(workup);
  }, [workup]);

  // Another tab saved the Workup: show its version, so the next save here doesn't undo that tab's edits.
  useEffect(() => watchWorkup(setWorkup), []);

  return {
    workup,
    setName: (name: string) => setWorkup((w) => ({ ...w, name })),
    setValue: (code: string, text: string) => setWorkup((w) => ({ ...w, values: { ...w.values, [code]: text } })),
  };
}
