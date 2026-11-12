// The API's readiness, for the status panel.
import { client } from "./client";
import type { components } from "./schema";

export type Readyz = components["schemas"]["Readyz"];

// 503 still carries the details (which part is down), so only an unreachable API or a non-readyz reply throws.
export async function fetchReadyz(): Promise<Readyz> {
  const { data, error, response } = await client.GET("/api/v1/readyz");
  if (data) {
    return data;
  }
  if (response.status === 503 && typeof error?.status === "string") {
    return error;
  }
  throw new Error(`readyz returned ${response.status}`);
}
