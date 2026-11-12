// Analyze and the run log. The entered values leave the browser only here, in the Analyze request
// (docs/decisions/0003); the run log carries results, never values.
import { client } from "./client";
import type { components } from "./schema";

export type AnalysisResponse = components["schemas"]["AnalysisResponse"];
export type AnalysisRecord = components["schemas"]["AnalysisRecord"];

// The model to run and the variables it needs, as in backend/app/model_catalog.py. Only these values are sent.
// The API's 422 is the real guard; a `GET /models` endpoint can replace these constants later.
export const MODEL_ID = "cranial-demo";
export const MODEL_INPUTS = ["GOL", "XCB"] as const;

// An Analyze that didn't succeed, with messages to show the user.
export class AnalyzeError extends Error {
  constructor(readonly messages: string[]) {
    super(messages.join(" "));
  }
}

export async function analyze(workupId: string, values: Record<string, number>): Promise<AnalysisResponse> {
  let result;
  try {
    result = await client.POST("/api/v1/analyses", { body: { workup_id: workupId, model_id: MODEL_ID, values } });
  } catch {
    throw new AnalyzeError(["Couldn't reach the API."]);
  }
  const { data, error, response } = result;
  if (data) {
    return data;
  }
  if (response.status === 422 && Array.isArray(error?.detail)) {
    throw new AnalyzeError(error.detail.map((d) => d.msg));
  }
  throw new AnalyzeError([`The analysis failed (status ${response.status}).`]);
}

export async function fetchRunLog(workupId: string): Promise<AnalysisRecord[]> {
  const { data, response } = await client.GET("/api/v1/workups/{workup_id}/analyses", {
    params: { path: { workup_id: workupId } },
  });
  if (!data) {
    throw new Error(`run log returned ${response.status}`);
  }
  return data;
}
