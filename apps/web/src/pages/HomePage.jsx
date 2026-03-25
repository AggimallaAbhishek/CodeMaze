import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ArenaShowcase from "../components/ArenaShowcase";
import CodeMazeCipherBanner from "../components/CodeMazeCipherBanner";
import ModeCard from "../components/ModeCard";
import PageFeedback from "../components/PageFeedback";
import { getGlobalLeaderboard, getLevels } from "../lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";

const leaderboardScopes = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all_time", label: "All-Time" }
];

const rewardRows = [
  { rank: "#1", icon: "👑", name: "Legend frame + exclusive seasonal badge", points: "10,000 XP" },
  { rank: "#2", icon: "🥈", name: "Silver frame + replay analyzer unlock", points: "5,000 XP" },
  { rank: "#3", icon: "🥉", name: "Bronze frame + skill booster pack", points: "2,500 XP" },
  { rank: "Top 10", icon: "⭐", name: "Elite border + leaderboard spotlight", points: "1,000 XP" }
];

function levelRoute(level) {
  if (!level) {
    return "/levels";
  }
  if (level.game_type === "sorting") {
    return `/levels/${level.id}/sorting`;
  }
  if (level.game_type === "pathfinding") {
    return `/levels/${level.id}/pathfinding`;
  }
  if (level.game_type === "graph_traversal") {
    return `/levels/${level.id}/graph-traversal`;
  }
  return "/levels";
}

function firstLevelByType(levels, gameType) {
  return levels.find((level) => level.game_type === gameType) ?? null;
}

function difficultyLabel(value) {
  if (value <= 2) {
    return "Beginner";
  }
  if (value === 3) {
    return "Intermediate";
  }
  return "Advanced";
}

function buildMasteryTracks(user) {
  const totalXp = user?.total_xp ?? 0;
  const badgeCodes = new Set((user?.badges ?? []).map((badge) => badge.code));
  const base = Math.min(55, Math.floor(totalXp / 18));

  return [
    {
      label: "Sorting Arenas",
      value: Math.min(96, 24 + base + (badgeCodes.has("sorting_scholar") ? 12 : 0)),
      accent: "cyan"
    },
    {
      label: "Pathfinding Mazes",
      value: Math.min(92, 18 + base + (badgeCodes.has("maze_mapper") ? 14 : 0)),
      accent: "magenta"
    },
    {
      label: "Graph Traversal",
      value: Math.min(94, 20 + base + (badgeCodes.has("graph_guru") ? 16 : 0)),
      accent: "green"
    }
  ];
}

