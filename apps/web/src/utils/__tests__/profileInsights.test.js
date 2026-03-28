import { describe, expect, it } from "vitest";

import { buildProfileInsights, filterSubmissionsByMode } from "../profileInsights";

const user = {
  total_xp: 1240,
  is_verified: true,
  progression: {
    level: 5,
    xp_into_level: 120,
    xp_for_next_level: 200,
    xp_to_next_level: 80
  },
  stats: {
    solved_count: 7,
    best_score: 100,
    personal_best_count: 3
  }
};

const submissions = [
  {
    id: "sub-1",
    score: 95,
    stars: 3,
    level: { game_type: "sorting", title: "Bubble 1" }
  },
  {
    id: "sub-2",
    score: 85,
    stars: 2,
    level: { game_type: "sorting", title: "Bubble 2" }
  },
  {
    id: "sub-3",
    score: 100,
    stars: 3,
    level: { game_type: "pathfinding", title: "Maze 1" }
  }
];

describe("profileInsights", () => {
  it("derives dashboard hero stats and mastery tracks from user and recent submissions", () => {
    const insights = buildProfileInsights(user, submissions);

    expect(insights.progressRatio).toBe(60);
    expect(insights.perfectClears).toBe(2);
    expect(insights.totalStars).toBe(8);
    expect(insights.averageRecentScore).toBe(93);
    expect(insights.dominantMode).toBe("sorting");
    expect(insights.heroStats[0]).toMatchObject({ label: "Total XP", value: 1240 });
    expect(insights.masteryTracks.find((track) => track.key === "sorting")).toMatchObject({ value: 67 });
  });

  it("filters submissions by game mode without mutating the original list", () => {
    expect(filterSubmissionsByMode(submissions, "all")).toHaveLength(3);
    expect(filterSubmissionsByMode(submissions, "sorting")).toHaveLength(2);
    expect(filterSubmissionsByMode(submissions, "graph_traversal")).toHaveLength(0);
    expect(submissions).toHaveLength(3);
  });
});
