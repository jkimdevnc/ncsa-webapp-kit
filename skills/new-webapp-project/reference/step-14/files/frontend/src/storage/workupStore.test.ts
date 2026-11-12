import { afterEach, describe, expect, it, vi } from "vitest";

import { loadWorkup, newWorkup, saveWorkup } from "./workupStore";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("workupStore", () => {
  it("saves a Workup and loads it back", () => {
    const workup = { ...newWorkup(), name: "MSUFAL016-26", values: { GOL: "183", XCB: "312" } };

    saveWorkup(workup);

    expect(loadWorkup()).toEqual(workup);
  });

  it("returns null when nothing is stored", () => {
    expect(loadWorkup()).toBeNull();
  });

  it.each(["not json", "null", '{"name":"x"}', '{"schema_version":1,"id":"a","name":"x","values":{"GOL":183}}'])(
    "returns null when the stored data is broken: %s",
    (raw) => {
      localStorage.setItem("mosaic:workup", raw);

      expect(loadWorkup()).toBeNull();
    },
  );

  it("doesn't throw when localStorage can't be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(loadWorkup()).toBeNull();
  });

  it("doesn't throw when localStorage can't be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(() => saveWorkup(newWorkup())).not.toThrow();
  });

  it("gives each new Workup its own id the API accepts as a workup_id", () => {
    const a = newWorkup();
    const b = newWorkup();

    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });

  // Review finding #1: crypto.randomUUID is missing over plain HTTP on a host other than localhost.
  it("makes valid ids without crypto.randomUUID (not a secure context)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const ids = new Set(Array.from({ length: 50 }, () => newWorkup().id));

    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  // Review finding #3: the API rejects a workup_id outside this pattern, so Analyze would always fail.
  it.each(["w 1", "x".repeat(65), "", "a/b"])("gives a stored Workup with a bad id (%j) a new id", (badId) => {
    localStorage.setItem(
      "mosaic:workup",
      JSON.stringify({ schema_version: 1, id: badId, name: "Kept", values: { GOL: "183" } }),
    );

    const workup = loadWorkup();

    expect(workup).toMatchObject({ name: "Kept", values: { GOL: "183" } });
    expect(workup!.id).toMatch(/^[A-Za-z0-9-]{1,64}$/);
  });
});