export default function HomePage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [levels, setLevels] = useState([]);
  const [entries, setEntries] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [scope, setScope] = useState("weekly");
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLevels() {
      setLoadingLevels(true);
      try {
        const payload = await getLevels({ token: accessToken });
        if (!active) {
          return;
        }
        console.debug("home_levels_loaded", { count: payload.length });
        setLevels(payload);
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoadingLevels(false);
        }
      }
    }

    loadLevels();
    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      setLoadingLeaderboard(true);
      try {
        const payload = await getGlobalLeaderboard(scope, accessToken);
        if (!active) {
          return;
        }
        console.debug("home_leaderboard_loaded", { scope, count: payload.entries.length });
        setEntries(payload.entries.slice(0, 5));
        setUserRank(payload.user_rank ?? null);
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoadingLeaderboard(false);
        }
      }
    }

    loadLeaderboard();
    return () => {
      active = false;
    };
  }, [accessToken, scope]);

  const featuredLevels = useMemo(
    () => ({
      sorting: firstLevelByType(levels, "sorting"),
      pathfinding: firstLevelByType(levels, "pathfinding"),
      graph_traversal: firstLevelByType(levels, "graph_traversal")
    }),
    [levels]
  );

  const modeCards = useMemo(
    () => [
      {
        accent: "sorting",
        badge: featuredLevels.sorting ? difficultyLabel(featuredLevels.sorting.difficulty) : "Live",
        title: "Sorting Game",
        description:
          "Compare, swap, and optimize your move log across sorting rounds with replay-ready validation and score breakdowns.",
        stats: [
          featuredLevels.sorting ? `Difficulty ${featuredLevels.sorting.difficulty}` : "Live Mode",
          "Bubble • Selection • Quick"
        ],
        actionLabel: user ? "Play Sorting" : "Unlock Sorting",
        to: user ? levelRoute(featuredLevels.sorting) : "/register"
      },
      {
        accent: "pathfinding",
        badge: featuredLevels.pathfinding ? difficultyLabel(featuredLevels.pathfinding.difficulty) : "Live",
        title: "Pathfinding Challenge",
        description:
          "Plot contiguous routes through weighted and unweighted grids, then compare your path against the canonical solver.",
        stats: [
          featuredLevels.pathfinding ? `Difficulty ${featuredLevels.pathfinding.difficulty}` : "Live Mode",
          "BFS • Dijkstra"
        ],
        actionLabel: user ? "Play Maze" : "Unlock Mazes",
        to: user ? levelRoute(featuredLevels.pathfinding) : "/register"
      },
      {
        accent: "graph",
        badge: featuredLevels.graph_traversal ? difficultyLabel(featuredLevels.graph_traversal.difficulty) : "Live",
        title: "Graph Traversal",
        description:
          "Walk BFS and DFS orders on interactive graphs while the teaching panel exposes the exact frontier behavior.",
        stats: [
          featuredLevels.graph_traversal ? `Difficulty ${featuredLevels.graph_traversal.difficulty}` : "Live Mode",
          "BFS • DFS"
        ],
        actionLabel: user ? "Play Graph" : "Unlock Graphs",
        to: user ? levelRoute(featuredLevels.graph_traversal) : "/register"
      }
    ],
    [featuredLevels, user]
  );

  const heroStats = useMemo(
    () => [
      { label: "Live Modes", value: 3 },
      { label: "Seeded Levels", value: levels.length || 3 },
      { label: user ? "Unlocked Badges" : "Ranked Players", value: user ? user.badges?.length ?? 0 : entries.length || 5 }
    ],
    [entries.length, levels.length, user]
  );

  const masteryTracks = useMemo(() => buildMasteryTracks(user), [user]);
  const progressRatio = user?.progression?.xp_for_next_level
    ? Math.round(((user.progression.xp_into_level ?? 0) / user.progression.xp_for_next_level) * 100)
    : 62;
  const achievementCards = (user?.badges ?? []).slice(0, 4);

  return (
    <div className="home-shell">
      <section className="hero-shell" id="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="pulse-dot" />
              {user ? `Pilot ${user.username} — session locked and ready` : "Season ladder is live across all arenas"}
            </div>
            <h1 className="hero-title">
              <span>Master</span>
              <span>Algorithms</span>
              <span>Through Play.</span>
            </h1>
            <p className="hero-subtitle">
              Replicated from the supplied neon arena template, then adapted into the live CodeMaze platform for sorting,
              pathfinding, and graph traversal training.
            </p>
            <div className="hero-action-row">
              <Link className="primary-btn hero-cta" to={user ? "/levels" : "/register"}>
                {user ? "Open Challenge Deck" : "Start Your Run"}
              </Link>
              <a className="ghost-btn hero-ghost" href="#arena-showcase">
                Inspect Arena
              </a>
            </div>
            <div className="hero-stat-grid">
              {heroStats.map((item) => (
                <div key={item.label} className="hero-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <article className="hero-preview-card">
              <div className="hero-preview-header">
                <span className="hero-preview-title">
                  {(featuredLevels.sorting?.title ?? "Sorting Protocol").toUpperCase()}
                </span>
                <span className="hero-preview-badge">RUNNING</span>
              </div>
              <div className="preview-bars hero-bars">
                {[42, 66, 51, 88, 34, 74, 49, 63, 28, 80].map((value, index) => (
                  <span
                    key={`${value}-${index}`}
                    className={`preview-bar preview-bar-${(index % 5) + 1}`}
                    style={{ height: `${value}%`, animationDelay: `${index * 100}ms` }}
                  />
                ))}
              </div>
              <div className="preview-metrics">
                <span>Comparisons: {user?.stats?.submissions_count ?? 18}</span>
                <span>{featuredLevels.sorting?.game_type === "sorting" ? "Sorting live..." : "Arena ready"}</span>
              </div>
            </article>
            <div className="floating-callout callout-top">
              🏆 {userRank ? `Rank #${userRank.rank} in ${scope.replace("_", " ")}` : "Leaderboard sync active"}
            </div>
            <div className="floating-callout callout-bottom">⚡ {user ? `XP ${user.total_xp ?? 0}` : "+250 XP on perfect clears"}</div>
          </div>
        </div>
      </section>

      <CodeMazeCipherBanner />

      <section className="home-section" id="modes-showcase">
        <div className="section-stack center">
          <p className="section-label">Game Modes</p>
          <h2 className="section-title">
            Choose Your <span className="neon-cyan">Challenge</span>
          </h2>
          <p className="section-subtitle">
            The template’s card system now maps directly onto the platform’s three playable DSA modes, each routed into
            the real game pages.
          </p>
        </div>

        {loadingLevels ? <PageFeedback panel>Loading game modes...</PageFeedback> : null}
        {error ? <PageFeedback variant="error">{error}</PageFeedback> : null}

        <div className="modes-grid">{modeCards.map((card) => <ModeCard key={card.title} {...card} />)}</div>
      </section>

      <section className="home-section" id="arena-showcase">
        <ArenaShowcase featuredLevels={featuredLevels} isAuthenticated={Boolean(user)} />
      </section>

      <section className="home-section" id="dashboard-showcase">
        <div className="section-stack">
          <p className="section-label">Player Hub</p>
          <h2 className="section-title">
            Your <span className="neon-cyan">Dashboard</span>
          </h2>
        </div>

        <div className="dashboard-grid-modern">
          <article className="identity-card">
            <div className="identity-avatar" aria-hidden="true">
              {user ? "🧠" : "🚀"}
            </div>
            <div className="identity-name">{user?.username ?? "Guest Strategist"}</div>
            <div className="identity-rank">{user ? `Level ${user.progression?.level ?? 1} active operator` : "Preview the progression stack"}</div>
            <div className="xp-track-shell">
              <div className="xp-track-labels">
                <span>XP Progress</span>
                <span>
                  {user
                    ? `${user.progression?.xp_into_level ?? 0} / ${user.progression?.xp_for_next_level ?? 100}`
                    : "620 / 1,000"}
                </span>
              </div>
              <div className="xp-track-modern">
                <div className="xp-fill-modern" style={{ width: `${progressRatio}%` }} />
              </div>
            </div>
            <div className="identity-stat-grid">
              <div className="identity-stat">
                <strong>{user?.stats?.solved_count ?? 12}</strong>
                <span>Solved</span>
              </div>
              <div className="identity-stat">
                <strong>{user?.stats?.best_score ?? 100}</strong>
                <span>Best Score</span>
              </div>
              <div className="identity-stat">
                <strong>{user?.stats?.personal_best_count ?? 4}</strong>
                <span>Personal Bests</span>
              </div>
              <div className="identity-stat">
                <strong>{userRank?.rank ?? "—"}</strong>
                <span>Global Rank</span>
              </div>
            </div>
            <Link className="ghost-btn" to={user ? "/profile" : "/register"}>
              {user ? "Open Full Dashboard" : "Create Account"}
            </Link>
          </article>

          <div className="dashboard-stack-modern">
            <div className="summary-stat-grid">
              <article className="summary-stat-card cyan">
                <span className="summary-icon">🏆</span>
                <strong>{user?.total_xp ?? 18450}</strong>
                <span>Total XP</span>
              </article>
              <article className="summary-stat-card magenta">
                <span className="summary-icon">🔥</span>
                <strong>{user?.stats?.submissions_count ?? 28}</strong>
                <span>Runs Logged</span>
              </article>
              <article className="summary-stat-card green">
                <span className="summary-icon">⚡</span>
                <strong>{user?.progression?.level ?? 42}</strong>
                <span>Current Level</span>
              </article>
            </div>

            <article className="dashboard-panel">
              <div className="panel-title-row">
                <h3>Mode Mastery</h3>
                <span className="muted-text">Derived from current progression</span>
              </div>
              <div className="topic-stack">
                {masteryTracks.map((track) => (
                  <div key={track.label} className="topic-row-modern">
                    <div className="topic-row-header">
                      <span>{track.label}</span>
                      <span className={`topic-value ${track.accent}`}>{track.value}%</span>
                    </div>
                    <div className="topic-track-modern">
                      <div className={`topic-fill-modern ${track.accent}`} style={{ width: `${track.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-title-row">
                <h3>Achievements</h3>
                <span className="muted-text">Badge system mapped from the live backend</span>
              </div>
              <div className="achievement-grid-modern">
                {achievementCards.length
                  ? achievementCards.map((badge) => (
                      <div key={badge.code} className="achievement-card unlocked">
                        <strong>{badge.title}</strong>
                        <span>{badge.description}</span>
                      </div>
                    ))
                  : [
                      "First Clear",
                      "Speed Solver",
                      "Graph Guru",
                      "Maze Mapper"
                    ].map((label) => (
                      <div key={label} className="achievement-card">
                        <strong>{label}</strong>
                        <span>Unlock by completing validated puzzle runs.</span>
                      </div>
                    ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section" id="leaderboard-showcase">
        <div className="section-stack">
          <p className="section-label">Rankings</p>
          <h2 className="section-title">
            Global <span className="neon-magenta">Leaderboard</span>
          </h2>
        </div>

        <div className="leaderboard-layout-modern">
          <article className="leaderboard-card-modern">
            <div className="leaderboard-header-modern">
              <div>
                <h3>Top Players</h3>
                <p className="muted-text">Scope-aware standings from the live leaderboard API.</p>
              </div>
              <div className="scope-tabs home-scope-tabs" role="tablist" aria-label="Home leaderboard scopes">
                {leaderboardScopes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={scope === item.value ? "ghost-btn active" : "ghost-btn"}
                    onClick={() => setScope(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingLeaderboard ? <PageFeedback>Loading leaderboard...</PageFeedback> : null}

            <div className="leaderboard-list-modern">
              {entries.map((entry) => (
                <div key={`${entry.user_id}-${entry.rank}`} className="leaderboard-row-modern">
                  <div className="leaderboard-rank">#{entry.rank}</div>
                  <div className="leaderboard-user">
                    <strong>{entry.username}</strong>
                    <span>{entry.user_id === user?.id ? "You" : "Arena contender"}</span>
                  </div>
                  <div className="leaderboard-score">{entry.score}</div>
                </div>
              ))}
            </div>

            <div className="leaderboard-footer-modern">
              <div className="muted-text">
                {userRank ? `You are currently ranked #${userRank.rank} with ${userRank.score} points.` : "Sign in to see your personal rank."}
              </div>
              <Link className="primary-btn" to="/leaderboard">
                Open Full Leaderboard
              </Link>
            </div>
          </article>

          <aside className="season-card-modern">
            <div className="season-banner-modern">
              <strong>SEASON 3</strong>
              <span>Ends in 6d 14h 22m</span>
            </div>
            <h3>Season Rewards</h3>
            <div className="reward-stack">
              {rewardRows.map((reward) => (
                <div key={reward.rank} className="reward-row-modern">
                  <span className="reward-rank-modern">{reward.rank}</span>
                  <span className="reward-icon-modern" aria-hidden="true">
                    {reward.icon}
                  </span>
                  <span className="reward-copy-modern">{reward.name}</span>
                  <strong>{reward.points}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
