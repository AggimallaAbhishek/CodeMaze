import { describe, expect, it } from "vitest";

import { buildLevelCatalogData, groupLevelsByGameType } from "../levelCatalog";

const levels = [
  { id: "sort-2", title: "Bubble 2", game_type: "sorting", difficulty: 2, order_index: 2 },
  { id: "sort-1", title: "Bubble 1", game_type: "sorting", difficulty: 1, order_index: 1 },
  { id: "maze-1", title: "Corridor", game_type: "pathfinding", difficulty: 4, order_index: 1 },
  { id: "graph-1", title: "Breadth Lab", game_type: "graph_traversal", difficulty: 3, order_index: 1 }
];

describe("levelCatalog", () => {
  it("groups levels by game type and preserves deck order", () => {
    const grouped = groupLevelsByGameType(levels);

    expect(grouped.sorting.map((level) => level.id)).toEqual(["sort-1", "sort-2"]);
    expect(grouped.pathfinding).toHaveLength(1);
    expect(grouped.graph_traversal).toHaveLength(1);
  });

  it("builds spotlight and summary data for the catalog surface", () => {
    const catalog = buildLevelCatalogData(levels);

    expect(catalog.summary[0]).toMatchObject({ label: "Live Challenges", value: 4 });
    expect(catalog.summary[2]).toMatchObject({ label: "Elite Decks", value: 1 });
    expect(catalog.defaultSpotlight).toBe("sorting");

    expect(catalog.spotlight[0]).toMatchObject({
      key: "sorting",
      count: 2,
      featuredTitle: "Bubble 2",
      difficultyLabel: "Difficulty 1-2"
    });

    expect(catalog.spotlight[1]).toMatchObject({
      key: "pathfinding",
      averageDifficulty: "4.0"
    });
  });
});
