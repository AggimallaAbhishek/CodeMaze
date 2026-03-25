import { buildReplayRows, describeMove } from "../replay";

describe("replay utilities", () => {
  it("formats different move types into readable labels", () => {
    expect(describeMove({ type: "swap", indices: [0, 2] })).toBe("Swap 1 <-> 3");
    expect(describeMove({ type: "path_cell", cell: [1, 2] })).toBe("Cell 2,3");
    expect(describeMove({ type: "graph_visit", node: "B" })).toBe("Visit B");
  });

  it("builds aligned replay rows with mismatch state", () => {
    expect(
      buildReplayRows(
        [{ type: "swap", indices: [0, 1] }],
        [{ type: "swap", indices: [1, 2] }],
        [{ step: 1, correct: false }]
      )
    ).toEqual([
      {
        step: 1,
        userMove: { type: "swap", indices: [0, 1] },
        optimalMove: { type: "swap", indices: [1, 2] },
        userLabel: "Swap 1 <-> 2",
        optimalLabel: "Swap 2 <-> 3",
        status: "mismatch"
      }
    ]);
  });
});
