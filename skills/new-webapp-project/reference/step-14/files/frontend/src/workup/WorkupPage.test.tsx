import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    variable("XCB", "Maximum cranial breadth", 100, 200),
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WorkupPage />
    </QueryClientProvider>,
  );
}

const type = (field: HTMLElement, text: string) => fireEvent.change(field, { target: { value: text } });

// The API as the page sees it: the dictionary, and an empty run log for the new Workup.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) =>
      new URL(request.url).pathname.endsWith("/analyses") ? Response.json([]) : Response.json(DICTIONARY),
    ),
  );
});

afterEach(() => {
  localStorage.clear();
});

describe("WorkupPage", () => {
  it("builds one field per dictionary variable, in a Cranium · Metric section", async () => {
    renderPage();

    const section = await screen.findByRole("region", { name: "Cranium · Metric" });
    expect(section).toContainElement(screen.getByRole("textbox", { name: /Glabello-occipital length GOL/ }));
    expect(section).toContainElement(screen.getByRole("textbox", { name: /Maximum cranial breadth XCB/ }));
  });

  it("shows the Not possible error for a value outside the range, and clears it when fixed", async () => {
    renderPage();
    const xcb = await screen.findByRole("textbox", { name: /XCB/ });

    type(xcb, "312");
    expect(xcb).toHaveAttribute("aria-invalid", "true");
    expect(xcb).toHaveAccessibleDescription("Not possible: outside 100–200 mm.");

    type(xcb, "140");
    expect(xcb).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText(/Not possible/)).not.toBeInTheDocument();
  });

  it("saves the name and values in the browser, and shows them again after a remount", async () => {
    const { unmount } = renderPage();
    type(screen.getByRole("textbox", { name: "Workup name" }), "MSUFAL016-26");
    type(await screen.findByRole("textbox", { name: /GOL/ }), "183");
    type(screen.getByRole("textbox", { name: /XCB/ }), "312");

    expect(loadWorkup()).toMatchObject({ name: "MSUFAL016-26", values: { GOL: "183", XCB: "312" } });

    unmount();
    renderPage();
    expect(screen.getByRole("textbox", { name: "Workup name" })).toHaveValue("MSUFAL016-26");
    expect(await screen.findByRole("textbox", { name: /GOL/ })).toHaveValue("183");
    expect(screen.getByText("Not possible: outside 100–200 mm.")).toBeInTheDocument();
  });

  // Changed in Step 12 (was: exactly one call, the dictionary). The page now also loads the run log, a GET with the
  // Workup's id and no values; the promise stays that typing sends nothing.
  it("sends nothing while typing: only GETs, and no request carries the values", async () => {
    renderPage();
    type(await screen.findByRole("textbox", { name: /GOL/ }), "183.7");
    type(screen.getByRole("textbox", { name: /XCB/ }), "140.3");

    const requests = vi.mocked(fetch).mock.calls.map(([request]) => request as Request);
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      expect(request.method).toBe("GET");
      expect(request.url).not.toMatch(/183\.7|140\.3/);
    }
  });

  it("says so when the dictionary can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the variables");
  });

  // Review finding #2: each tab saved its own copy of the Workup, so the last tab to save undid the other's edits.
  it("takes the Workup another tab saved, and keeps that tab's edits on the next save here", async () => {
    renderPage();
    type(await screen.findByRole("textbox", { name: /GOL/ }), "183");
    const id = loadWorkup()!.id;

    // The other tab adds XCB and renames the Workup, then the browser tells this tab.
    localStorage.setItem(
      "mosaic:workup",
      JSON.stringify({ schema_version: 1, id, name: "From the other tab", values: { GOL: "183", XCB: "140" } }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "mosaic:workup" }));
    });

    expect(screen.getByRole("textbox", { name: "Workup name" })).toHaveValue("From the other tab");
    expect(screen.getByRole("textbox", { name: /XCB/ })).toHaveValue("140");

    type(screen.getByRole("textbox", { name: /GOL/ }), "184");
    expect(loadWorkup()).toMatchObject({ name: "From the other tab", values: { GOL: "184", XCB: "140" } });
  });
});
