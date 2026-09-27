/**
 * ucsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Independent, pure Uniform Cost Search (UCS) simulation engine.
 * Expands the frontier node with the lowest cumulative path cost g(n).
 * Generates structured AlgorithmStep snapshots matching the standard schema.
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import { MinHeap } from '../utils/MinHeap.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run Uniform Cost Search on the given graph topology.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runUCS(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph

  // 1. Validation guards
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) {
    return steps
  }

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  // 2. Data structures
  const visited = new Set()
  const gCost = { [startId]: 0 }
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: 0, g: 0 })

  const getFrontierNodes = () => pq.toArray().map(item => item.id)
  const getFrontierDetail = () => pq.toArray().map(item => ({
    nodeId: item.id,
    priority: item.priority,
    g: item.g,
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
      gCost,
      frontierDetail: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately with path cost g(${startId}) = 0.`,
      calculations: [`g(${startId}) = 0`],
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
    gCost: { ...gCost },
    frontierDetail: getFrontierDetail(),
    neighborsConsidered: [],
    reason: `Initialize UCS: Add start node ${startId} to the Priority Queue with path cost g(${startId}) = 0. UCS always expands the node with the lowest cumulative path cost g(n).`,
    calculations: [`g(${startId}) = 0`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  }))

  // ── UCS Expansion Loop ─────────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const topItem = pq.pop()
    const current = topItem.id

    // Skip if already expanded/visited via a cheaper path
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
        gCost: { ...gCost },
        frontierDetail: getFrontierDetail(),
        neighborsConsidered: [],
        reason: `Node ${current} popped from Priority Queue was skipped because it was already expanded with a lower path cost g(${current}) = ${gCost[current]}.`,
        calculations: [`Skipped stale entry for ${current}`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: gCost[current] ?? 0, frontierSize: pq.size },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentG = gCost[current]
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on expansion (guarantees optimal shortest path in UCS)
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
        gCost: { ...gCost },
        frontierDetail: getFrontierDetail(),
        neighborsConsidered: [],
        reason: `Goal node ${goalId} selected for expansion! UCS selects ${goalId} because it has the lowest path cost g(${goalId}) = ${currentG} in the frontier. Path is optimal!`,
        calculations: [`Optimal path: ${pathNodes.join(' → ')}`, `Total path cost g(${goalId}) = ${currentG}`],
        metrics: {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost: currentG,
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
      const newG = currentG + weight

      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (!(neighborId in gCost) || newG < gCost[neighborId]) {
        // Shorter path found (relaxation step)
        const isUpdate = neighborId in gCost
        gCost[neighborId] = newG
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: newG, g: newG })
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: isUpdate ? 'updated_in_frontier' : 'pushed_to_frontier',
        })
      } else {
        // Path through current is longer or equal
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'higher_cost_skipped',
        })
      }
    }

    const reasoning = current === startId
      ? `Node ${current} expanded with initial path cost g(${current}) = 0. Evaluated neighbors and pushed to Priority Queue.`
      : `Node ${current} is selected for expansion because UCS selects the frontier node with the lowest cumulative path cost g(${current}) = ${currentG}.`

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
      gCost: { ...gCost },
      frontierDetail: getFrontierDetail(),
      neighborsConsidered,
      traversedEdges: [...traversedEdges],
      reason: reasoning,
      calculations: [`Current path cost g(${current}) = ${currentG}`],
      metrics: {
        nodesExpanded,
        pathLength: currentPath.length - 1,
        totalCost: currentG,
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
    gCost: { ...gCost },
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
