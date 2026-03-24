import { create } from "zustand";

import { applySwap } from "../utils/sorting";

const initialState = {
  level: null,
  levelId: "",
  sessionId: "",
  expiresIn: 0,
  workingArray: [],
  moves: [],
  selectedIndex: null,
  elapsedSeconds: 0,
  status: "idle",
  error: "",
  result: null
};

export const useSortingGameStore = create((set, get) => ({
  ...initialState,
  initializeLevel: (level) => {
    console.debug("sorting_level_initialized", { levelId: level.id });
    set({
      ...initialState,
      level,
      levelId: level.id,
      workingArray: [...(level.config?.array ?? [])],
      status: "loading"
    });
  },
  setSession: ({ sessionId, expiresIn }) => {
    console.debug("sorting_session_started", { sessionId, expiresIn });
    set({ sessionId, expiresIn, status: "playing" });
  },
  selectBar: (index) => {
    const { selectedIndex, workingArray, moves } = get();

    if (selectedIndex === null) {
      set({ selectedIndex: index });
      return;
    }

    if (selectedIndex === index) {
      set({ selectedIndex: null });
      return;
    }

    const nextArray = applySwap(workingArray, selectedIndex, index);
    const move = { type: "swap", indices: [selectedIndex, index] };
    console.debug("sorting_swap_recorded", { move, nextArray });

    set({
      workingArray: nextArray,
      moves: [...moves, move],
      selectedIndex: null
    });
  },
  incrementTimer: () => {
    if (get().status === "playing") {
      set({ elapsedSeconds: get().elapsedSeconds + 1 });
    }
  },
  applyResult: (result) => {
    console.debug("sorting_result_received", { score: result.score, stars: result.stars });
    set({ result, status: "submitted" });
  },
  setError: (error) => {
    set({ error });
  },
  resetToInitialArray: () => {
    const level = get().level;
    if (!level) {
      return;
    }

    set({
      workingArray: [...(level.config?.array ?? [])],
      moves: [],
      selectedIndex: null,
      elapsedSeconds: 0,
      result: null,
      error: "",
      status: "playing"
    });
  }
}));
