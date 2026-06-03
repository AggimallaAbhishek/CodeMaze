import { useState } from "react";

import { getDpDependencies } from "../utils/dp";

function columnHeader(problemType, col, config) {
  if (problemType === "fibonacci") {
    return `F(${col})`;
  }
  if (problemType === "coin_change") {
    return `${col}`;
  }
  if (problemType === "knapsack") {
    return `${col}`;
  }
  if (problemType === "grid_traveler") {
    return `${col}`;
  }
  return `${col}`;
}

function rowHeader(problemType, row, config) {
  if (problemType === "knapsack") {
    if (row === 0) {
      return "∅";
    }
    const weights = config?.weights ?? [];
    const values = config?.values ?? [];
    return `w${weights[row - 1] ?? "?"}v${values[row - 1] ?? "?"}`;
  }
  if (problemType === "grid_traveler") {
    return `${row}`;
  }
  return `${row}`;
}

function findCell(cells, row, col) {
  return cells.find((c) => c.row === row && c.col === col) ?? null;
}

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
  const [inputValues, setInputValues] = useState({});

  const deps = hoveredCell
    ? getDpDependencies(problemType, hoveredCell.row, hoveredCell.col, config)
    : [];

  function isDepCell(row, col) {
    return deps.some((d) => d.row === row && d.col === col);
  }

  function handleInputChange(row, col, value) {
    setInputValues((prev) => ({ ...prev, [`${row}-${col}`]: value }));
  }

  function handleCommit(row, col) {
    const key = `${row}-${col}`;
    const value = inputValues[key];
    if (value !== undefined && value !== "") {
      onFillCell(row, col, value);
      setInputValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleKeyDown(event, row, col) {
    if (event.key === "Enter") {
      handleCommit(row, col);
    }
  }

  return (
    <section className="dp-board-wrapper" aria-labelledby="dp-board-label">
      <p id="dp-board-label" className="sr-only">
        Dynamic programming table. Fill cells with computed values to build the solution.
      </p>
      {problemType ? (
        <p className="dp-problem-label">{problemType.replace(/_/g, " ")}</p>
      ) : null}
      <table className="dp-board">
        <thead>
          <tr>
            <th aria-label="Row header" />
            {Array.from({ length: cols }, (_, colIndex) => (
              <th key={colIndex}>{columnHeader(problemType, colIndex, config)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              <th>{rowHeader(problemType, rowIndex, config)}</th>
              {Array.from({ length: cols }, (_, colIndex) => {
                const baseCase = findCell(baseCases, rowIndex, colIndex);
                const filled = findCell(filledCells, rowIndex, colIndex);
                const isHint = hintCell && hintCell.row === rowIndex && hintCell.col === colIndex;
                const isDep = isDepCell(rowIndex, colIndex);

                const classNames = ["dp-cell"];
                if (baseCase) classNames.push("dp-cell-base");
                if (filled) classNames.push("dp-cell-filled");
                if (isHint) classNames.push("dp-cell-hint");
                if (isDep) classNames.push("dp-cell-dep");

                const isEmpty = !baseCase && !filled;

                return (
                  <td
                    key={colIndex}
                    className={classNames.join(" ")}
                    onMouseEnter={() => {
                      if (isEmpty) {
                        setHoveredCell({ row: rowIndex, col: colIndex });
                      }
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {baseCase ? (
                      <span>{baseCase.value}</span>
                    ) : filled ? (
                      <span>{filled.value}</span>
                    ) : (
                      <input
                        type="number"
                        aria-label={`Cell row ${rowIndex} column ${colIndex}`}
                        disabled={disabled}
                        value={inputValues[`${rowIndex}-${colIndex}`] ?? ""}
                        onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                        onBlur={() => handleCommit(rowIndex, colIndex)}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
