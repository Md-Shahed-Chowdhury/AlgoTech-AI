/**
 * graphUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helper functions for manipulating graph topology.
 * No React, no state, no side-effects.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Adjacency helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an adjacency map from a Graph object.
 * Each entry: Record<nodeId, Array<{ neighborId, edgeId, weight }>>
 *
 * @param {import('./graphStructures').Graph} graph
 * @param {boolean} directed – if false, both directions are added
 * @returns {Record<string, Array<{neighborId: string, edgeId: string, weight: number}>>}
 */
export function buildAdjacency(graph, directed = false) {
  const adj = {}
  if (!graph || !graph.nodes) return adj
  for (const id of Object.keys(graph.nodes)) {
    adj[id] = []
  }
  if (!graph.edges) return adj
  for (const edge of Object.values(graph.edges)) {
    const { sourceId, targetId, weight, id: edgeId } = edge
    if (adj[sourceId]) {
      adj[sourceId].push({ neighborId: targetId, edgeId, weight })
    }
    if (!directed && !edge.directed && adj[targetId]) {
      adj[targetId].push({ neighborId: sourceId, edgeId, weight })
    }
  }
  return adj
}

/**
 * Get all neighbors of a node.
 *
 * @param {string} nodeId
 * @param {ReturnType<typeof buildAdjacency>} adjacency
 * @returns {Array<{neighborId: string, edgeId: string, weight: number}>}
 */
