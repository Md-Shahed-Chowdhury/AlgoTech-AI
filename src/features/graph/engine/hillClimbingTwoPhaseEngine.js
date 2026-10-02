/**
 * hillClimbingTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase Hill Climbing (Local Search) Simulation Engine.
 *
 * True Local Search / Optimization:
 *  - Maintains a SINGLE active current state (no global Priority Queue / Open Set).
 *  - At each step, inspects ONLY immediate outgoing neighbors of the current node.
 *  - Evaluates heuristic h(neighbor) against h(current). (Lower h is better, h(goal) = 0).
 *  - Selects the best strictly improving neighbor (h(neighbor) < h(current)).
 *  - Deterministic tie-breaking: sorts candidate neighbors alphabetically by node ID.
 *  - Distinguishes 5 stopping conditions:
 *      1. Goal Reached (current === goalId)
 *      2. Moving to Better Neighbor (h(neighbor) < h(current))
 *      3. Local Optimum / No Better Neighbor (all neighbors strictly worse, h > h(current))
 *      4. Plateau / Equal Heuristic (best neighbor h === h(current), no strictly better neighbor)
 *      5. No Neighbors (current node has 0 valid outgoing edges)
 */

import { ACTION_TYPE } from '../types/graphTypes.js'
import {
  buildAdjacency,
  getNeighbors,
  getNodeHeuristic,
  reconstructPath,
  pathToEdges,
  calculatePathCost,
} from '../utils/graphUtils.js'

const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : String(n ?? 0))

