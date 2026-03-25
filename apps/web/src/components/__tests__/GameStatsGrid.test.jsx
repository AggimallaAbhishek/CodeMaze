import { render, screen } from "@testing-library/react";

import GameStatsGrid from "../GameStatsGrid";

describe("GameStatsGrid", () => {
  it("renders metric labels and values", () => {
    render(
      <GameStatsGrid
        stats={[
          { label: "Moves", value: 3 },
          { label: "Timer", value: "12s", note: "active" }
        ]}
      />
    );

    expect(screen.getByLabelText("Game round stats")).toBeInTheDocument();
    expect(screen.getByText("Moves")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Timer")).toBeInTheDocument();
    expect(screen.getByText("12s")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });
});
