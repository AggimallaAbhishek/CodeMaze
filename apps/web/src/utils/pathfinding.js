export function toCellKey(cell) {
  return `${cell[0]}:${cell[1]}`;
}

export function isSameCell(left, right) {
  if (!left || !right) {
    return false;
  }
  return left[0] === right[0] && left[1] === right[1];
}

export function areAdjacent(source, target) {
  if (!source || !target) {
    return false;
  }
  return Math.abs(source[0] - target[0]) + Math.abs(source[1] - target[1]) === 1;
}

export function isWalkable(grid, cell) {
  if (!grid?.length || !grid[0]?.length || !cell) {
    return false;
  }
  const [row, col] = cell;
  if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) {
    return false;
  }
  return grid[row][col] !== 1;
}

export function buildPathMoves(pathCells) {
  return pathCells.map((cell) => ({ type: "path_cell", cell: [cell[0], cell[1]] }));
}
