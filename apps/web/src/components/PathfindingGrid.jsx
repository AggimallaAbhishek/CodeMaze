import { toCellKey } from "../utils/pathfinding";

export default function PathfindingGrid({
  grid,
  weights,
  pathCells,
  optimalPathCells,
  start,
  end,
  weighted,
  onSelectCell,
  disabled
}) {
  const pathSet = new Set(pathCells.map((cell) => toCellKey(cell)));
  const optimalSet = new Set(optimalPathCells.map((cell) => toCellKey(cell)));
  const currentCell = pathCells[pathCells.length - 1];

  return (
    <section className="maze-shell" aria-label="Pathfinding Maze Grid">
      <div className="maze-grid" style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 0}, minmax(44px, 1fr))` }}>
        {grid.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const cell = [rowIndex, colIndex];
            const key = toCellKey(cell);
            const blocked = value === 1;
            const isStart = start[0] === rowIndex && start[1] === colIndex;
            const isEnd = end[0] === rowIndex && end[1] === colIndex;
            const isPath = pathSet.has(key);
            const isOptimal = optimalSet.has(key);
            const isCurrent = currentCell?.[0] === rowIndex && currentCell?.[1] === colIndex;

            const className = [
              "maze-cell",
              blocked ? "blocked" : "",
              isStart ? "start" : "",
              isEnd ? "end" : "",
              isPath ? "path" : "",
              isOptimal ? "optimal" : "",
              isCurrent ? "current" : ""
            ]
              .filter(Boolean)
              .join(" ");

            let label = "";
            if (isStart) {
              label = "S";
            } else if (isEnd) {
              label = "E";
            } else if (weighted && !blocked) {
              label = String(weights?.[rowIndex]?.[colIndex] ?? 1);
            }

            return (
              <button
                key={key}
                type="button"
                className={className}
                onClick={() => onSelectCell(cell)}
                disabled={disabled || blocked}
                aria-label={`Cell ${rowIndex + 1},${colIndex + 1}${blocked ? " blocked" : ""}`}
              >
                {label}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
