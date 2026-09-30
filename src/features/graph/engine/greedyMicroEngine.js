/**
 * greedyMicroEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Micro-step Greedy Best-First Search engine.
 * Selects the node with the lowest heuristic h(n) from the priority queue.
 * Per neighbor: evaluates and either discovers or skips.
 */

import { ACTION_TYPE, NEIGHBOR_DECISION } from '../types/graphTypes.js'
import { MinHeap } from '../utils/MinHeap.js'
import { buildAdjacency, getNeighbors, euclideanHeuristic, getNodeHeuristic, reconstructPath, pathToEdges } from '../utils/graphUtils.js'

function ms(params) {
  const actionType = params.actionType ?? ACTION_TYPE.SELECT_NODE
  return {
    stepIndex:          params.stepIndex ?? 0,
    actionType,
    action:             actionType,
    currentNode:        params.currentNode        ?? null,
    parentNode:         params.parentNode         ?? null,
    neighborNode:       params.neighborNode       ?? null,
    edgeBeingExplored:  params.edgeBeingExplored  ?? null,
    visitedNodes:       params.visitedNodes       ?? [],
    frontierNodes:      params.frontierNodes      ?? [],
    discoveredNodes:    params.discoveredNodes     ?? [],
    unexploredNodes:    params.unexploredNodes     ?? [],
    currentPath:        params.currentPath        ?? [],
    parentMap:          params.parentMap          ?? {},
    traversedEdges:     params.traversedEdges     ?? [],
    pathNodes:          params.pathNodes          ?? [],
    pathEdges:          params.pathEdges          ?? [],
    frontierBefore:     params.frontierBefore     ?? [],
    frontierAfter:      params.frontierAfter      ?? [],
    decision:           params.decision           ?? null,
    neighborsConsidered: params.neighborsConsidered ?? [],
    algorithmSpecificState: params.algorithmSpecificState ?? {},
    gCost:         {},
    hCost:         params.hCost ?? {},
    fCost:         {},
    frontierDetail: params.frontierDetail ?? [],
    reason:       params.reason       ?? '',
    calculations: params.calculations ?? [],
    metrics: {
      nodesExpanded: params.metrics?.nodesExpanded ?? 0,
      pathLength:    params.metrics?.pathLength    ?? 0,
      totalCost:     params.metrics?.totalCost     ?? 0,
      frontierSize:  params.metrics?.frontierSize  ?? 0,
    },
    isInitial:   params.isInitial   ?? false,
    isFinal:     params.isFinal     ?? false,
    pathFound:   params.pathFound   ?? false,
    goalReached: params.goalReached ?? false,
  }
}

