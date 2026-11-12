// The one API client. Its types are generated from the API's OpenAPI spec (`make gen-api`, docs/decisions/0004), so
// a backend change that breaks the frontend shows up as a type error.
import createClient from "openapi-fetch";

import type { paths } from "./schema";

export const client = createClient<paths>({
  baseUrl: window.location.origin,
  // Look up fetch on each call rather than once, so tests can replace it.
  fetch: (request) => globalThis.fetch(request),
});
