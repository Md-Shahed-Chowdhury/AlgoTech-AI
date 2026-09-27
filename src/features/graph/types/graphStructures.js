/**
 * graphStructures.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory functions that produce the canonical plain-object shapes used
 * everywhere in the graph feature (GraphState store, engine, canvas props).
 *
 * All objects are plain JS — no classes — so they serialize cleanly through
 * Zustand, React state, and JSON.
 */

import { NODE_STATE, EDGE_STATE } from './graphTypes.js'

// ─────────────────────────────────────────────────────────────────────────────
// Graph topology objects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a node.
 *
 * @param {string}  id     – unique identifier (e.g. 'A', '0', nanoid())
 * @param {number}  x      – canvas x-coordinate (pixels)
 * @param {number}  y      – canvas y-coordinate (pixels)
 * @param {object}  [opts] – optional overrides
 * @returns {GraphNode}
 */
export function createNode(id, x, y, opts = {}) {
  return {
    id,
    x,
    y,
    label:  opts.label  ?? id,
    state:  opts.state  ?? NODE_STATE.UNEXPLORED,
    isStart: opts.isStart ?? false,
    isGoal:  opts.isGoal  ?? false,
  }
}

/**
 * Create a directed or undirected edge.
 *
 * @param {string}  id         – unique edge id (e.g. 'A-B')
 * @param {string}  sourceId   – source node id
 * @param {string}  targetId   – target node id
 * @param {object}  [opts]
 * @returns {GraphEdge}
 */
export function createEdge(id, sourceId, targetId, opts = {}) {
  return {
    id,
    sourceId,
    targetId,
    weight:     opts.weight     ?? 1,
    directed:   opts.directed   ?? false,
    state:      opts.state      ?? EDGE_STATE.DEFAULT,
  }
}

/**
 * Create an empty graph.
 *
 * @returns {Graph}
 */
export function createGraph() {
  return {
    nodes: {},   // Record<nodeId, GraphNode>
    edges: {},   // Record<edgeId, GraphEdge>
    startId: null,
    goalId:  null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Algorithm step snapshot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a single immutable snapshot of algorithm progress.
 *
 * The engine generates an array of these; the UI replays them.
 *
 * @param {object} params
 * @returns {AlgorithmStep}
 */
export function createAlgorithmStep(params = {}) {
  return {
    // ── Which node is being expanded this step ────────────────────────────
    currentNode:     params.currentNode     ?? null,   // nodeId | null

    // ── Node categorisation sets (arrays of nodeIds) ──────────────────────
    visitedNodes:    params.visitedNodes    ?? [],     // closed / expanded
    frontierNodes:   params.frontierNodes   ?? [],     // open / queued
    unexploredNodes: params.unexploredNodes ?? [],     // not yet seen
    pathNodes:       params.pathNodes       ?? [],     // solution path (final step)

    // ── Edge categorisation ───────────────────────────────────────────────
    activeEdge:      params.activeEdge      ?? null,   // edgeId being checked
    traversedEdges:  params.traversedEdges  ?? [],     // already used
    pathEdges:       params.pathEdges       ?? [],     // on solution path

    // ── Ancestry ──────────────────────────────────────────────────────────
    parentMap:       params.parentMap       ?? {},     // Record<nodeId, nodeId|null>

    // ── Cost / heuristic tracking (used by UCS, Greedy, A*) ──────────────
    gCost:           params.gCost           ?? {},     // Record<nodeId, number>  cost so far
    hCost:           params.hCost           ?? {},     // Record<nodeId, number>  heuristic
    fCost:           params.fCost           ?? {},     // Record<nodeId, number>  g + h

    // ── Frontier details (ordered list for panel display) ─────────────────
    frontierDetail:  params.frontierDetail  ?? [],     // [{nodeId, priority, g, h}]

    // ── Natural-language explanation for this step ────────────────────────
    reason:          params.reason          ?? '',

    // ── Key calculation shown in the panel (e.g. "f(n)=g+h=3+2=5") ───────
    calculations:    params.calculations    ?? [],     // string[]

    // ── Metrics accumulated so far ────────────────────────────────────────
    metrics: {
      nodesExpanded:  params.metrics?.nodesExpanded  ?? 0,
      pathLength:     params.metrics?.pathLength     ?? 0,
      totalCost:      params.metrics?.totalCost      ?? 0,
      frontierSize:   params.metrics?.frontierSize   ?? 0,
    },

    // ── Step metadata ─────────────────────────────────────────────────────
    stepIndex:       params.stepIndex       ?? 0,
    isInitial:       params.isInitial       ?? false,
    isFinal:         params.isFinal         ?? false,
    pathFound:       params.pathFound       ?? false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exam-mode question scaffold
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single exam question generated from an algorithm run.
 *
 * @param {object} params
 * @returns {ExamQuestion}
 */
export function createExamQuestion(params = {}) {
  return {
    id:             params.id             ?? '',
    algorithmId:    params.algorithmId    ?? null,
    questionText:   params.questionText   ?? '',
    options:        params.options        ?? [],   // string[]
    correctIndex:   params.correctIndex   ?? 0,
    explanation:    params.explanation    ?? '',
    relatedStep:    params.relatedStep    ?? null, // stepIndex this question is about
  }
}
