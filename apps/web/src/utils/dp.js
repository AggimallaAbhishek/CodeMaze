export function buildDpMoves(filledCells) {
  return filledCells.map((cell) => ({ type: "dp_cell", row: cell.row, col: cell.col, value: cell.value }));
}

export function getDpDependencies(problemType, row, col, config) {
  const deps = [];

  if (problemType === "fibonacci") {
    if (col >= 2) {
      deps.push({ row: 0, col: col - 1 });
    }
    if (col >= 2) {
      deps.push({ row: 0, col: col - 2 });
    }
  } else if (problemType === "coin_change") {
    const coins = config?.coins ?? [];
    for (const coin of coins) {
      if (col >= coin) {
        deps.push({ row: 0, col: col - coin });
      }
    }
  } else if (problemType === "knapsack") {
    const weights = config?.weights ?? [];
    if (row > 0) {
      deps.push({ row: row - 1, col });
      const weight = weights[row - 1];
      if (weight !== undefined && col >= weight) {
        deps.push({ row: row - 1, col: col - weight });
      }
    }
  } else if (problemType === "grid_traveler") {
    if (row > 0) {
      deps.push({ row: row - 1, col });
    }
    if (col > 0) {
      deps.push({ row, col: col - 1 });
    }
  }

  return deps;
}
