/**
 * greedyTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase Greedy Best-First Search Simulation Engine.
 *
 * Alternates between:
 *  - PHASE A: VISIT_NODE (pops node with lowest h(n) heuristic estimate from Priority Queue)
 *  - PHASE B: EXPLORE_NEIGHBORS (evaluates ALL outgoing edges of current node as ONE step, computes h(n), pushes new neighbors to Priority Queue)
 */

import { ACTION_TYPE } from '../types/graphTypes.js'
import { MinHeap } from '../utils/MinHeap.js'
import {
  buildAdjacency,
  getNeighbors,
  euclideanHeuristic,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : String(n ?? 0))

export function runGreedyTwoPhase(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const goalNode = nodes[goalId]
  const hFunc = options.heuristicFn ?? euclideanHeuristic

  const computeH = (nodeId) => Math.round(hFunc(nodes[nodeId], goalNode) * 10) / 10

  const visited = new Set()
  const hCost = { [startId]: computeH(startId) }
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: hCost[startId], h: hCost[startId] })

  const getFrontierNodes = () => pq.toArray().map(item => item.id)
  const getFrontierDetail = () => pq.toArray().map(item => ({ nodeId: item.id, priority: item.priority, h: item.h }))
  const getUnexplored = () => {
    const openSet = new Set(getFrontierNodes())
    return allNodeIds.filter(id => !visited.has(id) && !openSet.has(id))
  }

  // ── Step 0: INITIALIZE ──────────────────────────────────────────────────
  if (startId === goalId) {
    visited.add(startId)
    steps.push({
      stepIndex: 0,
      stepType: ACTION_TYPE.INITIALIZE_GOAL,
      action: ACTION_TYPE.INITIALIZE_GOAL,
      currentNode: startId,
      selectedNode: startId,
      visitedNodes: [startId],
      frontierNodes: [],
      discoveredNodes: [startId],
      unexploredNodes: allNodeIds.filter(id => id !== startId),
      parentMap: { [startId]: null },
      currentPath: [startId],
      pathNodes: [startId],
      pathEdges: [],
      hCost,
      frontierDetail: [],
      neighbors: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately with h(${startId}) = 0!`,
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    })
    return steps
  }

  steps.push({
    stepIndex: 0,
    stepType: ACTION_TYPE.INITIALIZE,
    action: ACTION_TYPE.INITIALIZE,
    currentNode: startId,
    selectedNode: startId,
    visitedNodes: [],
    frontierNodes: getFrontierNodes(),
    unexploredNodes: getUnexplored(),
    discoveredNodes: [startId],
    parentMap: { ...parentMap },
    currentPath: [startId],
    hCost: { ...hCost },
    frontierDetail: getFrontierDetail(),
    neighbors: [],
    neighborsConsidered: [],
    reason: `Initialize Greedy Best-First: Add start node ${startId} to Priority Queue with heuristic h(${startId}) = ${fmt(hCost[startId])}. Greedy always expands the node closest to the goal.`,
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  })

  // ── Two-Phase Alternating Loop ─────────────────────────────────────────────
  while (!pq.isEmpty()) {
    // ── PHASE A: VISIT / POP NODE ──────────────────────────────────────────
    const pqBeforePop = getFrontierNodes()
    const topItem = pq.pop()
    const current = topItem.id
    const pqAfterPop = getFrontierNodes()

    if (visited.has(current)) {
      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.SKIP_VISITED,
        action: ACTION_TYPE.SKIP_VISITED,
        currentNode: current,
        selectedNode: current,
        visitedNodes: Array.from(visited),
        frontierNodes: pqAfterPop,
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(new Set([...visited, ...pqAfterPop])),
        parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        hCost: { ...hCost },
        frontierDetail: getFrontierDetail(),
        neighbors: [],
        neighborsConsidered: [],
        reason: `Node ${current} popped from Priority Queue was skipped because it was already expanded earlier.`,
        metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      })
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentH = hCost[current] ?? computeH(current)
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on expansion
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.GOAL_REACHED,
        action: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId,
        selectedNode: goalId,
        visitedNodes: Array.from(visited),
        frontierNodes: pqAfterPop,
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(new Set([...visited, ...pqAfterPop])),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        hCost: { ...hCost },
        frontierDetail: getFrontierDetail(),
        neighbors: [],
        neighborsConsidered: [],
        reason: `Goal node ${goalId} popped from Priority Queue! h(${goalId}) = 0. Solution path: ${pathNodes.join(' → ')}.`,
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: pathNodes.length - 1, frontierSize: pq.size },
        isInitial: false,
        isFinal: true,
        pathFound: true,
        goalReached: true,
      })
      return steps
    }

    // Step snapshot for VISIT_NODE
    steps.push({
      stepIndex: steps.length,
      stepType: ACTION_TYPE.VISIT_NODE,
      action: ACTION_TYPE.VISIT_NODE,
      currentNode: current,
      selectedNode: current,
      visitedNodes: Array.from(visited),
      frontierNodes: pqAfterPop,
      unexploredNodes: getUnexplored(),
      discoveredNodes: Array.from(new Set([...visited, ...pqAfterPop])),
      parentMap: { ...parentMap },
      currentPath,
      hCost: { ...hCost },
      frontierDetail: getFrontierDetail(),
      traversedEdges: [...traversedEdges],
      neighbors: [],
      neighborsConsidered: [],
      reason: `Greedy selects node ${current} with lowest heuristic estimate h(${current}) = ${fmt(currentH)} from Priority Queue.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: 0, frontierSize: pq.size },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })

    // ── PHASE B: EXPLORE ALL NEIGHBORS ──────────────────────────────────────
    const rawNeighbors = getNeighbors(current, adj)
    const neighbors = []
    const neighborsConsidered = []

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      neighbors.push(neighborId)
      if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (neighborId in hCost) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_in_frontier',
        })
      } else {
        const nH = computeH(neighborId)
        hCost[neighborId] = nH
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: nH, h: nH })
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: neighborId === goalId ? 'goal' : 'pushed_to_frontier',
        })
      }
    }

    const pqAfterExplore = getFrontierNodes()
    const pushedIds = neighborsConsidered
      .filter(n => n.status === 'pushed_to_frontier' || n.status === 'goal')
      .map(n => n.neighborId)

    steps.push({
      stepIndex: steps.length,
      stepType: ACTION_TYPE.EXPLORE_NEIGHBORS,
      action: ACTION_TYPE.EXPLORE_NEIGHBORS,
      currentNode: current,
      parentNode: current,
      neighbors,
      neighborsConsidered,
      visitedNodes: Array.from(visited),
      frontierNodes: pqAfterExplore,
      unexploredNodes: getUnexplored(),
      discoveredNodes: Array.from(new Set([...visited, ...pqAfterExplore])),
      parentMap: { ...parentMap },
      currentPath,
      hCost: { ...hCost },
      frontierDetail: getFrontierDetail(),
      traversedEdges: [...traversedEdges],
      reason: neighbors.length > 0
        ? `Node ${current} evaluated all ${neighbors.length} outgoing neighbor(s). Calculated heuristic estimates h(n) and pushed new nodes [${pushedIds.join(', ')}] to Priority Queue.`
        : `Node ${current} has no outgoing edges.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: 0, frontierSize: pq.size },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })
  }

  // ── NO_PATH ─────────────────────────────────────────────────────────────
  steps.push({
    stepIndex: steps.length,
    stepType: ACTION_TYPE.NO_PATH,
    action: ACTION_TYPE.NO_PATH,
    currentNode: null,
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    discoveredNodes: Array.from(visited),
    unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap },
    currentPath: [],
    hCost: { ...hCost },
    frontierDetail: [],
    neighbors: [],
    neighborsConsidered: [],
    reason: `Priority Queue is empty. Goal node ${goalId} is unreachable from start node ${startId}.`,
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false,
    isFinal: true,
    pathFound: false,
    goalReached: false,
  })

  return steps
}
