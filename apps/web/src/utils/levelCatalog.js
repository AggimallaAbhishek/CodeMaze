import { GAME_MODE_META, GAME_MODE_ORDER } from "./gameModes";

function toDifficultyNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortLevels(items = []) {
  return [...items].sort((left, right) => Number(left.order_index ?? 0) - Number(right.order_index ?? 0));
}

function chooseFeaturedLevel(items = []) {
  return [...items].sort((left, right) => {
    const difficultyDelta = toDifficultyNumber(right.difficulty) - toDifficultyNumber(left.difficulty);
    if (difficultyDelta !== 0) {
      return difficultyDelta;
    }
    return Number(left.order_index ?? 0) - Number(right.order_index ?? 0);
  })[0] ?? null;
}

function formatDifficultyRange(items = []) {
  const difficulties = items.map((item) => toDifficultyNumber(item.difficulty)).filter((value) => value > 0);
  if (!difficulties.length) {
    return "Difficulty pending";
  }

  const minimum = Math.min(...difficulties);
  const maximum = Math.max(...difficulties);
  return minimum === maximum ? `Difficulty ${minimum}` : `Difficulty ${minimum}-${maximum}`;
}

function averageDifficulty(items = []) {
  const difficulties = items.map((item) => toDifficultyNumber(item.difficulty)).filter((value) => value > 0);
  if (!difficulties.length) {
    return "—";
  }
  const average = difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length;
  return average.toFixed(1);
}

export function groupLevelsByGameType(levels = []) {
  return GAME_MODE_ORDER.reduce((groups, gameType) => {
    groups[gameType] = sortLevels(levels.filter((level) => level.game_type === gameType));
    return groups;
  }, {});
}

export function buildLevelCatalogData(levels = []) {
  const groupedLevels = groupLevelsByGameType(levels);
  const activeModes = GAME_MODE_ORDER.filter((gameType) => groupedLevels[gameType].length).length;
  const eliteDecks = levels.filter((level) => toDifficultyNumber(level.difficulty) >= 4).length;
  const highestDifficulty = levels.reduce((highest, level) => Math.max(highest, toDifficultyNumber(level.difficulty)), 0);

  const summary = [
    {
      label: "Live Challenges",
      value: levels.length,
      detail: `${activeModes || 0} active mode lanes`
    },
    {
      label: "Mode Families",
      value: activeModes,
      detail: "Sorting, pathfinding, graph traversal"
    },
    {
      label: "Elite Decks",
      value: eliteDecks,
      detail: "Difficulty 4 and above"
    },
    {
      label: "Peak Difficulty",
      value: highestDifficulty || "—",
      detail: highestDifficulty ? "Highest seeded challenge tier" : "Waiting for seeded difficulty"
    }
  ];

  const spotlight = GAME_MODE_ORDER.map((gameType) => {
    const meta = GAME_MODE_META[gameType];
    const items = groupedLevels[gameType];
    const featuredLevel = chooseFeaturedLevel(items);

    return {
      ...meta,
      count: items.length,
      items,
      featuredLevel,
      primaryLevel: items[0] ?? featuredLevel,
      featuredTitle: featuredLevel?.title ?? `No ${meta.shortLabel.toLowerCase()} deck online`,
      difficultyLabel: formatDifficultyRange(items),
      averageDifficulty: averageDifficulty(items),
      queue: items.slice(0, 3)
    };
  });

  return {
    groupedLevels,
    spotlight,
    summary,
    defaultSpotlight: spotlight.find((item) => item.count)?.key ?? GAME_MODE_ORDER[0]
  };
}
