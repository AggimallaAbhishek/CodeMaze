import { create } from "zustand";

import { areAdjacent, isSameCell, isWalkable } from "../utils/pathfinding";

const initialState = {
  level: null,
  levelId: "",
  sessionId: "",
  expiresIn: 0,
  pathCells: [],
  redoCells: [],
  elapsedSeconds: 0,
  status: "idle",
  error: "",
  result: null
};

export const usePathfindingGameStore = create((set, get) => ({
  ...initialState,
  initializeLevel: (level) => {
    const start = level?.config?.start ?? [0, 0];
    console.debug("pathfinding_level_initialized", { levelId: level.id, start });
    set({
      ...initialState,
      level,
      levelId: level.id,
      pathCells: [[start[0], start[1]]],
      status: "loading"
    });
  },
  setSession: ({ sessionId, expiresIn }) => {
    console.debug("pathfinding_session_started", { sessionId, expiresIn });
    set({ sessionId, expiresIn, status: "playing" });
  },
  appendCell: (cell) => {
    const { status, level, pathCells } = get();
    if (status !== "playing") {
      return;
    }

    const grid = level?.config?.grid ?? [];
    const current = pathCells[pathCells.length - 1];
    if (!isWalkable(grid, cell)) {
      set({ error: "Blocked cell. Choose an open cell." });
      return;
    }
    if (isSameCell(current, cell)) {
      return;
    }
    if (!areAdjacent(current, cell)) {
      set({ error: "You can only move to adjacent cells." });
      return;
    }

    const nextPath = [...pathCells, [cell[0], cell[1]]];
    console.debug("pathfinding_cell_added", { cell, steps: nextPath.length });
    set({
      pathCells: nextPath,
      redoCells: [],
      error: ""
    });
  },
  undoStep: () => {
    const { status, pathCells, redoCells } = get();
    if (status !== "playing" || pathCells.length <= 1) {
      return;
    }

    const removedCell = pathCells[pathCells.length - 1];
    console.debug("pathfinding_undo", { removedCell });
    set({
      pathCells: pathCells.slice(0, -1),
      redoCells: [...redoCells, removedCell],
      error: ""
    });
  },
  redoStep: () => {
    const { status, pathCells, redoCells } = get();
    if (status !== "playing" || !redoCells.length) {
      return;
    }

    const restoredCell = redoCells[redoCells.length - 1];
    const current = pathCells[pathCells.length - 1];
    if (!areAdjacent(current, restoredCell)) {
      return;
    }

    console.debug("pathfinding_redo", { restoredCell });
    set({
      pathCells: [...pathCells, restoredCell],
      redoCells: redoCells.slice(0, -1),
      error: ""
    });
  },
  incrementTimer: () => {
    if (get().status === "playing") {
      set({ elapsedSeconds: get().elapsedSeconds + 1 });
    }
  },
  applyResult: (result) => {
    console.debug("pathfinding_result_received", { score: result.score, stars: result.stars });
    set({ result, status: "submitted" });
  },
  setError: (error) => {
    set({ error });
  },
  resetPath: () => {
    const level = get().level;
    if (!level) {
      return;
    }

    const start = level?.config?.start ?? [0, 0];
    console.debug("pathfinding_path_reset", { start });
    set({
      pathCells: [[start[0], start[1]]],
      redoCells: [],
      elapsedSeconds: 0,
      result: null,
      error: "",
      status: "playing"
    });
  }
}));
