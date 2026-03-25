import { buildGraphMoves, canonicalTraversal, traversalTeachingState } from "../graph";

describe("graph utilities", () => {
  const adjacency = {
    A: ["B", "C"],
    B: ["D"],
    C: [],
    D: []
  };

  it("builds graph visit payloads", () => {
    expect(buildGraphMoves(["A", "B"])).toEqual([
      { type: "graph_visit", node: "A" },
      { type: "graph_visit", node: "B" }
    ]);
  });

  it("computes canonical bfs and dfs order", () => {
    expect(canonicalTraversal(adjacency, "A", "bfs")).toEqual(["A", "B", "C", "D"]);
    expect(canonicalTraversal(adjacency, "A", "dfs")).toEqual(["A", "B", "D", "C"]);
  });

  it("provides teaching panel state", () => {
    const bfsState = traversalTeachingState(adjacency, "A", "bfs", 1);
    expect(bfsState.containerType).toBe("queue");
    expect(bfsState.nextExpected).toBe("B");

    const dfsState = traversalTeachingState(adjacency, "A", "dfs", 1);
    expect(dfsState.containerType).toBe("stack");
    expect(dfsState.nextExpected).toBe("B");
  });
});
