import { GAME_MODE_META, GAME_MODE_ORDER, gameTypeLabel } from "./gameModes";

function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeProgressRatio(user) {
  const explicitRatio = numericValue(user?.progression?.progress_ratio);
  if (explicitRatio > 0) {
    return Math.max(0, Math.min(100, Math.round(explicitRatio * 100)));
  }

  const xpIntoLevel = numericValue(user?.progression?.xp_into_level);
  const xpForNextLevel = numericValue(user?.progression?.xp_for_next_level);
  if (!xpForNextLevel) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)));
}

function findBestRun(submissions = []) {
  return submissions.reduce((bestRun, current) => {
    if (!bestRun) {
      return current;
    }
    return numericValue(current.score) > numericValue(bestRun.score) ? current : bestRun;
  }, null);
}

export const PROFILE_RUN_FILTERS = [
  { value: "all", label: "All Runs" },
  { value: "sorting", label: "Sorting" },
  { value: "pathfinding", label: "Pathfinding" },
  { value: "graph_traversal", label: "Graph" }
];

export function filterSubmissionsByMode(submissions = [], mode = "all") {
  if (mode === "all") {
    return submissions;
  }
  return submissions.filter((submission) => submission.level?.game_type === mode);
}

export function buildProfileInsights(user, submissions = []) {
  const recentRuns = Array.isArray(submissions) ? submissions : [];
  const recentRunCount = recentRuns.length;
  const totalStars = recentRuns.reduce((sum, submission) => sum + numericValue(submission.stars), 0);
  const perfectClears = recentRuns.filter((submission) => numericValue(submission.stars) >= 3).length;
  const averageRecentScore = recentRunCount
    ? Math.round(recentRuns.reduce((sum, submission) => sum + numericValue(submission.score), 0) / recentRunCount)
    : 0;
  const bestRun = findBestRun(recentRuns);
  const progressRatio = computeProgressRatio(user);

  const modeCounts = GAME_MODE_ORDER.reduce((counts, gameType) => {
    counts[gameType] = recentRuns.filter((submission) => submission.level?.game_type === gameType).length;
    return counts;
  }, {});

  const dominantMode = GAME_MODE_ORDER.reduce((winner, gameType) => {
    if (!winner) {
      return gameType;
    }
    return modeCounts[gameType] > modeCounts[winner] ? gameType : winner;
  }, null);

  const dominantModeCount = dominantMode ? modeCounts[dominantMode] : 0;
  const resolvedDominantMode = dominantModeCount ? dominantMode : null;

  const heroStats = [
    {
      label: "Total XP",
      value: numericValue(user?.total_xp),
      helper: `Level ${numericValue(user?.progression?.level) || 1} operator`,
      accent: "cyan"
    },
    {
      label: "Validated Clears",
      value: numericValue(user?.stats?.solved_count),
      helper: `${numericValue(user?.stats?.personal_best_count)} personal best${numericValue(user?.stats?.personal_best_count) === 1 ? "" : "s"}`,
      accent: "magenta"
    },
    {
      label: "Recent Avg Score",
      value: averageRecentScore,
      helper: recentRunCount ? `${recentRunCount} logged run${recentRunCount === 1 ? "" : "s"}` : "Waiting for first recorded run",
      accent: "green"
    },
    {
      label: "XP To Next Level",
      value: numericValue(user?.progression?.xp_to_next_level),
      helper: `${progressRatio}% of current level complete`,
      accent: "violet"
    }
  ];

  const intelCards = [
    {
      label: "Account State",
      value: user?.is_verified ? "Verified" : "Pending",
      helper: user?.is_verified ? "Trusted operator profile active" : "Verification still pending"
    },
    {
      label: "Dominant Mode",
      value: resolvedDominantMode ? gameTypeLabel(resolvedDominantMode) : "Undeclared",
      helper: resolvedDominantMode
        ? `${modeCounts[resolvedDominantMode]} recent ${GAME_MODE_META[resolvedDominantMode].shortLabel.toLowerCase()} runs`
        : "Run more arenas to establish a signature mode"
    },
    {
      label: "Perfect Clears",
      value: perfectClears,
      helper: totalStars ? `${totalStars} stars collected across recent runs` : "Stars unlock after validated clears"
    }
  ];

  const masteryTracks = GAME_MODE_ORDER.map((gameType) => {
    const recentCount = modeCounts[gameType];
    return {
      key: gameType,
      label: gameTypeLabel(gameType),
      accent: GAME_MODE_META[gameType].theme,
      value: recentRunCount ? Math.round((recentCount / recentRunCount) * 100) : 0,
      helper: recentCount
        ? `${recentCount} recent validated ${recentCount === 1 ? "run" : "runs"}`
        : `No recent ${GAME_MODE_META[gameType].shortLabel.toLowerCase()} clears`
    };
  });

  const snapshotCards = [
    {
      label: "Best Score",
      value: numericValue(user?.stats?.best_score),
      helper: bestRun ? `Recent top: ${bestRun.level?.title ?? "Untitled run"}` : "No best run recorded yet"
    },
    {
      label: "Recent Best",
      value: bestRun ? numericValue(bestRun.score) : "—",
      helper: bestRun ? gameTypeLabel(bestRun.level?.game_type) : "No recent submissions"
    },
    {
      label: "Total Stars",
      value: totalStars,
      helper: `${perfectClears} perfect clear${perfectClears === 1 ? "" : "s"}`
    }
  ];

  return {
    progressRatio,
    perfectClears,
    totalStars,
    averageRecentScore,
    bestRun,
    dominantMode: resolvedDominantMode,
    heroStats,
    intelCards,
    masteryTracks,
    snapshotCards
  };
}
