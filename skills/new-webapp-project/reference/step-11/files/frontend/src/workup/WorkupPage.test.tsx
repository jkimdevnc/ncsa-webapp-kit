import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(DICTIONARY)),
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

  it("calls the API only to load the dictionary, never while typing", async () => {
    renderPage();
    type(await screen.findByRole("textbox", { name: /GOL/ }), "183");
    type(screen.getByRole("textbox", { name: /XCB/ }), "140");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("says so when the dictionary can't be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the variables");
  });
});
