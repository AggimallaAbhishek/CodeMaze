export function describeMove(move) {
  if (!move) {
    return "No move";
  }

  if (move.type === "swap") {
    const [left = 0, right = 0] = move.indices ?? [];
    return `Swap ${left + 1} <-> ${right + 1}`;
  }

  if (move.type === "path_cell") {
    const [row = 0, col = 0] = move.cell ?? [];
    return `Cell ${row + 1},${col + 1}`;
  }

  if (move.type === "graph_visit") {
    return `Visit ${move.node ?? "?"}`;
  }

  return move.type ?? "Unknown move";
}

export function buildReplayRows(userMoves = [], optimalMoves = [], diff = []) {
  const maxSteps = Math.max(userMoves.length, optimalMoves.length, diff.length);
  return Array.from({ length: maxSteps }, (_, index) => {
    const diffRow = diff[index];
    const userMove = userMoves[index] ?? null;
    const optimalMove = optimalMoves[index] ?? null;
    const status = diffRow
      ? diffRow.correct
        ? "match"
        : "mismatch"
      : describeMove(userMove) === describeMove(optimalMove)
        ? "match"
        : "mismatch";

    return {
      step: index + 1,
      userMove,
      optimalMove,
      userLabel: describeMove(userMove),
      optimalLabel: describeMove(optimalMove),
      status
    };
  });
}
