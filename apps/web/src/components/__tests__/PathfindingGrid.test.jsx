import { fireEvent, render, screen } from "@testing-library/react";

import PathfindingGrid from "../PathfindingGrid";

describe("PathfindingGrid", () => {
  it("allows selecting open cells and blocks wall cells", () => {
    const onSelectCell = vi.fn();

    render(
      <PathfindingGrid
        grid={[
          [0, 1],
          [0, 0]
        ]}
        weights={[]}
        pathCells={[[0, 0]]}
        optimalPathCells={[]}
        start={[0, 0]}
        end={[1, 1]}
        weighted={false}
        onSelectCell={onSelectCell}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cell 2,1" }));
    expect(onSelectCell).toHaveBeenCalledWith([1, 0]);

    expect(screen.getByRole("button", { name: "Cell 1,2 blocked" })).toBeDisabled();
  });
});
