import { fireEvent, render, screen } from "@testing-library/react";

import GraphTraversalBoard from "../GraphTraversalBoard";

describe("GraphTraversalBoard", () => {
  it("renders nodes responsively and allows visiting unvisited nodes", () => {
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

    const visitedButton = screen.getByRole("button", { name: /Visit node A/ });
    const nextButton = screen.getByRole("button", { name: /Visit node B/ });

    expect(visitedButton).toBeDisabled();
    expect(nextButton).toHaveStyle({ left: "70%", top: "70%" });

    fireEvent.click(nextButton);
    expect(onVisitNode).toHaveBeenCalledWith("B");
  });
});