export function runHillClimbingTwoPhase(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  const computeH = (nodeId) => getNodeHeuristic(nodeId, graph)

  let current = startId
  const visited = new Set([startId])
  const hCost = { [startId]: computeH(startId) }
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const getUnexplored = () => allNodeIds.filter(id => !visited.has(id))

  // Helper function to evaluate immediate neighbors of a node deterministically
  const evalNeighborsOf = (nodeId) => {
    const currentH = hCost[nodeId] ?? computeH(nodeId)
    const rawNeighbors = getNeighbors(nodeId, adj)
    // Deterministic tie-breaking order (alphabetical by neighborId)
    rawNeighbors.sort((a, b) => a.neighborId.localeCompare(b.neighborId))

    const neighbors = rawNeighbors.map(n => n.neighborId)
    const neighborsConsidered = []
    const frontierDetail = []

    let bestNeighbor = null
    let bestH = Infinity

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      const nH = computeH(neighborId)
      hCost[neighborId] = nH
      frontierDetail.push({ nodeId: neighborId, priority: nH, h: nH })

      const delta = nH - currentH
      const isVisited = visited.has(neighborId)

      let status = 'worse'
      if (isVisited) {
        status = 'already_visited'
      } else if (nH < currentH) {
        status = 'improving'
        if (nH < bestH) {
          bestH = nH
          bestNeighbor = neighborId
        }
      } else if (nH === currentH) {
        status = 'equal'
      } else {
        status = 'worse'
      }

      neighborsConsidered.push({
        neighborId,
        edgeId,
        weight,
        hValue: nH,
        currentH,
        delta,
        status,
      })
    }

    return {
      rawNeighbors,
      neighbors,
      neighborsConsidered,
      frontierDetail,
      bestNeighbor,
      bestH,
      currentH,
    }
  }

  // ── Step 0: INITIALIZE ──────────────────────────────────────────────────
  const initEval = evalNeighborsOf(startId)

  if (startId === goalId) {
    steps.push({
      stepIndex: 0,
      stepType: ACTION_TYPE.INITIALIZE_GOAL,
      action: ACTION_TYPE.INITIALIZE_GOAL,
      currentNode: startId,
      selectedNode: startId,
      visitedNodes: [startId],
      frontierNodes: initEval.neighbors,
      discoveredNodes: [startId],
      unexploredNodes: allNodeIds.filter(id => id !== startId),
      parentMap: { [startId]: null },
      currentPath: [startId],
      pathNodes: [startId],
      pathEdges: [],
      hCost,
      frontierDetail: initEval.frontierDetail,
      neighbors: initEval.neighbors,
      neighborsConsidered: initEval.neighborsConsidered,
      algorithmSpecificState: {
        currentH: initEval.currentH,
        candidateCount: initEval.neighbors.length,
        bestCandidate: null,
        selectedNeighbor: null,
        heuristicImproved: null,
        localOptimumStatus: 'Goal Reached',
        trajectory: [startId],
      },
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately!`,
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: initEval.neighbors.length },
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
    visitedNodes: [startId],
    frontierNodes: initEval.neighbors,
    unexploredNodes: getUnexplored(),
    discoveredNodes: [startId],
    parentMap: { ...parentMap },
    currentPath: [startId],
    hCost: { ...hCost },
    frontierDetail: initEval.frontierDetail,
    neighbors: initEval.neighbors,
    neighborsConsidered: initEval.neighborsConsidered,
    algorithmSpecificState: {
      currentH: initEval.currentH,
      candidateCount: initEval.neighbors.length,
      bestCandidate: initEval.bestNeighbor,
      bestCandidateH: initEval.bestNeighbor ? initEval.bestH : null,
      selectedNeighbor: initEval.bestNeighbor,
      heuristicImproved: null,
      localOptimumStatus: initEval.neighbors.length === 0 ? 'No Neighbors' : 'Searching Improving Neighbor',
      trajectory: [startId],
    },
    reason: `Initialize Hill Climbing: Starting local search at node ${startId} with heuristic h(${startId}) = ${fmt(initEval.currentH)}. Evaluates immediate neighbors and moves only to strictly improving states.`,
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: initEval.neighbors.length },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  })

  // ── Local Search Step Loop ───────────────────────────────────────────────
  while (true) {
    const currentH = hCost[current] ?? computeH(current)
    const currentPath = reconstructPath(parentMap, current)
    const trajectoryCost = calculatePathCost(currentPath, graph)

    // Goal Check on active node
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      const cost = calculatePathCost(pathNodes, graph)
      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.GOAL_REACHED,
        action: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId,
        selectedNode: goalId,
        visitedNodes: Array.from(visited),
        frontierNodes: [],
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(visited),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        hCost: { ...hCost },
        frontierDetail: [],
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: {
          currentH,
          candidateCount: 0,
          bestCandidate: null,
          selectedNeighbor: null,
          heuristicImproved: true,
          localOptimumStatus: 'Goal Reached',
          trajectory: Array.from(visited),
        },
        reason: `Goal node ${goalId} reached via Hill Climbing local search trajectory! Path length: ${pathNodes.length - 1} steps.`,
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: cost, frontierSize: 0 },
        isInitial: false,
        isFinal: true,
        pathFound: true,
        goalReached: true,
      })
      return steps
    }

    const {
      rawNeighbors,
      neighbors,
      neighborsConsidered,
      frontierDetail,
      bestNeighbor,
      bestH,
    } = evalNeighborsOf(current)

    // ── PHASE A: VISIT_NODE ──────────────────────────────────────────────
    nodesExpanded++
    steps.push({
      stepIndex: steps.length,
      stepType: ACTION_TYPE.VISIT_NODE,
      action: ACTION_TYPE.VISIT_NODE,
      currentNode: current,
      selectedNode: current,
      visitedNodes: Array.from(visited),
      frontierNodes: neighbors,
      unexploredNodes: getUnexplored(),
      discoveredNodes: Array.from(visited),
      parentMap: { ...parentMap },
      currentPath,
      hCost: { ...hCost },
      frontierDetail,
      traversedEdges: [...traversedEdges],
      neighbors,
      neighborsConsidered,
      algorithmSpecificState: {
        currentH,
        candidateCount: rawNeighbors.length,
        bestCandidate: bestNeighbor,
        bestCandidateH: bestNeighbor ? bestH : null,
        selectedNeighbor: bestNeighbor,
        heuristicImproved: null,
        localOptimumStatus: rawNeighbors.length === 0 ? 'No Neighbors' : 'Evaluating Candidate Neighbors',
        trajectory: Array.from(visited),
      },
      reason: `Hill Climbing inspecting active node ${current} with heuristic h(${current}) = ${fmt(currentH)}. Evaluates ${rawNeighbors.length} immediate neighbor(s).`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: trajectoryCost, frontierSize: neighbors.length },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })

    // ── PHASE B: EXPLORE & EVALUATE NEIGHBORS ─────────────────────────────

    // CASE 5: No neighbors at all
    if (rawNeighbors.length === 0) {
      steps.push({
        stepIndex: steps.length,
        stepType: 'LOCAL_OPTIMUM',
        action: 'LOCAL_OPTIMUM',
        currentNode: current,
        selectedNode: current,
        visitedNodes: Array.from(visited),
        frontierNodes: [],
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(visited),
        parentMap: { ...parentMap },
        currentPath,
        hCost: { ...hCost },
        frontierDetail: [],
        traversedEdges: [...traversedEdges],
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: {
          currentH,
          candidateCount: 0,
          bestCandidate: null,
          selectedNeighbor: null,
          heuristicImproved: false,
          localOptimumStatus: 'No Neighbors',
          trajectory: Array.from(visited),
        },
        reason: `Node ${current} has no outgoing neighbors. Hill Climbing terminated search.`,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: trajectoryCost, frontierSize: 0 },
        isInitial: false,
        isFinal: true,
        pathFound: false,
        goalReached: false,
      })
      return steps
    }

    // CASE 2: Strictly improving neighbor exists (bestH < currentH)
    if (bestNeighbor !== null && bestH < currentH) {
      const bestEdge = rawNeighbors.find(n => n.neighborId === bestNeighbor)
      if (bestEdge && !traversedEdges.includes(bestEdge.edgeId)) {
        traversedEdges.push(bestEdge.edgeId)
      }

      parentMap[bestNeighbor] = current
      visited.add(bestNeighbor)
      const nextTrajectory = reconstructPath(parentMap, bestNeighbor)
      const nextCost = calculatePathCost(nextTrajectory, graph)

      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.EXPLORE_NEIGHBORS,
        action: ACTION_TYPE.EXPLORE_NEIGHBORS,
        currentNode: current,
        parentNode: current,
        selectedNode: bestNeighbor,
        neighbors,
        neighborsConsidered,
        visitedNodes: Array.from(visited),
        frontierNodes: neighbors,
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(visited),
        parentMap: { ...parentMap },
        currentPath: nextTrajectory,
        hCost: { ...hCost },
        frontierDetail,
        traversedEdges: [...traversedEdges],
        algorithmSpecificState: {
          currentH,
          candidateCount: rawNeighbors.length,
          bestCandidate: bestNeighbor,
          bestCandidateH: bestH,
          selectedNeighbor: bestNeighbor,
          heuristicImproved: true,
          localOptimumStatus: 'Moving to Better Neighbor',
          trajectory: Array.from(visited),
        },
        reason: `Node ${current} (h=${fmt(currentH)}) evaluated ${rawNeighbors.length} neighbor(s). Selected best improving neighbor ${bestNeighbor} with strictly lower heuristic h(${bestNeighbor}) = ${fmt(bestH)} (${fmt(bestH)} < ${fmt(currentH)}).`,
        metrics: { nodesExpanded, pathLength: nextTrajectory.length - 1, totalCost: nextCost, frontierSize: rawNeighbors.length },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      })

      // Advance to best neighbor
      current = bestNeighbor
      continue
    }

    // Find overall best neighbor among all neighbors to distinguish Plateau vs Local Optimum
    const minNeighbor = rawNeighbors.reduce((min, cur) => (computeH(cur.neighborId) < computeH(min.neighborId) ? cur : min), rawNeighbors[0])
    const minH = computeH(minNeighbor.neighborId)

    if (minH === currentH) {
      // CASE 4: Plateau (Equal Heuristic)
      steps.push({
        stepIndex: steps.length,
        stepType: 'LOCAL_OPTIMUM',
        action: 'LOCAL_OPTIMUM',
        currentNode: current,
        selectedNode: current,
        visitedNodes: Array.from(visited),
        frontierNodes: neighbors,
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(visited),
        parentMap: { ...parentMap },
        currentPath,
        hCost: { ...hCost },
        frontierDetail,
        traversedEdges: [...traversedEdges],
        neighbors,
        neighborsConsidered,
        algorithmSpecificState: {
          currentH,
          candidateCount: rawNeighbors.length,
          bestCandidate: minNeighbor.neighborId,
          bestCandidateH: minH,
          selectedNeighbor: null,
          heuristicImproved: false,
          localOptimumStatus: 'Plateau / Equal Heuristic',
          trajectory: Array.from(visited),
        },
        reason: `The best neighboring state ${minNeighbor.neighborId} has heuristic h(${minNeighbor.neighborId}) = ${fmt(minH)}, which equals current node ${current} (h=${fmt(currentH)}). Because this implementation requires strict improvement, Hill Climbing stops at a plateau.`,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: trajectoryCost, frontierSize: 0 },
        isInitial: false,
        isFinal: true,
        pathFound: false,
        goalReached: false,
      })
      return steps
    } else {
      // CASE 3: Local Optimum (All neighbors strictly worse)
      steps.push({
        stepIndex: steps.length,
        stepType: 'LOCAL_OPTIMUM',
        action: 'LOCAL_OPTIMUM',
        currentNode: current,
        selectedNode: current,
        visitedNodes: Array.from(visited),
        frontierNodes: neighbors,
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(visited),
        parentMap: { ...parentMap },
        currentPath,
        hCost: { ...hCost },
        frontierDetail,
        traversedEdges: [...traversedEdges],
        neighbors,
        neighborsConsidered,
        algorithmSpecificState: {
          currentH,
          candidateCount: rawNeighbors.length,
          bestCandidate: null,
          selectedNeighbor: null,
          heuristicImproved: false,
          localOptimumStatus: 'Local Optimum / No Better Neighbor',
          trajectory: Array.from(visited),
        },
        reason: `Hill Climbing is stuck at a local optimum at node ${current} with heuristic h(${current}) = ${fmt(currentH)}. Evaluated ${rawNeighbors.length} candidate neighbor(s), but none offer a strictly lower heuristic value. Terminating search.`,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: trajectoryCost, frontierSize: 0 },
        isInitial: false,
        isFinal: true,
        pathFound: false,
        goalReached: false,
      })
      return steps
    }
  }
}
