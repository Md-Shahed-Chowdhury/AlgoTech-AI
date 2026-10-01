/**
 * metrics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helpers that turn a graph + an algorithm's step array into comparable
 * numbers. No React, no state.
 */

import { getNodeHeuristic } from '../../graph/utils/graphUtils.js'
import { MinHeap } from '../../graph/utils/MinHeap.js'

/**
 * Real weighted cost of a node path. The engines report `totalCost` as hop
 * count for BFS / DFS / Greedy, so it cannot be compared across algorithms.
 *
 * @returns {number|null} null if two consecutive nodes are not connected
 */
export function pathCost(pathNodes, graph) {
  let cost = 0
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const a = pathNodes[i]
    const b = pathNodes[i + 1]
    let best = Infinity
    for (const e of Object.values(graph.edges)) {
      const forward  = e.sourceId === a && e.targetId === b
      const backward = !e.directed && e.sourceId === b && e.targetId === a
      if ((forward || backward) && e.weight < best) best = e.weight
    }
    if (best === Infinity) return null
    cost += best
  }
  return cost
}

/**
 * True optimal cost from every node to the goal (Dijkstra on the reversed
 * graph). Used both as the optimality baseline and to test whether h(n) is
 * admissible.
 *
 * @returns {Record<string, number>} Infinity for nodes that cannot reach goal
 */
export function costToGoal(graph) {
  const dist = {}
  for (const id of Object.keys(graph.nodes)) dist[id] = Infinity
  if (!graph.goalId || !graph.nodes[graph.goalId]) return dist

  // Reverse adjacency: an edge s→t lets t's cost flow back to s
  const rev = {}
  for (const id of Object.keys(graph.nodes)) rev[id] = []
  for (const e of Object.values(graph.edges)) {
    if (rev[e.targetId]) rev[e.targetId].push({ id: e.sourceId, w: e.weight })
    if (!e.directed && rev[e.sourceId]) rev[e.sourceId].push({ id: e.targetId, w: e.weight })
  }

  dist[graph.goalId] = 0
  const pq = new MinHeap()
  pq.push({ id: graph.goalId, priority: 0 })
  while (!pq.isEmpty()) {
    const { id, priority } = pq.pop()
    if (priority > dist[id]) continue
    for (const { id: next, w } of rev[id]) {
      const d = priority + w
      if (d < dist[next]) {
        dist[next] = d
        pq.push({ id: next, priority: d })
      }
    }
  }
  return dist
}

/**
 * Nodes whose heuristic overestimates the true remaining cost.
 *
 * @returns {Array<{ nodeId: string, h: number, trueCost: number }>}
 */
export function findInadmissibleNodes(graph, trueCost) {
  const bad = []
  for (const id of Object.keys(graph.nodes)) {
    const h = getNodeHeuristic(id, graph)
    if (trueCost[id] !== Infinity && h > trueCost[id] + 1e-9) {
      bad.push({ nodeId: id, h, trueCost: trueCost[id] })
    }
  }
  return bad
}

/**
 * Per-step series for the convergence chart.
 *
 * `distance` is the TRUE remaining cost from the node being expanded, so it
 * shows real progress toward the goal regardless of heuristic quality.
 *
 * @returns {Array<{ step, expanded, frontier, hCurrent, distance }>} null = no current node
 */
export function buildSeries(steps, graph, trueCost = {}) {
  return steps.map((s, i) => {
    const d = s.currentNode ? trueCost[s.currentNode] : undefined
    return {
      step: i,
      expanded: s.metrics?.nodesExpanded ?? 0,
      frontier: s.metrics?.frontierSize ?? s.frontierNodes?.length ?? 0,
      hCurrent: s.currentNode ? getNodeHeuristic(s.currentNode, graph) : null,
      distance: d != null && isFinite(d) ? d : null,
    }
  })
}

/** Time the given function, repeating until a time budget is used up. */
export function measureAverageMs(fn, { budgetMs = 25, minRuns = 20, maxRuns = 2000 } = {}) {
  fn() // warm-up (JIT, caches)
  let runs = 0
  const start = performance.now()
  let elapsed = 0
  while (runs < minRuns || (elapsed < budgetMs && runs < maxRuns)) {
    fn()
    runs++
    elapsed = performance.now() - start
  }
  return { avgMs: elapsed / runs, runs }
}
