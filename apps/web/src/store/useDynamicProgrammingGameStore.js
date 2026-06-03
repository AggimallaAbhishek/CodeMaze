import { create } from "zustand";

const initialState = {
  level: null,
  levelId: "",
  sessionId: "",
  expiresIn: 0,
  filledCells: [],
  redoCells: [],
  baseCases: [],
  tableRows: 0,
  tableCols: 0,
  problemType: "",
  elapsedSeconds: 0,
  status: "idle",
  error: "",
  result: null
};

export const useDynamicProgrammingGameStore = create((set, get) => ({
  ...initialState,
  initializeLevel: (level) => {
    const config = level?.config ?? {};
    const problemType = config.problem_type ?? "";
    // Determine table dimensions
    let rows = 1;
    let cols = 0;
    if (problemType === "fibonacci") {
      cols = (config.n ?? 0) + 1;
    } else if (problemType === "coin_change") {
      cols = (config.target ?? 0) + 1;
    } else if (problemType === "knapsack") {
      rows = (config.weights?.length ?? 0) + 1;
      cols = (config.capacity ?? 0) + 1;
    } else if (problemType === "grid_traveler") {
      rows = config.rows ?? 1;
      cols = config.cols ?? 1;
    }
    // Base cases come from the API response config. They'll be set after loading.
    console.debug("dp_level_initialized", { levelId: level.id, problemType, rows, cols });
    set({
      ...initialState,
      level,
      levelId: level.id,
      problemType,
      tableRows: rows,
      tableCols: cols,
      status: "loading"
    });
  },
  setSession: ({ sessionId, expiresIn }) => {
    console.debug("dp_session_started", { sessionId, expiresIn });
    set({ sessionId, expiresIn, status: "playing" });
  },
  setBaseCases: (baseCases) => {
    set({ baseCases });
  },
  fillCell: (row, col, value) => {
    const { status, filledCells, baseCases } = get();
    if (status !== "playing") return;
    // Check if this cell is a base case (already pre-filled)
    if (baseCases.some((bc) => bc.row === row && bc.col === col)) {
      set({ error: "This cell is a base case and already filled." });
      return;
    }
    // Check if already filled by user
    if (filledCells.some((fc) => fc.row === row && fc.col === col)) {
      set({ error: "This cell has already been filled." });
      return;
    }
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) {
      set({ error: "Please enter a valid number." });
      return;
    }
    const nextFilled = [...filledCells, { row, col, value: parsedValue }];
    console.debug("dp_cell_filled", { row, col, value: parsedValue, step: nextFilled.length });
    set({ filledCells: nextFilled, redoCells: [], error: "" });
  },
  undoStep: () => {
    const { status, filledCells, redoCells } = get();
    if (status !== "playing" || filledCells.length === 0) return;
    const removed = filledCells[filledCells.length - 1];
    console.debug("dp_undo", { removed });
    set({
      filledCells: filledCells.slice(0, -1),
      redoCells: [...redoCells, removed],
      error: ""
    });
  },
  redoStep: () => {
    const { status, filledCells, redoCells } = get();
    if (status !== "playing" || !redoCells.length) return;
    const restored = redoCells[redoCells.length - 1];
    console.debug("dp_redo", { restored });
    set({
      filledCells: [...filledCells, restored],
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
    console.debug("dp_result_received", { score: result.score, stars: result.stars });
    set({ result, status: "submitted" });
  },
  setError: (error) => set({ error }),
  resetTable: () => {
    const level = get().level;
    if (!level) return;
    console.debug("dp_table_reset");
    set({
      filledCells: [],
      redoCells: [],
      elapsedSeconds: 0,
      result: null,
      error: "",
      status: "playing"
    });
  }
}));
