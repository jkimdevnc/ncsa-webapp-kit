// The data dictionary: which variables exist and their possible ranges. The Workup's fields are built from it.
import { client } from "./client";
import type { components } from "./schema";

export type Dictionary = components["schemas"]["Dictionary"];

export async function fetchDictionary(): Promise<Dictionary> {
  const { data, response } = await client.GET("/api/v1/dictionary");
  if (!data) {
    throw new Error(`dictionary returned ${response.status}`);
  }
  return data;
}
