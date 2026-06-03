import { useState } from "react";
import { getDpDependencies } from "../utils/dp";

export default function DpBoard({
  rows,
  cols,
  baseCases,
  filledCells,
  problemType,
  config,
  onFillCell,
  disabled,
  hintCell
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Helper to check if a cell is a dependency of the hovered cell
  const isDependency = (r, c) => {
    if (!hoveredCell) return false;
    const deps = getDpDependencies(problemType, hoveredCell.row, hoveredCell.col, config);
    return deps.some((dep) => dep.row === r && dep.col === c);
  };

  const renderCell = (r, c) => {
    const isBaseCase = baseCases.some((bc) => bc.row === r && bc.col === c);
    const filled = filledCells.find((fc) => fc.row === r && fc.col === c);
    const isHint = hintCell && hintCell.row === r && hintCell.col === c;
    const isDep = isDependency(r, c);

    let className = "dp-cell";
    if (isBaseCase) className += " dp-cell-base";
    else if (filled) className += " dp-cell-filled";
    if (isHint) className += " dp-cell-hint";
    if (isDep) className += " dp-cell-dep";

    // Cell content logic
    if (isBaseCase) {
      const bcValue = baseCases.find((bc) => bc.row === r && bc.col === c).value;
      return <td key={`${r}-${c}`} className={className}>{bcValue}</td>;
    }
    if (filled) {
      return <td key={`${r}-${c}`} className={className}>{filled.value}</td>;
    }

    // Interactive empty cell
    return (
      <td
        key={`${r}-${c}`}
        className={className}
        onMouseEnter={() => setHoveredCell({ row: r, col: c })}
        onMouseLeave={() => setHoveredCell(null)}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[-0-9]*"
          aria-label={`Cell row ${r} column ${c}`}
          disabled={disabled}
          onBlur={(e) => {
            if (e.target.value !== "") {
              onFillCell(r, c, e.target.value);
              e.target.value = "";
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.value !== "") {
              onFillCell(r, c, e.target.value);
              e.target.value = "";
            }
          }}
        />
      </td>
    );
  };

  const renderRowHeaders = (r) => {
    if (problemType === "knapsack" && r > 0) {
      const weight = config?.weights?.[r - 1];
      const val = config?.values?.[r - 1];
      return <th scope="row">Item {r}<br/>(w:{weight}, v:{val})</th>;
    }
    return <th scope="row">Row {r}</th>;
  };

  const renderColHeaders = () => {
    const headers = [];
    headers.push(<th key="empty"></th>); // top-left corner
    for (let c = 0; c < cols; c++) {
      if (problemType === "coin_change") {
        headers.push(<th key={`col-${c}`}>Amt {c}</th>);
      } else if (problemType === "knapsack") {
        headers.push(<th key={`col-${c}`}>Cap {c}</th>);
      } else {
        headers.push(<th key={`col-${c}`}>Col {c}</th>);
      }
    }
    return <tr>{headers}</tr>;
  };

  return (
    <div className="dp-board-wrapper">
      <div className="dp-problem-label">{problemType.replace("_", " ")}</div>
      <table className="dp-board">
        <thead>{renderColHeaders()}</thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={`row-${r}`}>
              {renderRowHeaders(r)}
              {Array.from({ length: cols }).map((_, c) => renderCell(r, c))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
