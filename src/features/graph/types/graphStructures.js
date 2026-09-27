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
  const stepIndex = params.stepIndex ?? 0
  const currentNode = params.currentNode ?? null

  return {
    // ── Step Identification ───────────────────────────────────────────────
    stepIndex,
    stepNumber:      params.stepNumber ?? (stepIndex + 1),
    action:          params.action ?? 'STEP',
    reason:          params.reason ?? '',

    // ── Node State & Categorisation ───────────────────────────────────────
    currentNode,
    selectedNode:    params.selectedNode ?? currentNode,
    newlyVisitedNode: params.newlyVisitedNode ?? null,
    visitedNodes:    params.visitedNodes ?? [],     // closed set array
    frontierNodes:   params.frontierNodes ?? [],    // open set array
    unexploredNodes: params.unexploredNodes ?? [],  // unvisited & not in frontier
    discoveredNodes: params.discoveredNodes ?? [],  // visited + frontier
    pathNodes:       params.pathNodes ?? [],        // final solution path

    // ── Navigation & Path Tracking ────────────────────────────────────────
    parentMap:       params.parentMap ?? {},        // Record<nodeId, parentId|null>
    currentPath:     params.currentPath ?? [],      // path from start to currentNode
    neighborsConsidered: params.neighborsConsidered ?? [], // Array<{ neighborId, edgeId, weight, status }>

    // ── Edge Categorisation ───────────────────────────────────────────────
    activeEdge:      params.activeEdge ?? null,
    traversedEdges:  params.traversedEdges ?? [],
    pathEdges:       params.pathEdges ?? [],

    // ── Cost & Heuristic Tracking (UCS / Greedy / A*) ────────────────────
    gCost:           params.gCost ?? {},
    hCost:           params.hCost ?? {},
    fCost:           params.fCost ?? {},
    frontierDetail:  params.frontierDetail ?? [],

    // ── Algorithm Specific State (Queue for BFS / Stack for DFS) ──────────
    algorithmSpecificState: params.algorithmSpecificState ?? {},

    // ── Calculation Breakdown & Performance Metrics ───────────────────────
    calculations:    params.calculations ?? [],
    metrics: {
      nodesExpanded:  params.metrics?.nodesExpanded ?? 0,
      pathLength:     params.metrics?.pathLength ?? 0,
      totalCost:      params.metrics?.totalCost ?? 0,
      frontierSize:   params.metrics?.frontierSize ?? 0,
    },

    // ── Terminal Flags ────────────────────────────────────────────────────
    isInitial:       params.isInitial ?? false,
    isFinal:         params.isFinal ?? false,
    pathFound:       params.pathFound ?? false,
    goalReached:     params.goalReached ?? (params.pathFound ?? false),
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
