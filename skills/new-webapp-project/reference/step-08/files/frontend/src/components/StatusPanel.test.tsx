import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Readyz } from "../api/readyz";
import StatusPanel from "./StatusPanel";

const READY: Readyz = {
  status: "ready",
  redis: "ok",
  model: "loaded",
  model_id: "cranial-demo",
  model_version: "0.1.0",
  version: "0.1.0",
};

function mockReadyz(status: number, body: Partial<Readyz>) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...READY, ...body }, { status })));
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StatusPanel />
    </QueryClientProvider>,
  );
}

describe("StatusPanel", () => {
  it("shows API ok, Redis ok and Model loaded when the API is ready", async () => {
    mockReadyz(200, {});
    renderPanel();

    expect(await screen.findByLabelText("API")).toHaveTextContent("ok");
    expect(screen.getByLabelText("Redis")).toHaveTextContent("ok");
    expect(screen.getByLabelText("Model")).toHaveTextContent("loaded");
    expect(screen.getByText(/cranial-demo/)).toHaveTextContent("0.1.0");
  });

  it("shows which part is down when Redis is down (503)", async () => {
    mockReadyz(503, { status: "not ready", redis: "down" });
    renderPanel();

    expect(await screen.findByLabelText("API")).toHaveTextContent("not ready");
    expect(screen.getByLabelText("Redis")).toHaveTextContent("down");
    expect(screen.getByLabelText("Model")).toHaveTextContent(/^loaded$/);
  });

  it("shows the model is not loaded (503)", async () => {
    mockReadyz(503, { status: "not ready", model: "not loaded" });
    renderPanel();

    expect(await screen.findByLabelText("Model")).toHaveTextContent("not loaded");
    expect(screen.getByLabelText("API")).toHaveTextContent("not ready");
  });

  it("shows the API is unreachable on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderPanel();

    expect(await screen.findByLabelText("API")).toHaveTextContent("unreachable");
    expect(screen.queryByLabelText("Redis")).not.toBeInTheDocument();
  });

  it("shows the API is unreachable when the dev proxy can't reach it (502, no readyz body)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 502 })));
    renderPanel();

    expect(await screen.findByLabelText("API")).toHaveTextContent("unreachable");
  });
});
