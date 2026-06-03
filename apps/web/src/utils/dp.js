export function buildDpMoves(filledCells) {
  return filledCells.map((cell) => ({
    type: "dp_cell",
    row: cell.row,
    col: cell.col,
    value: cell.value,
  }));
}

export function getDpDependencies(problemType, row, col, config) {
  const deps = [];
  if (problemType === "fibonacci") {
    if (col - 1 >= 0) deps.push({ row: 0, col: col - 1 });
    if (col - 2 >= 0) deps.push({ row: 0, col: col - 2 });
  } else if (problemType === "coin_change") {
    const coins = config?.coins || [];
    for (const coin of coins) {
      if (col >= coin) {
        deps.push({ row: 0, col: col - coin });
      }
    }
  } else if (problemType === "knapsack") {
    const weights = config?.weights || [];
    if (row - 1 >= 0) {
      deps.push({ row: row - 1, col });
      const weight = weights[row - 1]; // 0-indexed for weights array, row 1 corresponds to weight[0]
      if (weight !== undefined && col >= weight) {
        deps.push({ row: row - 1, col: col - weight });
      }
    }
  } else if (problemType === "grid_traveler") {
    if (row - 1 >= 0) deps.push({ row: row - 1, col });
    if (col - 1 >= 0) deps.push({ row, col: col - 1 });
  }
  return deps;
}

export function computeBaseCases(config) {
  const problemType = config.problem_type;
  const baseCases = [];

  if (problemType === "fibonacci") {
    baseCases.push({ row: 0, col: 0, value: 0 });
    if (config.n >= 1) {
      baseCases.push({ row: 0, col: 1, value: 1 });
    }
  } else if (problemType === "coin_change") {
    baseCases.push({ row: 0, col: 0, value: 0 });
  } else if (problemType === "knapsack") {
    const rows = (config.weights?.length || 0) + 1;
    const cols = (config.capacity || 0) + 1;
    for (let c = 0; c < cols; c++) {
      baseCases.push({ row: 0, col: c, value: 0 });
    }
    for (let r = 1; r < rows; r++) {
      baseCases.push({ row: r, col: 0, value: 0 });
    }
  } else if (problemType === "grid_traveler") {
    const rows = config.rows || 1;
    const cols = config.cols || 1;
    for (let c = 0; c < cols; c++) {
      baseCases.push({ row: 0, col: c, value: 1 });
    }
    for (let r = 1; r < rows; r++) {
      baseCases.push({ row: r, col: 0, value: 1 });
    }
  }
  return baseCases;
}
