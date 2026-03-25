import { create } from "zustand";

const initialState = {
  level: null,
  levelId: "",
  sessionId: "",
  expiresIn: 0,
  visitedNodes: [],
  redoNodes: [],
  elapsedSeconds: 0,
  status: "idle",
  error: "",
  result: null
};

export const useGraphTraversalGameStore = create((set, get) => ({
  ...initialState,
  initializeLevel: (level) => {
    const start = level?.config?.start;
    console.debug("graph_level_initialized", { levelId: level.id, start });
    set({
      ...initialState,
      level,
      levelId: level.id,
      visitedNodes: start ? [start] : [],
      status: "loading"
    });
  },
  setSession: ({ sessionId, expiresIn }) => {
    console.debug("graph_session_started", { sessionId, expiresIn });
    set({ sessionId, expiresIn, status: "playing" });
  },
  visitNode: (node) => {
    const { status, visitedNodes, level } = get();
    if (status !== "playing") {
      return;
    }

    const adjacency = level?.config?.adjacency ?? {};
    if (!Object.prototype.hasOwnProperty.call(adjacency, node)) {
      set({ error: "Unknown node selected." });
      return;
    }
    if (visitedNodes.includes(node)) {
      set({ error: "Node already visited in this round." });
      return;
    }

    const nextVisited = [...visitedNodes, node];
    console.debug("graph_node_visited", { node, step: nextVisited.length });
    set({
      visitedNodes: nextVisited,
      redoNodes: [],
      error: ""
    });
  },
  undoStep: () => {
    const { status, visitedNodes, redoNodes } = get();
    if (status !== "playing" || visitedNodes.length <= 1) {
      return;
    }
    const removedNode = visitedNodes[visitedNodes.length - 1];
    console.debug("graph_undo", { removedNode });
    set({
      visitedNodes: visitedNodes.slice(0, -1),
      redoNodes: [...redoNodes, removedNode],
      error: ""
    });
  },
  redoStep: () => {
    const { status, visitedNodes, redoNodes } = get();
    if (status !== "playing" || !redoNodes.length) {
      return;
    }
    const restoredNode = redoNodes[redoNodes.length - 1];
    console.debug("graph_redo", { restoredNode });
    set({
      visitedNodes: [...visitedNodes, restoredNode],
      redoNodes: redoNodes.slice(0, -1),
      error: ""
    });
  },
  incrementTimer: () => {
    if (get().status === "playing") {
      set({ elapsedSeconds: get().elapsedSeconds + 1 });
    }
  },
  applyResult: (result) => {
    console.debug("graph_result_received", { score: result.score, stars: result.stars });
    set({ result, status: "submitted" });
  },
  setError: (error) => {
    set({ error });
  },
  resetTraversal: () => {
    const level = get().level;
    if (!level) {
      return;
    }
    const start = level?.config?.start;
    console.debug("graph_traversal_reset", { start });
    set({
      visitedNodes: start ? [start] : [],
      redoNodes: [],
      elapsedSeconds: 0,
      result: null,
      error: "",
      status: "playing"
    });
  }
}));
