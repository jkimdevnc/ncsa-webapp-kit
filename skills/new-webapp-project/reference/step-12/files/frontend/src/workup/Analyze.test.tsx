import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnalysisRecord } from "../api/analyses";
import type { Dictionary } from "../api/dictionary";
import { loadWorkup } from "../storage/workupStore";
import WorkupPage from "./WorkupPage";

const variable = (code: string, name: string, min: number, max: number) => ({
  code,
  name,
  region: "Cranium",
  group: "Metric",
  unit: "mm",
  precision: 0.1,
  possible_range: { min, max },
  range_source: "test",
});

const DICTIONARY: Dictionary = {
  dictionary_version: "0.1.0",
  variables: [
    variable("GOL", "Glabello-occipital length", 150, 220),
    variable("NOL", "Nasio-occipital length", 150, 220),
    variable("XCB", "Maximum cranial breadth", 100, 200),
  ],
};

const OUTPUTS = { cranial_index: 76.5, cranial_class: "mesocranic" };

// A small fake API: the dictionary, Analyze, and a run log that grows with each successful Analyze.
// `analyzeReply` overrides Analyze's reply, e.g. a 422.
function fakeApi(analyzeReply?: () => Response | Promise<Response>) {
  const runLog: AnalysisRecord[] = [];
  const posts: unknown[] = [];
  const fetch = vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && path === "/api/v1/analyses") {
      const body = await request.json();
      posts.push(body);
      if (analyzeReply) {
        return analyzeReply();
      }
      const id = `run${runLog.length + 1}`;
      runLog.push({
        schema_version: 1,
        id,
        workup_id: body.workup_id,
        owner: "anonymous",
        created_at: new Date().toISOString(),
        model_id: "cranial-demo",
        model_version: "0.1.0",
        dictionary_version: "0.1.0",
        variables_used: ["GOL", "XCB"],
        outputs: OUTPUTS,
      });
      return Response.json({ id, status: "succeeded", result: OUTPUTS, error: null });
    }
    if (path.endsWith("/analyses")) {
      return Response.json(runLog);
    }
    return Response.json(DICTIONARY);
  });
  vi.stubGlobal("fetch", fetch);
  return { posts };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkupPage />
    </QueryClientProvider>,
  );
}

const type = (field: HTMLElement, text: string) => fireEvent.change(field, { target: { value: text } });

async function enter(values: Record<string, string>) {
  for (const [code, text] of Object.entries(values)) {
    type(await screen.findByRole("textbox", { name: new RegExp(code) }), text);
  }
}

const analyzeButton = () => screen.getByRole("button", { name: "Analyze" });

afterEach(() => {
  localStorage.clear();
});

describe("Analyze", () => {
  it.each([
    ["GOL is empty", { XCB: "140" }],
    ["XCB is empty", { GOL: "183" }],
    ["XCB is out of range", { GOL: "183", XCB: "312" }],
    ["another field shows an error", { GOL: "183", XCB: "140", NOL: "999" }],
    ["a value isn't a number", { GOL: "183", XCB: "14o" }],
  ])("is disabled when %s", async (_, values) => {
    fakeApi();
    renderPage();
    await enter(values);

    expect(analyzeButton()).toBeDisabled();
  });

  it("is enabled when GOL and XCB are valid", async () => {
    fakeApi();
    renderPage();
    await enter({ GOL: "183", XCB: "140" });

    expect(analyzeButton()).toBeEnabled();
  });

  it("sends only the Workup id, the model and GOL and XCB as numbers, then shows the result and the run log", async () => {
    const { posts } = fakeApi();
    renderPage();
    await enter({ GOL: "183", XCB: "140", NOL: "180" });
    expect(await screen.findByText("No runs yet.")).toBeInTheDocument();

    fireEvent.click(analyzeButton());

    const result = await screen.findByRole("region", { name: "Result" });
    expect(within(result).getByText("Cranial class").nextElementSibling).toHaveTextContent("mesocranic");
    expect(within(result).getByText("Cranial index").nextElementSibling).toHaveTextContent("76.5");
    expect(posts).toEqual([{ workup_id: loadWorkup()!.id, model_id: "cranial-demo", values: { GOL: 183, XCB: 140 } }]);
    const log = await screen.findByRole("list", { name: "Run log" });
    expect(within(log).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(analyzeButton());
    await waitFor(() => expect(within(log).getAllByRole("listitem")).toHaveLength(2));
  });

  it("shows the API's messages on a 422", async () => {
    fakeApi(() =>
      Response.json(
        {
          detail: [
            { loc: ["body", "values", "XCB"], msg: "XCB is not possible: outside 100–200 mm", type: "value_error" },
          ],
        },
        { status: 422 },
      ),
    );
    renderPage();
    await enter({ GOL: "183", XCB: "140" });

    fireEvent.click(analyzeButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("XCB is not possible: outside 100–200 mm");
    expect(screen.queryByRole("region", { name: "Result" })).not.toBeInTheDocument();
  });

  it("says the API can't be reached on a network error, and keeps the entered values", async () => {
    fakeApi(() => Promise.reject(new TypeError("Failed to fetch")));
    renderPage();
    await enter({ GOL: "183", XCB: "140" });

    fireEvent.click(analyzeButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the API.");
    expect(screen.getByRole("textbox", { name: /GOL/ })).toHaveValue("183");
  });
});