export function runGreedy(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph

  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const hFunc = options.heuristicFn ?? euclideanHeuristic

  const computeH = (nodeId) => getNodeHeuristic(nodeId, graph)

  const visited    = new Set()
  const hCost      = { [startId]: computeH(startId) }
  const parentMap  = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: hCost[startId], h: hCost[startId] })

  const getFrontierNodes  = () => pq.toArray().map(i => i.id)
  const getFrontierDetail = () => pq.toArray().map(i => ({ nodeId: i.id, priority: i.priority, h: i.h }))
  const getUnexplored     = () => { const f = new Set(getFrontierNodes()); return allNodeIds.filter(id => !visited.has(id) && !f.has(id)) }

  // ── INITIALIZE ────────────────────────────────────────────────────────────
  if (startId === goalId) {
    visited.add(startId)
    steps.push(ms({
      stepIndex: 0, actionType: ACTION_TYPE.INITIALIZE_GOAL,
      currentNode: startId, visitedNodes: [startId], frontierNodes: [],
      discoveredNodes: [startId], unexploredNodes: allNodeIds.filter(id => id !== startId),
      parentMap: { [startId]: null }, currentPath: [startId],
      pathNodes: [startId], pathEdges: [],
      hCost: { [startId]: 0 }, frontierDetail: [],
      frontierBefore: [], frontierAfter: [],
      reason: `Start and Goal are the same node (${startId}).`,
      calculations: [`h(${startId}) = 0`],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true, isFinal: true, pathFound: true, goalReached: true,
    }))
    return steps
  }

  steps.push(ms({
    stepIndex: 0, actionType: ACTION_TYPE.INITIALIZE,
    currentNode: startId, visitedNodes: [], frontierNodes: getFrontierNodes(),
    discoveredNodes: [startId], unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap }, currentPath: [startId],
    hCost: { ...hCost }, frontierDetail: getFrontierDetail(),
    frontierBefore: [], frontierAfter: getFrontierNodes(),
    reason: `Greedy Best-First Search starts! Node ${startId} is added to Priority Queue with h(${startId}) = ${hCost[startId]}. Greedy always picks the node that LOOKS closest to the goal (lowest h).`,
    calculations: [`h(${startId}) = ${hCost[startId]}`, `Priority Queue: [(${startId}, h=${hCost[startId]})]`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true, isFinal: false, pathFound: false, goalReached: false,
  }))

  // ── Greedy Loop ───────────────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const pqBeforePop = getFrontierNodes()

    const topItem = pq.pop()
    const current = topItem.id

    if (visited.has(current)) {
      steps.push(ms({
        stepIndex: steps.length, actionType: ACTION_TYPE.SKIP_VISITED,
        currentNode: current, visitedNodes: Array.from(visited),
        frontierNodes: getFrontierNodes(), discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        hCost: { ...hCost }, frontierDetail: getFrontierDetail(),
        frontierBefore: pqBeforePop, frontierAfter: getFrontierNodes(),
        reason: `Node ${current} was popped but is already VISITED. Stale duplicate in Priority Queue. Greedy skips it.`,
        calculations: [`${current} already visited — skip`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
        isInitial: false, isFinal: false, pathFound: false, goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentH = hCost[current] ?? computeH(current)
    const currentPath = reconstructPath(parentMap, current)
    const pqAfterPop = getFrontierNodes()

    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      steps.push(ms({
        stepIndex: steps.length, actionType: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId, visitedNodes: Array.from(visited),
        frontierNodes: getFrontierNodes(), discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath: pathNodes, pathNodes, pathEdges,
        traversedEdges: [...traversedEdges],
        hCost: { ...hCost }, frontierDetail: getFrontierDetail(),
        frontierBefore: pqBeforePop, frontierAfter: pqAfterPop,
        reason: `Goal node ${goalId} is popped! h(${goalId}) = 0 (we reached the goal). Path: ${pathNodes.join(' → ')}. Note: Greedy does NOT guarantee an optimal path.`,
        calculations: [`Solution path: ${pathNodes.join(' → ')}`, `h(${goalId}) = 0`],
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: pathNodes.length - 1, frontierSize: pq.size },
        isInitial: false, isFinal: true, pathFound: true, goalReached: true,
      }))
      return steps
    }

    // SELECT_NODE step
    steps.push(ms({
      stepIndex: steps.length, actionType: ACTION_TYPE.SELECT_NODE,
      currentNode: current, visitedNodes: Array.from(visited),
      frontierNodes: pqAfterPop, discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
      unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      hCost: { ...hCost }, frontierDetail: getFrontierDetail(),
      frontierBefore: pqBeforePop, frontierAfter: pqAfterPop,
      reason: `Node ${current} is selected because it has the LOWEST heuristic h(${current}) = ${currentH}. Greedy uses h(n) as a compass pointing toward the goal. Now evaluating ${current}'s neighbors.`,
      calculations: [`h(${current}) = ${currentH} (lowest in Priority Queue)`],
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: pq.size },
      isInitial: false, isFinal: false, pathFound: false, goalReached: false,
    }))

    // ── Evaluate neighbors ──
    const rawNeighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      const pqSnapshot = getFrontierNodes()
      const neighborH = computeH(neighborId)
      let actionType, decision, reason, calculations

      if (visited.has(neighborId)) {
        actionType = ACTION_TYPE.EVALUATE_NEIGHBOR
        decision   = NEIGHBOR_DECISION.ALREADY_VISITED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already VISITED. Skip.`
        calculations = [`${neighborId} already visited — skip`]

      } else if (neighborId in hCost) {
        actionType = ACTION_TYPE.SKIP_ALREADY_DISCOVERED
        decision   = NEIGHBOR_DECISION.ALREADY_DISCOVERED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already in the Priority Queue with h(${neighborId}) = ${hCost[neighborId]}. Greedy does not update heuristic — skip.`
        calculations = [`${neighborId} already in PQ with h=${hCost[neighborId]} — skip`]

      } else {
        hCost[neighborId] = neighborH
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: neighborH, h: neighborH })
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        actionType = ACTION_TYPE.DISCOVER_NODE
        decision   = neighborId === goalId ? NEIGHBOR_DECISION.GOAL : NEIGHBOR_DECISION.DISCOVERED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is newly discovered! h(${neighborId}) = ${neighborH} (estimated distance to goal). Added to Priority Queue.`
        calculations = [`h(${neighborId}) = Euclidean distance to ${goalId} = ${neighborH}`, `Added to Priority Queue`]
      }

      steps.push(ms({
        stepIndex: steps.length, actionType,
        currentNode: current, parentNode: current, neighborNode: neighborId,
        edgeBeingExplored: edgeId,
        visitedNodes: Array.from(visited), frontierNodes: getFrontierNodes(),
        discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath,
        traversedEdges: [...traversedEdges],
        hCost: { ...hCost }, frontierDetail: getFrontierDetail(),
        frontierBefore: pqSnapshot, frontierAfter: getFrontierNodes(),
        decision, reason, calculations,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: pq.size },
        isInitial: false, isFinal: false, pathFound: false, goalReached: false,
      }))
    }
  }

  // ── NO_PATH ───────────────────────────────────────────────────────────────
  steps.push(ms({
    stepIndex: steps.length, actionType: ACTION_TYPE.NO_PATH,
    currentNode: null, visitedNodes: Array.from(visited),
    frontierNodes: [], discoveredNodes: Array.from(visited),
    unexploredNodes: getUnexplored(), parentMap: { ...parentMap }, currentPath: [],
    hCost: { ...hCost }, frontierDetail: [],
    frontierBefore: [], frontierAfter: [],
    reason: `Priority Queue is empty. No path exists from ${startId} to ${goalId}.`,
    calculations: [`PQ empty — no path found`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false, isFinal: true, pathFound: false, goalReached: false,
  }))

  return steps
}
