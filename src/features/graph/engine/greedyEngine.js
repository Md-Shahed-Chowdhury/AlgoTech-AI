/**
 * greedyEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Independent, pure Greedy Best-First Search simulation engine.
 * Expands the frontier node with the lowest heuristic distance estimate h(n) to goal.
 * Uses Euclidean 2D canvas distance as default heuristic function.
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import { MinHeap } from '../utils/MinHeap.js'
import {
  buildAdjacency,
  getNeighbors,
  euclideanHeuristic,
  getNodeHeuristic,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run Greedy Best-First Search on the given graph topology.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {object} [options]
 * @param {function} [options.heuristicFn] – custom heuristic (nodeA, nodeB) => number
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runGreedy(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph

  // 1. Validation guards
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) {
    return steps
  }

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const hFunc = options.heuristicFn ?? euclideanHeuristic

  // Helper to get h(n) for a node ID
  const computeH = (nodeId) => getNodeHeuristic(nodeId, graph)

  // 2. Data structures
  const visited = new Set()
  const hCost = { [startId]: computeH(startId) }
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: hCost[startId], h: hCost[startId] })

  const getFrontierNodes = () => pq.toArray().map(item => item.id)
  const getFrontierDetail = () => pq.toArray().map(item => ({
    nodeId: item.id,
    priority: item.priority,
    h: item.h,
  }))
  const getUnexplored = () => {
    const openSet = new Set(getFrontierNodes())
    return allNodeIds.filter(id => !visited.has(id) && !openSet.has(id))
  }

  // ── Step 0: Initialization ────────────────────────────────────────────────
  if (startId === goalId) {
    visited.add(startId)
    steps.push(createAlgorithmStep({
      stepIndex: 0,
      action: 'INITIALIZE_GOAL',
      currentNode: startId,
      selectedNode: startId,
      newlyVisitedNode: startId,
      visitedNodes: [startId],
      frontierNodes: [],
      unexploredNodes: allNodeIds.filter(id => id !== startId),
      discoveredNodes: [startId],
      parentMap: { [startId]: null },
      currentPath: [startId],
      pathNodes: [startId],
      pathEdges: [],
      hCost,
      frontierDetail: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately!`,
      calculations: [`h(${startId}) = 0`],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    }))
    return steps
  }

  steps.push(createAlgorithmStep({
    stepIndex: 0,
    action: 'INITIALIZE',
    currentNode: startId,
    selectedNode: startId,
    newlyVisitedNode: null,
    visitedNodes: [],
    frontierNodes: getFrontierNodes(),
    unexploredNodes: getUnexplored(),
    discoveredNodes: [startId],
    parentMap: { ...parentMap },
    currentPath: [startId],
    hCost: { ...hCost },
    frontierDetail: getFrontierDetail(),
    neighborsConsidered: [],
    reason: `Initialize Greedy Best-First Search: Add start node ${startId} to Priority Queue with heuristic estimate h(${startId}) = ${hCost[startId]}. Greedy always selects the node with the lowest heuristic distance h(n) to the goal.`,
    calculations: [`Heuristic h(${startId}) = ${hCost[startId]}`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  }))

  // ── Greedy Expansion Loop ──────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const topItem = pq.pop()
    const current = topItem.id

    if (visited.has(current)) {
      steps.push(createAlgorithmStep({
        stepIndex: steps.length,
        action: 'SKIP_VISITED',
        currentNode: current,
        selectedNode: current,
        newlyVisitedNode: null,
        visitedNodes: Array.from(visited),
        frontierNodes: getFrontierNodes(),
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
        parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        hCost: { ...hCost },
        frontierDetail: getFrontierDetail(),
        neighborsConsidered: [],
        reason: `Node ${current} popped from Priority Queue was skipped because it was already visited.`,
        calculations: [`Skipped stale entry for ${current}`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentH = hCost[current] ?? computeH(current)
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on node expansion
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)

      steps.push(createAlgorithmStep({
        stepIndex: steps.length,
        action: 'GOAL_REACHED',
        currentNode: goalId,
        selectedNode: goalId,
        newlyVisitedNode: goalId,
        visitedNodes: Array.from(visited),
        frontierNodes: getFrontierNodes(),
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        hCost: { ...hCost },
        frontierDetail: getFrontierDetail(),
        neighborsConsidered: [],
        reason: `Goal node ${goalId} selected for expansion! Greedy Best-First Search selects ${goalId} because it has the lowest heuristic estimate h(${goalId}) = ${currentH} in the frontier.`,
        calculations: [`Solution path: ${pathNodes.join(' → ')}`, `Heuristic at goal h(${goalId}) = 0`],
        metrics: {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost: pathNodes.length - 1,
          frontierSize: pq.size,
        },
        isInitial: false,
        isFinal: true,
        pathFound: true,
        goalReached: true,
      }))
      return steps
    }

    const rawNeighbors = getNeighbors(current, adj)
    const neighborsConsidered = []

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (!(neighborId in hCost)) {
        const hVal = computeH(neighborId)
        hCost[neighborId] = hVal
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: hVal, h: hVal })
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: neighborId === goalId ? 'goal' : 'pushed_to_frontier',
        })
      } else {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_in_frontier',
        })
      }
    }

    const reasoning = current === startId
      ? `Node ${current} expanded as start node with heuristic h(${current}) = ${currentH}. Evaluated neighbors.`
      : `Node ${current} is selected for expansion because Greedy Best-First Search selects the frontier node with the lowest heuristic estimate h(${current}) = ${currentH} to the goal.`

    steps.push(createAlgorithmStep({
      stepIndex: steps.length,
      action: 'EXPAND_NODE',
      currentNode: current,
      selectedNode: current,
      newlyVisitedNode: current,
      visitedNodes: Array.from(visited),
      frontierNodes: getFrontierNodes(),
      unexploredNodes: getUnexplored(),
      discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
      parentMap: { ...parentMap },
      currentPath,
      hCost: { ...hCost },
      frontierDetail: getFrontierDetail(),
      neighborsConsidered,
      traversedEdges: [...traversedEdges],
      reason: reasoning,
      calculations: [`Heuristic h(${current}) = ${currentH}`],
      metrics: {
        nodesExpanded,
        pathLength: currentPath.length - 1,
        totalCost: currentPath.length - 1,
        frontierSize: pq.size,
      },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    }))
  }

  // ── No Path Found ─────────────────────────────────────────────────────────
  steps.push(createAlgorithmStep({
    stepIndex: steps.length,
    action: 'NO_PATH',
    currentNode: null,
    selectedNode: null,
    newlyVisitedNode: null,
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    unexploredNodes: getUnexplored(),
    discoveredNodes: Array.from(visited),
    parentMap: { ...parentMap },
    currentPath: [],
    hCost: { ...hCost },
    frontierDetail: [],
    neighborsConsidered: [],
    traversedEdges: [...traversedEdges],
    reason: `Priority Queue is empty. No path exists from ${startId} to ${goalId} (graph may be disconnected or goal unreachable).`,
    calculations: [`Unreachable goal: ${goalId}`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false,
    isFinal: true,
    pathFound: false,
    goalReached: false,
  }))

  return steps
}
