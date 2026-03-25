export function buildGraphMoves(visitedNodes) {
  return visitedNodes.map((node) => ({ type: "graph_visit", node }));
}

export function canonicalTraversal(adjacency, start, mode = "bfs") {
  if (!adjacency?.[start]) {
    return [];
  }

  if (mode === "dfs") {
    const visited = new Set();
    const order = [];

    const walk = (node) => {
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      order.push(node);
      for (const neighbor of adjacency[node] ?? []) {
        walk(neighbor);
      }
    };

    walk(start);
    return order;
  }

  const queue = [start];
  const visited = new Set();
  const order = [];

  while (queue.length) {
    const node = queue.shift();
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    order.push(node);
    for (const neighbor of adjacency[node] ?? []) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return order;
}

export function traversalTeachingState(adjacency, start, mode = "bfs", visitedCount = 0) {
  if (!adjacency?.[start]) {
    return { containerType: mode === "dfs" ? "stack" : "queue", container: [], nextExpected: null };
  }

  if (mode === "dfs") {
    const stack = [start];
    const visited = new Set();
    const order = [];

    while (stack.length && order.length < visitedCount) {
      const node = stack.pop();
      if (visited.has(node)) {
        continue;
      }
      visited.add(node);
      order.push(node);
      const neighbors = adjacency[node] ?? [];
      for (let index = neighbors.length - 1; index >= 0; index -= 1) {
        const neighbor = neighbors[index];
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    const remainingOrder = canonicalTraversal(adjacency, start, mode).slice(order.length);
    return {
      containerType: "stack",
      container: [...stack].reverse(),
      nextExpected: remainingOrder[0] ?? null
    };
  }

  const queue = [start];
  const visited = new Set();
  const order = [];

  while (queue.length && order.length < visitedCount) {
    const node = queue.shift();
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    order.push(node);
    for (const neighbor of adjacency[node] ?? []) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  const remainingOrder = canonicalTraversal(adjacency, start, mode).slice(order.length);
  return {
    containerType: "queue",
    container: [...queue],
    nextExpected: remainingOrder[0] ?? null
  };
}
