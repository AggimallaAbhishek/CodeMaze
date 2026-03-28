export const GAME_MODE_ORDER = ["sorting", "pathfinding", "graph_traversal"];

export const GAME_MODE_META = {
  sorting: {
    key: "sorting",
    label: "Sorting",
    shortLabel: "Sort",
    accent: "sorting",
    theme: "cyan",
    icon: "📊",
    eyebrow: "Comparator arena",
    headline: "Tighten raw comparisons into cleaner, faster clears.",
    description: "Precision swaps, comparison tracking, and replay-backed validation for every run.",
    emptyCopy: "No sorting decks are seeded in this environment yet."
  },
  pathfinding: {
    key: "pathfinding",
    label: "Pathfinding",
    shortLabel: "Maze",
    accent: "pathfinding",
    theme: "magenta",
    icon: "🗺️",
    eyebrow: "Route lab",
    headline: "Map the shortest route before the maze maps you.",
    description: "Weighted and unweighted route planning with optimal-path comparison and replayable feedback.",
    emptyCopy: "No maze runs are seeded in this environment yet."
  },
  graph_traversal: {
    key: "graph_traversal",
    label: "Graph Traversal",
    shortLabel: "Graph",
    accent: "graph",
    theme: "green",
    icon: "🔗",
    eyebrow: "Traversal lab",
    headline: "Walk the frontier in the exact order the solver expects.",
    description: "Canonical BFS and DFS drills with replay-backed validation and teaching cues.",
    emptyCopy: "No graph labs are seeded in this environment yet."
  }
};

export function gameTypeLabel(gameType) {
  return GAME_MODE_META[gameType]?.label ?? gameType;
}

export function gameTypeActionLabel(gameType) {
  if (gameType === "sorting") {
    return "Play Sorting";
  }
  if (gameType === "pathfinding") {
    return "Play Maze";
  }
  if (gameType === "graph_traversal") {
    return "Play Graph";
  }
  return "Play";
}
