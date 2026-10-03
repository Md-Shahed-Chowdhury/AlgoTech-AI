/**
 * hillClimbingEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Steepest-descent Hill Climbing over the graph, minimizing the heuristic h(n).
 *
 * Local search: no frontier, no backtracking. Each iteration is two steps,
 * matching the VISIT / EXPLORE rhythm of the systematic engines:
 *  - EVALUATE_NEIGHBORS: score every neighbor of the current node by h(n)
 *  - MOVE:               step to the best neighbor if it strictly improves h
 * Terminates on GOAL_REACHED or LOCAL_MINIMUM (no improving neighbor).
 *
 * Pure logic — zero React, zero DOM.
 */

import {
  buildAdjacency,
  getNeighbors,
  getNodeHeuristic,
  pathToEdges,
} from '../utils/graphUtils.js'

export const LOCAL_ACTION = {
  INITIALIZE:         'INITIALIZE',
  EVALUATE_NEIGHBORS: 'EVALUATE_NEIGHBORS',
  MOVE:               'MOVE',
  PROPOSE:            'PROPOSE',
  ACCEPT:             'ACCEPT',
  REJECT:             'REJECT',
  GOAL_REACHED:       'GOAL_REACHED',
  LOCAL_MINIMUM:      'LOCAL_MINIMUM',
  FROZEN:             'FROZEN',
}

/**
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {object} [options]
 * @param {number} [options.sideways=0] – max consecutive moves to an equal-h neighbor
 * @param {number} [options.maxIter=100] – safety cap on iterations
 * @returns {object[]} AlgorithmStep-shaped snapshots
 */
export function runHillClimbing(graph, { sideways = 0, maxIter = 100 } = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const adj = buildAdjacency(graph, false)
  const h = (id) => getNodeHeuristic(id, graph)
  const walker = createWalker(graph, startId)
  let sidewaysLeft = sideways
  let iterations = 0

  steps.push(walker.snapshot({
    action: LOCAL_ACTION.INITIALIZE,
    reason: `Initialize Hill Climbing at ${startId} (h = ${h(startId)}). It only ever moves to a neighbor with LOWER h(n). There is no frontier and no backtracking.`,
    iterations,
    isInitial: true,
  }))

  while (iterations < maxIter) {
    const current = walker.current
    if (current === goalId) break
    iterations++

    // ── Step A: evaluate every neighbor ───────────────────────────────────
    const candidates = getNeighbors(current, adj).map(n => ({ ...n, h: h(n.neighborId) }))
    const best = candidates.reduce((b, c) => (b === null || c.h < b.h ? c : b), null)
    const hCur = h(current)
    const improves = best && best.h < hCur
    const sidestep = best && best.h === hCur && sidewaysLeft > 0

    const neighborsConsidered = candidates.map(c => ({
      neighborId: c.neighborId,
      edgeId: c.edgeId,
      weight: c.weight,
      h: c.h,
      status: c === best && (improves || sidestep) ? 'best' : (c.h < hCur ? 'better' : 'worse'),
    }))

    steps.push(walker.snapshot({
      action: LOCAL_ACTION.EVALUATE_NEIGHBORS,
      neighborsConsidered,
      reason: candidates.length === 0
        ? `${current} has no neighbors to evaluate.`
        : `Evaluate neighbors of ${current} (h = ${hCur}): ${candidates.map(c => `${c.neighborId}(h=${c.h})`).join(', ')}. Best is ${best.neighborId} with h = ${best.h}.`,
      iterations,
    }))

    // ── Step B: move or stop ──────────────────────────────────────────────
    if (!improves && !sidestep) {
      steps.push(walker.snapshot({
        action: LOCAL_ACTION.LOCAL_MINIMUM,
        reason: `Stuck at local minimum ${current} (h = ${hCur}): no neighbor has a lower h(n). Hill Climbing cannot go uphill, so the search ends without reaching ${goalId}.`,
        iterations,
        isFinal: true,
        extra: { stuckAt: current },
      }))
      return steps
    }

    sidewaysLeft = improves ? sideways : sidewaysLeft - 1
    walker.moveTo(best.neighborId, best.edgeId, best.weight)

    if (best.neighborId === goalId) {
      steps.push(walker.finish(`Moved to goal ${goalId}! Hill Climbing followed strictly decreasing h(n): ${walker.trajectory.join(' → ')}.`, iterations))
      return steps
    }

    steps.push(walker.snapshot({
      action: LOCAL_ACTION.MOVE,
      activeEdge: best.edgeId,
      reason: improves
        ? `Move ${current} → ${best.neighborId}: h drops from ${hCur} to ${best.h}.`
        : `Sideways move ${current} → ${best.neighborId} (equal h = ${best.h}); ${sidewaysLeft} sideways move(s) left.`,
      iterations,
    }))
  }

  steps.push(walker.snapshot({
    action: LOCAL_ACTION.LOCAL_MINIMUM,
    reason: `Iteration limit (${maxIter}) reached without finding ${goalId}.`,
    iterations,
    isFinal: true,
    extra: { stuckAt: walker.current },
  }))
  return steps
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared walker: tracks a single agent's trajectory and builds step snapshots.
// Used by both Hill Climbing and Simulated Annealing.
// ─────────────────────────────────────────────────────────────────────────────

export function createWalker(graph, startId) {
  const allNodeIds = Object.keys(graph.nodes)
  const trajectory = [startId]
  const traversedEdges = []
  let walkedCost = 0

  const visitedSet = () => new Set(trajectory)

  return {
    get current() { return trajectory[trajectory.length - 1] },
    get trajectory() { return trajectory },
    get walkedCost() { return walkedCost },

    moveTo(nodeId, edgeId, weight) {
      trajectory.push(nodeId)
      walkedCost += weight
      if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)
    },

    snapshot({ action, reason, iterations, neighborsConsidered = [], activeEdge = null, isInitial = false, isFinal = false, extra = {} }) {
      const visited = visitedSet()
      return {
        stepType: action,
        action,
        currentNode: this.current,
        selectedNode: this.current,
        visitedNodes: [...visited],
        frontierNodes: [],
        discoveredNodes: [...visited],
        unexploredNodes: allNodeIds.filter(id => !visited.has(id)),
        currentPath: [...trajectory],
        traversedEdges: [...traversedEdges],
        activeEdge,
        neighbors: neighborsConsidered.map(n => n.neighborId),
        neighborsConsidered,
        reason,
        algorithmSpecificState: { trajectory: [...trajectory], walkedCost, ...extra },
        metrics: { nodesExpanded: iterations, pathLength: trajectory.length - 1, totalCost: walkedCost, frontierSize: 0 },
        isInitial,
        isFinal,
        pathFound: false,
        goalReached: false,
      }
    },

    finish(reason, iterations, extra = {}) {
      const pathNodes = eraseLoops(trajectory)
      return {
        ...this.snapshot({ action: LOCAL_ACTION.GOAL_REACHED, reason, iterations, isFinal: true, extra }),
        pathNodes,
        pathEdges: pathToEdges(pathNodes, graph),
        pathFound: true,
        goalReached: true,
      }
    },
  }
}

/** Remove cycles from a walk so the result is a simple start→goal path. */
export function eraseLoops(walk) {
  const path = []
  const index = new Map()
  for (const id of walk) {
    if (index.has(id)) {
      const cut = index.get(id)
      for (const dropped of path.splice(cut + 1)) index.delete(dropped)
    } else {
      index.set(id, path.length)
      path.push(id)
    }
  }
  return path
}
