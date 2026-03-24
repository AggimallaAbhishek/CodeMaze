import { applySwap, isSorted } from "../sorting";

describe("sorting utilities", () => {
  it("applies swap correctly", () => {
    expect(applySwap([3, 1, 2], 0, 1)).toEqual([1, 3, 2]);
  });

  it("detects sorted arrays", () => {
    expect(isSorted([1, 2, 3])).toBe(true);
    expect(isSorted([2, 1, 3])).toBe(false);
  });
});
