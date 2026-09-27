/**
 * index.js — Public API barrel for the graph feature
 * ─────────────────────────────────────────────────────────────────────────────
 * All consumers (App.jsx, LearnPage, TestPage) import from here.
 * This keeps internal paths stable even if files move inside the feature.
 */

// ── Types & constants ─────────────────────────────────────────────────────────
export { NODE_STATE, EDGE_STATE, ALGORITHM, APP_MODE, BUILDER_MODE, PLAYBACK, ALGORITHM_META }
  from './types/graphTypes.js'
export { createNode, createEdge, createGraph, createAlgorithmStep, createExamQuestion }
  from './types/graphStructures.js'

// ── Utilities ─────────────────────────────────────────────────────────────────
export {
  buildAdjacency, getNeighbors,
  euclideanHeuristic, manhattanHeuristic,
  reconstructPath, pathToEdges,
  validateGraph,
  serializeGraph, deserializeGraph,
  createPresetGraph,
} from './utils/graphUtils.js'
export { MinHeap } from './utils/MinHeap.js'

// ── Engine ────────────────────────────────────────────────────────────────────
export { runAlgorithm }       from './engine/algorithmEngine.js'
export { explainStep, explainAllSteps } from './engine/explanationGenerator.js'

// ── Stores ────────────────────────────────────────────────────────────────────
export { useGraphStore }     from './store/useGraphStore.js'
export { useAlgorithmStore } from './store/useAlgorithmStore.js'
export { useExamStore }      from './store/useExamStore.js'

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useVoiceExplanation } from './hooks/useVoiceExplanation.js'

// ── Components (lazy-import these in App.jsx for code-splitting) ──────────────
// import LearnModePage from './components/LearnModePage/LearnModePage.jsx'
// import ExamModePage  from './components/ExamModePage/ExamModePage.jsx'
// import GraphCanvas   from './components/GraphCanvas/GraphCanvas.jsx'
// import GraphBuilder  from './components/GraphBuilder/GraphBuilder.jsx'
// import PlaybackControls from './components/PlaybackControls/PlaybackControls.jsx'
// import AlgorithmStatePanel from './components/AlgorithmStatePanel/AlgorithmStatePanel.jsx'
// import MetricsPanel  from './components/MetricsPanel/MetricsPanel.jsx'
// import ExplanationPanel from './components/ExplanationPanel/ExplanationPanel.jsx'
// import FeedbackPanel from './components/FeedbackPanel/FeedbackPanel.jsx'
