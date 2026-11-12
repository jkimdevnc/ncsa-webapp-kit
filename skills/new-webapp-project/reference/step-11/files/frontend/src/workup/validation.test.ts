import { describe, expect, it } from "vitest";

import { valueError, type Variable } from "./validation";

const XCB: Variable = {
  code: "XCB",
  name: "Maximum cranial breadth",
  region: "Cranium",
  group: "Metric",
  unit: "mm",
  precision: 0.1,
  possible_range: { min: 100, max: 200 },
  range_source: "Figma wireframe 04",
};

describe("valueError", () => {
  it.each(["140", "140.5", " 140 ", "100", "200", "183."])("accepts %j inside the possible range", (text) => {
    expect(valueError(text, XCB)).toBeNull();
  });

  it.each(["312", "99.9", "200.1", "-5"])("rejects %j outside the possible range", (text) => {
    expect(valueError(text, XCB)).toBe("Not possible: outside 100–200 mm.");
  });

  it.each(["abc", "1,5", "12a", "."])("says %j is not a number", (text) => {
    expect(valueError(text, XCB)).toBe("Not a number.");
  });

  it("accepts an empty field", () => {
    expect(valueError("", XCB)).toBeNull();
    expect(valueError("  ", XCB)).toBeNull();
  });
});
