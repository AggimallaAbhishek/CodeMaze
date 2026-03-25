function edgeKey(source, target) {
  return [source, target].sort().join("__");
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
  const nodes = Object.keys(adjacency ?? {});
  const visited = new Set(visitedNodes);
  const currentNode = visitedNodes[visitedNodes.length - 1];
  const edges = [];
  const seen = new Set();

  for (const source of nodes) {
    for (const target of adjacency[source] ?? []) {
      const key = edgeKey(source, target);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      edges.push([source, target]);
    }
  }

  function nodePoint(node, index) {
    const explicit = positions?.[node];
    if (Array.isArray(explicit) && explicit.length === 2) {
      return {
        x: (explicit[0] / 100) * 560 + 20,
        y: (explicit[1] / 100) * 320 + 20
      };
    }
    const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1);
    return {
      x: 300 + Math.cos(angle) * 220,
      y: 180 + Math.sin(angle) * 120
    };
  }

  const coordinates = Object.fromEntries(nodes.map((node, index) => [node, nodePoint(node, index)]));

  return (
    <section className="graph-shell" aria-label="Graph Traversal Board">
      <svg className="graph-canvas" width="600" height="360" role="img" aria-label="Graph edges">
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
              strokeWidth="2"
            />
          );
        })}
      </svg>

      <div className="graph-node-layer">
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
              style={{ left: `${point.x}px`, top: `${point.y}px` }}
              onClick={() => onVisitNode(node)}
              disabled={disabled || isVisited}
              aria-label={`Visit node ${node}`}
            >
              {node}
            </button>
          );
        })}
      </div>
    </section>
  );
}
