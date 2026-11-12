import { useEffect, useState } from "react";

import { loadWorkup, newWorkup, saveWorkup, type Workup } from "../storage/workupStore";

// The Workup on this device. Every change is saved in the browser only; nothing goes to the API (docs/decisions/0003).
export function useWorkup() {
  const [workup, setWorkup] = useState<Workup>(() => loadWorkup() ?? newWorkup());

  useEffect(() => {
    saveWorkup(workup);
  }, [workup]);

  return {
    workup,
    setName: (name: string) => setWorkup((w) => ({ ...w, name })),
    setValue: (code: string, text: string) => setWorkup((w) => ({ ...w, values: { ...w.values, [code]: text } })),
  };
}
