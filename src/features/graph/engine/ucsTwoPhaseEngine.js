/**
 * ucsTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase Uniform Cost Search (UCS) Simulation Engine.
 *
 * Alternates between:
 *  - PHASE A: VISIT_NODE (pops node with lowest g(n) cost from Priority Queue)
 *  - PHASE B: EXPLORE_NEIGHBORS (evaluates ALL outgoing edges of current node as ONE step, computes candidate g(n), updates Priority Queue)
 */

import { ACTION_TYPE } from '../types/graphTypes.js'
import { MinHeap } from '../utils/MinHeap.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

export function runUCSTwoPhase(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  const visited = new Set()
  const gCost = { [startId]: 0 }
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: 0, g: 0 })

  const getFrontierNodes = () => pq.toArray().map(item => item.id)
  const getFrontierDetail = () => pq.toArray().map(item => ({ nodeId: item.id, priority: item.priority, g: item.g }))
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
      gCost,
      frontierDetail: [],
      neighbors: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately with g(${startId}) = 0!`,
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
    gCost: { ...gCost },
    frontierDetail: getFrontierDetail(),
    neighbors: [],
    neighborsConsidered: [],
    reason: `Initialize UCS: Add start node ${startId} to Priority Queue with path cost g(${startId}) = 0. UCS always expands the lowest cumulative cost node.`,
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
        gCost: { ...gCost },
        frontierDetail: getFrontierDetail(),
        neighbors: [],
        neighborsConsidered: [],
        reason: `Node ${current} popped from Priority Queue was skipped because it was already expanded via a lower path cost.`,
        metrics: { nodesExpanded, pathLength: 0, totalCost: gCost[current] ?? 0, frontierSize: pq.size },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      })
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentG = gCost[current]
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on expansion (guarantees optimal path in UCS)
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
        gCost: { ...gCost },
        frontierDetail: getFrontierDetail(),
        neighbors: [],
        neighborsConsidered: [],
        reason: `Goal node ${goalId} popped from Priority Queue! g(${goalId}) = ${currentG}. Path is optimal! Path: ${pathNodes.join(' → ')}.`,
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: currentG, frontierSize: pq.size },
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
      gCost: { ...gCost },
      frontierDetail: getFrontierDetail(),
      traversedEdges: [...traversedEdges],
      neighbors: [],
      neighborsConsidered: [],
      reason: `UCS selects node ${current} with the lowest path cost g(${current}) = ${currentG} from Priority Queue.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentG, frontierSize: pq.size },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })

    // ── PHASE B: EXPLORE ALL NEIGHBORS ──────────────────────────────────────
    const rawNeighbors = getNeighbors(current, adj)
    const neighbors = []
    const neighborsConsidered = []
    const pqBeforeExplore = getFrontierNodes()

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      neighbors.push(neighborId)
      const newG = currentG + weight
      if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (!(neighborId in gCost) || newG < gCost[neighborId]) {
        const isUpdate = neighborId in gCost
        gCost[neighborId] = newG
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: newG, g: newG })
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

    const pqAfterExplore = getFrontierNodes()

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
      gCost: { ...gCost },
      frontierDetail: getFrontierDetail(),
      traversedEdges: [...traversedEdges],
      reason: neighbors.length > 0
        ? `Node ${current} evaluated all ${neighbors.length} neighbor edge(s). Calculated candidate path costs g(n) and updated Priority Queue.`
        : `Node ${current} has no outgoing edges.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentG, frontierSize: pq.size },
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
    gCost: { ...gCost },
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