export function getNeighbors(nodeId, adjacency) {
  return adjacency[nodeId] ?? []
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristics (for Greedy & A*)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Euclidean distance between two nodes (canvas coordinates).
 *
 * @param {import('./graphStructures').GraphNode} a
 * @param {import('./graphStructures').GraphNode} b
 * @returns {number}
 */
export function euclideanHeuristic(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/**
 * Manhattan distance (useful for grid-based graphs).
 *
 * @param {import('./graphStructures').GraphNode} a
 * @param {import('./graphStructures').GraphNode} b
 * @returns {number}
 */
export function manhattanHeuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Get the heuristic value h(n) for a node ID.
 *
 * Rules:
 *  1. Goal node always returns 0.
 *  2. If the user has set a custom value on the node (`node.hValue` / `node.h`),
 *     use that value.
 *  3. If there is NO custom value, return 0.
 *     (No automatic geometric/euclidean/manhattan fallback — the user must
 *      explicitly set H(n) values for algorithms that need them.)
 *
 * @param {string} nodeId
 * @param {import('./graphStructures').Graph} graph
 * @returns {number}
 */
export function getNodeHeuristic(nodeId, graph) {
  if (!graph || !graph.nodes || !graph.nodes[nodeId]) return 0
  if (nodeId === graph.goalId) return 0

  const node = graph.nodes[nodeId]

  // Use custom user-defined heuristic value if present
  const customVal = node.hValue ?? node.h ?? null
  if (customVal !== null && customVal !== '' && !isNaN(Number(customVal))) {
    return Math.max(0, Number(customVal))
  }

  // No fallback — unset H(n) defaults to 0
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Path reconstruction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trace parentMap backwards from goalId → startId.
 *
 * @param {Record<string, string|null>} parentMap
 * @param {string} goalId
 * @returns {string[]} ordered array from startId → goalId, or [] if unreachable
 */
export function reconstructPath(parentMap, goalId) {
  const path = []
  let cur = goalId
  while (cur !== null && cur !== undefined) {
    path.unshift(cur)
    cur = parentMap[cur]
  }
  return path
}

/**
 * Given a path of nodeIds and the graph's edges, return the edgeIds that
 * connect consecutive nodes in the path.
 *
 * @param {string[]} pathNodes
 * @param {import('./graphStructures').Graph} graph
 * @returns {string[]}
 */
export function pathToEdges(pathNodes, graph) {
  const edgeIds = []
  if (!Array.isArray(pathNodes) || !graph || !graph.edges) return edgeIds
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const a = pathNodes[i]
    const b = pathNodes[i + 1]
    const edge = Object.values(graph.edges).find(
      e =>
        (e.sourceId === a && e.targetId === b) ||
        (!e.directed && e.sourceId === b && e.targetId === a)
    )
    if (edge) edgeIds.push(edge.id)
  }
  return edgeIds
}

/**
 * Calculate the true path cost by summing edge weights along consecutive path nodes.
 *
 * @param {string[]} pathNodes
 * @param {import('./graphStructures').Graph} graph
 * @returns {number}
 */
export function calculatePathCost(pathNodes, graph) {
  if (!Array.isArray(pathNodes) || pathNodes.length <= 1 || !graph || !graph.edges) return 0
  let total = 0
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const src = pathNodes[i]
    const tgt = pathNodes[i + 1]
    const edge = Object.values(graph.edges).find(
      e =>
        (e.sourceId === src && e.targetId === tgt) ||
        (!e.directed && e.sourceId === tgt && e.targetId === src)
    )
    if (edge) {
      const w = typeof edge.weight === 'number' ? edge.weight : (parseFloat(edge.weight) || 1)
      total += w
    } else {
      total += 1
    }
  }
  return total
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns an array of error/warning strings describing graph issues.
 * An empty array means the graph is ready to run.
 *
 * @param {import('./graphStructures').Graph} graph
 * @returns {string[]}
 */
export function validateGraph(graph) {
  const errors = []
  const nodes = Object.values(graph.nodes)
  if (nodes.length < 2) errors.push('Graph needs at least 2 nodes.')
  if (!graph.startId) errors.push('No start node selected.')
  if (!graph.goalId)  errors.push('No goal node selected.')
  if (Object.values(graph.edges).length === 0) errors.push('Graph has no edges.')
  return errors
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialization helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize a Graph to a JSON string (for save / share / exam preset loading).
 *
 * @param {import('./graphStructures').Graph} graph
 * @returns {string}
 */
export function serializeGraph(graph) {
  return JSON.stringify(graph)
}

/**
 * Deserialize a JSON string back to a Graph object.
 *
 * @param {string} json
 * @returns {import('./graphStructures').Graph}
 */
export function deserializeGraph(json) {
  return JSON.parse(json)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample / preset graphs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a small preset graph suitable for demo / exam purposes.
 * Node coordinates are normalised to a 800×500 canvas.
 *
 * @returns {import('./graphStructures').Graph}
 */
export function createPresetGraph() {
  return {
    startId: 'A',
    goalId:  'F',
    nodes: {
      A: { id: 'A', label: 'A', x: 100, y: 250, isStart: true,  isGoal: false, hValue: 10, h: 10 },
      B: { id: 'B', label: 'B', x: 260, y: 120, isStart: false, isGoal: false, hValue: 6,  h: 6  },
      C: { id: 'C', label: 'C', x: 260, y: 380, isStart: false, isGoal: false, hValue: 7,  h: 7  },
      D: { id: 'D', label: 'D', x: 440, y: 200, isStart: false, isGoal: false, hValue: 3,  h: 3  },
      E: { id: 'E', label: 'E', x: 440, y: 340, isStart: false, isGoal: false, hValue: 4,  h: 4  },
      F: { id: 'F', label: 'F', x: 620, y: 250, isStart: false, isGoal: true,  hValue: 0,  h: 0  },
    },
    edges: {
      'A-B': { id: 'A-B', sourceId: 'A', targetId: 'B', weight: 4,  directed: false },
      'A-C': { id: 'A-C', sourceId: 'A', targetId: 'C', weight: 2,  directed: false },
      'B-D': { id: 'B-D', sourceId: 'B', targetId: 'D', weight: 5,  directed: false },
      'C-E': { id: 'C-E', sourceId: 'C', targetId: 'E', weight: 3,  directed: false },
      'D-F': { id: 'D-F', sourceId: 'D', targetId: 'F', weight: 1,  directed: false },
      'E-F': { id: 'E-F', sourceId: 'E', targetId: 'F', weight: 4,  directed: false },
      'B-E': { id: 'B-E', sourceId: 'B', targetId: 'E', weight: 2,  directed: false },
    },
  }
}
