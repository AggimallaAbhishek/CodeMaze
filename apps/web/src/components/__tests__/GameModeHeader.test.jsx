import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import GameModeHeader from "../GameModeHeader";

describe("GameModeHeader", () => {
  it("renders tag, title, mode chip, and back link", () => {
    render(
      <MemoryRouter>
        <GameModeHeader
          tag="Sorting Arena"
          title="Sorting Test"
          subtitle="Round subtitle"
          modeLabel="Algorithm"
          modeValue="selection"
          backHref="/levels"
          backLabel="Back"
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Sorting Arena")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sorting Test" })).toBeInTheDocument();
    expect(screen.getByText("Algorithm:", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/levels");
  });
});
