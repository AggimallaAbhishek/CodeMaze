import { areAdjacent, buildPathMoves, isSameCell, isWalkable, toCellKey } from "../pathfinding";

describe("pathfinding utilities", () => {
  it("computes stable cell keys", () => {
    expect(toCellKey([2, 3])).toBe("2:3");
  });

  it("detects same cell and adjacency", () => {
    expect(isSameCell([1, 1], [1, 1])).toBe(true);
    expect(isSameCell([1, 1], [1, 2])).toBe(false);
    expect(areAdjacent([1, 1], [1, 2])).toBe(true);
    expect(areAdjacent([1, 1], [2, 2])).toBe(false);
  });

  it("checks walkability", () => {
    const grid = [
      [0, 1],
      [0, 0]
    ];
    expect(isWalkable(grid, [0, 0])).toBe(true);
    expect(isWalkable(grid, [0, 1])).toBe(false);
    expect(isWalkable(grid, [3, 3])).toBe(false);
  });

  it("builds submission payload moves", () => {
    expect(
      buildPathMoves([
        [0, 0],
        [0, 1]
      ])
    ).toEqual([
      { type: "path_cell", cell: [0, 0] },
      { type: "path_cell", cell: [0, 1] }
    ]);
  });
});
