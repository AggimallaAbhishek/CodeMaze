import { useMemo } from "react";

function edgeKey(source, target) {
  return [source, target].sort().join("__");
}

function buildNodeLabel(node, { isCurrent, isExpected, isHint, isStart }) {
  const labels = [`Visit node ${node}`];
  if (isStart) {
    labels.push("start node");
  }
  if (isCurrent) {
    labels.push("current node");
  }
  if (isExpected) {
    labels.push("expected next");
  }
  if (isHint) {
    labels.push("hinted");
  }
  return labels.join(", ");
}

export default function GraphTraversalBoard({
  adjacency,
  positions,
  visitedNodes,
  startNode,
  nextExpected,
  hintNode,
  onVisitNode,
  disabled
}) {
  const nodes = useMemo(() => Object.keys(adjacency ?? {}), [adjacency]);
  const visited = new Set(visitedNodes);
  const currentNode = visitedNodes[visitedNodes.length - 1];

  const coordinates = useMemo(
    () =>
      Object.fromEntries(
        nodes.map((node, index) => {
          const explicit = positions?.[node];
          if (Array.isArray(explicit) && explicit.length === 2) {
            return [
              node,
              {
                x: Math.min(Math.max(explicit[0], 10), 90),
                y: Math.min(Math.max(explicit[1], 10), 90)
              }
            ];
          }

          const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1);
          return [
            node,
            {
              x: 50 + Math.cos(angle) * 32,
              y: 50 + Math.sin(angle) * 28
            }
          ];
        })
      ),
    [nodes, positions]
  );
  const edges = useMemo(() => {
    const discoveredEdges = [];
    const seen = new Set();

    for (const source of nodes) {
      for (const target of adjacency[source] ?? []) {
        const key = edgeKey(source, target);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        discoveredEdges.push([source, target]);
      }
    }

    return discoveredEdges;
  }, [adjacency, nodes]);

  return (
    <section className="graph-shell" aria-labelledby="graph-board-label">
      <p id="graph-board-label" className="sr-only">
        Graph traversal board. Select nodes in order to build a valid traversal.
      </p>
      <div className="graph-board">
        <svg className="graph-canvas" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {edges.map(([source, target]) => {
            const from = coordinates[source];
            const to = coordinates[target];
            if (!from || !to) {
              return null;
            }
            return (
              <line
                key={`${source}-${target}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(147, 212, 242, 0.35)"
                strokeWidth="0.8"
              />
            );
          })}
        </svg>

        <div className="graph-node-layer" role="group" aria-describedby="graph-board-label">
          {nodes.map((node) => {
            const point = coordinates[node];
            if (!point) {
              return null;
            }
            const isVisited = visited.has(node);
            const isCurrent = currentNode === node;
            const isStart = startNode === node;
            const isExpected = nextExpected === node;
            const isHint = hintNode === node;

            const className = [
              "graph-node",
              isVisited ? "visited" : "",
              isCurrent ? "current" : "",
              isStart ? "start" : "",
              isExpected ? "expected" : "",
              isHint ? "hint" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={node}
                type="button"
                className={className}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => onVisitNode(node)}
                disabled={disabled || isVisited}
                aria-label={buildNodeLabel(node, { isCurrent, isExpected, isHint, isStart })}
              >
                {node}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
