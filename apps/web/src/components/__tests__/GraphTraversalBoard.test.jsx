import { fireEvent, render, screen } from "@testing-library/react";

import GraphTraversalBoard from "../GraphTraversalBoard";

describe("GraphTraversalBoard", () => {
  it("renders nodes and allows visiting unvisited nodes", () => {
    const onVisitNode = vi.fn();

    render(
      <GraphTraversalBoard
        adjacency={{
          A: ["B"],
          B: []
        }}
        positions={{
          A: [30, 30],
          B: [70, 70]
        }}
        visitedNodes={["A"]}
        startNode="A"
        nextExpected="B"
        onVisitNode={onVisitNode}
        disabled={false}
      />
    );

    expect(screen.getByRole("button", { name: "Visit node A" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Visit node B" }));
    expect(onVisitNode).toHaveBeenCalledWith("B");
  });
});
