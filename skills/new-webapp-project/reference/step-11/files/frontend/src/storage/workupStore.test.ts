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
});
