import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import ArenaShowcase from "../ArenaShowcase";

describe("ArenaShowcase", () => {
  const featuredLevels = {
    sorting: { id: "sorting-level", game_type: "sorting" },
    pathfinding: { id: "path-level", game_type: "pathfinding" },
    graph_traversal: { id: "graph-level", game_type: "graph_traversal" }
  };

  it("switches preview tabs and updates the launch link", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ArenaShowcase featuredLevels={featuredLevels} isAuthenticated />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Sorting Command Center" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Launch Live Challenge" })).toHaveAttribute(
      "href",
      "/levels/sorting-level/sorting"
    );

    await user.click(screen.getByRole("tab", { name: "Pathfinding" }));

    expect(screen.getByRole("heading", { name: "Maze Routing Bay" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Launch Live Challenge" })).toHaveAttribute(
      "href",
      "/levels/path-level/pathfinding"
    );
  });
});
