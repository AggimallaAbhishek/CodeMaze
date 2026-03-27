import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ResultOverlay from "../ResultOverlay";

describe("ResultOverlay", () => {
  it("renders score breakdown, badges, and replay link", () => {
    render(
      <MemoryRouter>
        <ResultOverlay
          replayHref="/replay/submission-1"
          result={{
            score: 90,
            stars: 3,
            user_steps: 5,
            optimal_steps: 4,
            xp_earned: 180,
            hints_used: 1,
            is_personal_best: true,
            diff: [],
            awarded_badges: [{ code: "first_clear", title: "First Clear" }],
            score_breakdown: {
              base_score: 80,
              time_bonus: 20,
              hint_penalty: 10
            }
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("First Clear")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review Replay" })).toHaveAttribute("href", "/replay/submission-1");
    expect(screen.getByText("Hint Penalty")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Round Result" })).toHaveFocus();
  });
});
