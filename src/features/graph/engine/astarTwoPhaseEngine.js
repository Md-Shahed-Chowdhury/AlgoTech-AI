/**
 * astarTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase A* Search Simulation Engine.
 *
 * Alternates between:
 *  - PHASE A: VISIT_NODE (pops node with lowest f(n) = g(n) + h(n) from Priority Queue)
 *  - PHASE B: EXPLORE_NEIGHBORS (evaluates ALL outgoing edges of current node as ONE step, computes g, h, f and updates Priority Queue)
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

export function runAStarTwoPhase(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const goalNode = nodes[goalId]
  const hFunc = options.heuristicFn ?? euclideanHeuristic

  const computeH = (nodeId) => Math.round(hFunc(nodes[nodeId], goalNode) * 10) / 10

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
  const getFrontierDetail = () => pq.toArray().map(item => ({ nodeId: item.id, priority: item.priority, g: item.g, h: item.h, f: item.f }))
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
      gCost, hCost, fCost,
      frontierDetail: [],
      neighbors: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately with f(${startId}) = 0!`,
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    })
    return steps
  }

  const sG = gCost[startId], sH = hCost[startId], sF = fCost[startId]
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
    hCost: { ...hCost },
    fCost: { ...fCost },
    frontierDetail: getFrontierDetail(),
    neighbors: [],
    neighborsConsidered: [],
    reason: `Initialize A* Search: Add start node ${startId} to Priority Queue with f(${startId}) = g(${sG}) + h(${sH}) = ${sF}. A* expands the node with the lowest f(n) score.`,
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
        hCost: { ...hCost },
        fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        neighbors: [],
        neighborsConsidered: [],
        reason: `Node ${current} popped from Priority Queue was skipped because it was already expanded via a lower-f path.`,
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
    const cG = gCost[current]
    const cH = hCost[current] ?? computeH(current)
    const cF = fCost[current] ?? (cG + cH)
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on expansion (guarantees optimal path in A*)
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
        hCost: { ...hCost },
        fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        neighbors: [],
        neighborsConsidered: [],
        reason: `Goal node ${goalId} popped from Priority Queue! f(${goalId}) = g(${cG}) + h(0) = ${cF}. A* guarantees this is the OPTIMAL path. Path: ${pathNodes.join(' → ')}.`,
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: cG, frontierSize: pq.size },
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
      hCost: { ...hCost },
      fCost: { ...fCost },
      frontierDetail: getFrontierDetail(),
      traversedEdges: [...traversedEdges],
      neighbors: [],
      neighborsConsidered: [],
      reason: `A* selects node ${current} with the lowest total score f(${current}) = g(${cG}) + h(${fmt(cH)}) = ${fmt(cF)} from Priority Queue.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: cG, frontierSize: pq.size },
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
      const tentG = cG + weight
      const tentH = computeH(neighborId)
      const tentF = tentG + tentH
      if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (!(neighborId in gCost) || tentG < gCost[neighborId]) {
        const isUpdate = neighborId in gCost
        gCost[neighborId] = tentG
        hCost[neighborId] = tentH
        fCost[neighborId] = tentF
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: tentF, g: tentG, h: tentH, f: tentF })
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: isUpdate ? 'updated_in_frontier' : (neighborId === goalId ? 'goal' : 'pushed_to_frontier'),
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
    const pushedIds = neighborsConsidered
      .filter(n => n.status === 'pushed_to_frontier' || n.status === 'updated_in_frontier' || n.status === 'goal')
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
      gCost: { ...gCost },
      hCost: { ...hCost },
      fCost: { ...fCost },
      frontierDetail: getFrontierDetail(),
      traversedEdges: [...traversedEdges],
      reason: neighbors.length > 0
        ? `Node ${current} evaluated all ${neighbors.length} outgoing neighbor edge(s). Computed g, h, f scores and updated Priority Queue with active nodes [${pushedIds.join(', ')}].`
        : `Node ${current} has no outgoing edges.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: cG, frontierSize: pq.size },
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
    hCost: { ...hCost },
    fCost: { ...fCost },
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
