/**
 * astarEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Independent, pure A* Search simulation engine.
 * Combines cumulative path cost g(n) and heuristic estimate h(n) to evaluate f(n) = g(n) + h(n).
 * Generates detailed calculation steps and comparison reasoning.
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
 * Run A* Search on the given graph topology.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {object} [options]
 * @param {function} [options.heuristicFn] – custom heuristic (nodeA, nodeB) => number
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runAStar(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph

  // 1. Validation guards
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) {
    return steps
  }

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const hFunc = options.heuristicFn ?? euclideanHeuristic

  const computeH = (nodeId) => getNodeHeuristic(nodeId, graph)

  // 2. Data structures
  const visited = new Set()
  const gCost = { [startId]: 0 }
  const hCost = { [startId]: computeH(startId) }
  const fCost = { [startId]: gCost[startId] + hCost[startId] }
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: fCost[startId], g: gCost[startId], h: hCost[startId], f: fCost[startId] })

  const getFrontierNodes = () => pq.toArray().map(item => item.id)
  const getFrontierDetail = () => pq.toArray().map(item => ({
    nodeId: item.id,
    priority: item.priority,
    g: item.g,
    h: item.h,
    f: item.f,
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
      hCost,
      fCost,
      frontierDetail: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately!`,
      calculations: [
        `g(${startId}) = 0`,
        `h(${startId}) = 0`,
        `f(${startId}) = g(${startId}) + h(${startId}) = 0`,
      ],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    }))
    return steps
  }

  const startG = gCost[startId]
  const startH = hCost[startId]
  const startF = fCost[startId]

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
    hCost: { ...hCost },
    fCost: { ...fCost },
    frontierDetail: getFrontierDetail(),
    neighborsConsidered: [],
    reason: `Initialize A* Search: Add start node ${startId} to Priority Queue with evaluation f(${startId}) = g(${startId}) + h(${startId}) = ${startG} + ${startH} = ${startF}. A* selects the node with the lowest f(n).`,
    calculations: [
      `g(${startId}) = ${startG}`,
      `h(${startId}) = ${startH}`,
      `f(${startId}) = g(${startId}) + h(${startId})`,
      `f(${startId}) = ${startF}`,
    ],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  }))

  // ── A* Expansion Loop ──────────────────────────────────────────────────────
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
        gCost: { ...gCost },
        hCost: { ...hCost },
        fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        neighborsConsidered: [],
        reason: `Node ${current} popped from Priority Queue was skipped because it was already expanded via a lower f(n) path.`,
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
    const currentH = hCost[current] ?? computeH(current)
    const currentF = fCost[current] ?? (currentG + currentH)
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on expansion (guarantees optimal shortest path with admissible heuristic)
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
        hCost: { ...hCost },
        fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        neighborsConsidered: [],
        reason: `Goal node ${goalId} selected for expansion! A* selects ${goalId} because it has the lowest total evaluation f(${goalId}) = g+h = ${currentG}+${currentH} = ${currentF} among all open nodes. Solution path is optimal!`,
        calculations: [
          `g(${goalId}) = ${currentG}`,
          `h(${goalId}) = ${currentH}`,
          `f(${goalId}) = g(${goalId}) + h(${goalId})`,
          `f(${goalId}) = ${currentF}`,
          `Optimal path: ${pathNodes.join(' → ')}`,
        ],
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
      const tentativeG = currentG + weight
      const neighborH = computeH(neighborId)
      const tentativeF = tentativeG + neighborH

      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (!(neighborId in gCost) || tentativeG < gCost[neighborId]) {
        const isUpdate = neighborId in gCost
        gCost[neighborId] = tentativeG
        hCost[neighborId] = neighborH
        fCost[neighborId] = tentativeF
        parentMap[neighborId] = current

        pq.push({
          id: neighborId,
          priority: tentativeF,
          g: tentativeG,
          h: neighborH,
          f: tentativeF,
        })
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: isUpdate ? 'updated_in_frontier' : 'pushed_to_frontier',
        })
      } else {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'higher_cost_skipped',
        })
      }
    }

    const reasoning = current === startId
      ? `Node ${current} expanded as start node. Calculated f(n) = g(n) + h(n) for neighbors and pushed to Priority Queue.`
      : `Node ${current} is selected for expansion because A* selects the frontier node with the lowest total evaluation f(${current}) = g(${current}) + h(${current}) = ${currentG} + ${currentH} = ${currentF} among all open nodes.`

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
      hCost: { ...hCost },
      fCost: { ...fCost },
      frontierDetail: getFrontierDetail(),
      neighborsConsidered,
      traversedEdges: [...traversedEdges],
      reason: reasoning,
      calculations: [
        `g(${current}) = ${currentG}`,
        `h(${current}) = ${currentH}`,
        `f(${current}) = g(${current}) + h(${current})`,
        `f(${current}) = ${currentF}`,
      ],
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
    hCost: { ...hCost },
    fCost: { ...fCost },
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
