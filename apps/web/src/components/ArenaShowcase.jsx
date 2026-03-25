import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

function SortingPreview() {
  const values = [34, 68, 44, 90, 32, 74, 52, 82, 46, 61];

  return (
    <div className="arena-preview-shell sorting-preview" aria-label="Sorting preview">
      <div className="preview-bars">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className={`preview-bar preview-bar-${(index % 5) + 1}`}
            style={{ height: `${value}%`, animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
      <div className="preview-metrics">
        <span>Comparisons: 18</span>
        <span>Swaps: 6</span>
        <span>Status: Resolving pivots</span>
      </div>
    </div>
  );
}

function PathfindingPreview() {
  const cells = [
    "start",
    "path",
    "path",
    "visited",
    "wall",
    "visited",
    "wall",
    "path",
    "visited",
    "wall",
    "visited",
    "visited",
    "path",
    "visited",
    "wall",
    "wall",
    "visited",
    "path",
    "path",
    "end",
    "wall",
    "wall",
    "wall",
    "visited",
    "visited"
  ];

  return (
    <div className="arena-preview-shell path-preview" aria-label="Pathfinding preview">
      <div className="preview-grid">
        {cells.map((cell, index) => (
          <span key={`${cell}-${index}`} className={`preview-grid-cell ${cell}`} />
        ))}
      </div>
      <div className="preview-metrics">
        <span>Mode: Dijkstra frontier</span>
        <span>Visited: 11</span>
        <span>Path Cost: 08</span>
      </div>
    </div>
  );
}

function GraphPreview() {
  return (
    <div className="arena-preview-shell graph-preview" aria-label="Graph traversal preview">
      <svg className="preview-graph" viewBox="0 0 360 220" role="img" aria-label="Graph traversal preview">
        <line x1="66" y1="64" x2="178" y2="48" />
        <line x1="178" y1="48" x2="290" y2="72" />
        <line x1="66" y1="64" x2="126" y2="166" />
        <line x1="178" y1="48" x2="184" y2="176" />
        <line x1="290" y1="72" x2="238" y2="176" />
        <circle cx="66" cy="64" r="21" className="preview-node start" />
        <circle cx="178" cy="48" r="21" className="preview-node active" />
        <circle cx="290" cy="72" r="21" className="preview-node queued" />
        <circle cx="126" cy="166" r="21" className="preview-node visited" />
        <circle cx="184" cy="176" r="21" className="preview-node visited" />
        <circle cx="238" cy="176" r="21" className="preview-node queued" />
        <text x="66" y="70">A</text>
        <text x="178" y="54">B</text>
        <text x="290" y="78">C</text>
        <text x="126" y="172">D</text>
        <text x="184" y="182">E</text>
        <text x="238" y="182">F</text>
      </svg>
      <div className="preview-metrics">
        <span>Traversal: BFS</span>
        <span>Queue: 2 nodes</span>
        <span>Next frontier: C, F</span>
      </div>
    </div>
  );
}

const arenaModes = {
  sorting: {
    tabLabel: "Sorting",
    eyebrow: "Interactive Arena",
    title: "Sorting Command Center",
    description:
      "Control the cadence of swaps, compare strategy overlays, and jump straight into a validated sorting challenge.",
    info: "Selection, Bubble, and Quick Sort rounds are rendered with live move tracking and server-validated scoring.",
    complexity: [
      ["Time (best)", "O(n)"],
      ["Time (worst)", "O(n²)"],
      ["Space", "O(1)"]
    ],
    steps: [
      "Prime the board and inspect the unsorted segments.",
      "Swap high bars into the active pivot slot.",
      "Submit the exact move log to score the round."
    ],
    renderPreview: SortingPreview
  },
  pathfinding: {
    tabLabel: "Pathfinding",
    eyebrow: "Interactive Arena",
    title: "Maze Routing Bay",
    description:
      "Preview the weighted grid logic, path cost feedback, and the exact route structure that the validator expects.",
    info: "The maze experience supports BFS and Dijkstra-style reasoning with undo/redo, optimal path overlays, and hint penalties.",
    complexity: [
      ["Time", "O(V + E)"],
      ["Weighted", "Yes"],
      ["Space", "O(V)"]
    ],
    steps: [
      "Mark the frontier and keep the path contiguous.",
      "Avoid walls while preserving the lowest-cost route.",
      "Reveal the optimal overlay only after you commit the run."
    ],
    renderPreview: PathfindingPreview
  },
  graph_traversal: {
    tabLabel: "Graph",
    eyebrow: "Interactive Arena",
    title: "Traversal Ops Room",
    description:
      "Swap between BFS and DFS teaching cues, inspect the queue or stack state, and walk the graph in the correct order.",
    info: "Traversal runs include node-state coloring, canonical order feedback, and a teaching panel for queue and stack progression.",
    complexity: [
      ["Time", "O(V + E)"],
      ["Traversal", "BFS / DFS"],
      ["Space", "O(V)"]
    ],
    steps: [
      "Anchor the traversal at the configured start node.",
      "Expand the queue or stack in canonical order.",
      "Lock the final visitation log before replay review."
    ],
    renderPreview: GraphPreview
  }
};

export default function ArenaShowcase({ featuredLevels, isAuthenticated }) {
  const [activeTab, setActiveTab] = useState("sorting");
  const activeMode = arenaModes[activeTab];
  const Preview = activeMode.renderPreview;

  const actionHref = useMemo(() => {
    if (!isAuthenticated) {
      return "/login";
    }
    return levelRoute(featuredLevels?.[activeTab]);
  }, [activeTab, featuredLevels, isAuthenticated]);

  const actionLabel = isAuthenticated ? "Launch Live Challenge" : "Sign In To Play";

  return (
    <section className="arena-showcase-shell">
      <div className="section-stack">
        <p className="section-label">{activeMode.eyebrow}</p>
        <h2 className="section-title">
          Play &amp; <span className="neon-cyan">Visualize</span>
        </h2>
      </div>

      <div className="arena-tab-row" role="tablist" aria-label="Arena showcase modes">
        {Object.entries(arenaModes).map(([key, mode]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={activeTab === key ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab(key)}
          >
            {mode.tabLabel}
          </button>
        ))}
      </div>

      <div className="arena-layout">
        <div className="arena-main-card">
          <div className="arena-toolbar">
            <span className="toolbar-chip start">LIVE</span>
            <span className="toolbar-chip">Validated Scoring</span>
            <span className="toolbar-chip">Replay Ready</span>
            <Link className="toolbar-link" to={actionHref}>
              {actionLabel}
            </Link>
          </div>
          <div className="arena-copy">
            <h3>{activeMode.title}</h3>
            <p>{activeMode.description}</p>
          </div>
          <Preview />
        </div>

        <aside className="arena-side-stack">
          <article className="sidebar-card-modern">
            <div className="sidebar-title-modern">Algorithm Info</div>
            <p className="sidebar-copy">{activeMode.info}</p>
            <div className="complexity-list">
              {activeMode.complexity.map(([label, value]) => (
                <div key={label} className="complexity-row-modern">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="sidebar-card-modern">
            <div className="sidebar-title-modern">Step Log</div>
            <div className="step-feed">
              {activeMode.steps.map((entry, index) => (
                <div key={entry} className="step-entry-modern">
                  <span className="step-index">#{index + 1}</span>
                  <span>{entry}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
