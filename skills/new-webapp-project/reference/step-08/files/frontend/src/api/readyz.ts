// The API's readiness, for the status panel. Step 9 replaces this with the typed client generated from OpenAPI.

export type Readyz = {
  status: "ready" | "not ready";
  redis: "ok" | "down";
  model: "loaded" | "not loaded";
  model_id: string;
  model_version: string;
  version: string;
};

// 503 still carries the details (which part is down), so only an unreachable API or a non-readyz reply throws.
export async function fetchReadyz(): Promise<Readyz> {
  const response = await fetch("/api/v1/readyz");
  if (!response.ok && response.status !== 503) {
    throw new Error(`readyz returned ${response.status}`);
  }
  const body = await response.json();
  if (typeof body?.status !== "string") {
    throw new Error("readyz returned an unexpected reply");
  }
  return body as Readyz;
}
