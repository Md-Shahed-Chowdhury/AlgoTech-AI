/**
 * ucsMicroEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Micro-step Uniform Cost Search engine.
 *
 * Per node:
 *   SELECT_NODE (pop min-g from PQ)
 *   → EVALUATE_NEIGHBOR (×N)
 *       → DISCOVER_NODE / UPDATE_FRONTIER / SKIP_HIGHER_COST / ALREADY_VISITED
 */

import { ACTION_TYPE, NEIGHBOR_DECISION } from '../types/graphTypes.js'
import { MinHeap } from '../utils/MinHeap.js'
import { buildAdjacency, getNeighbors, reconstructPath, pathToEdges } from '../utils/graphUtils.js'

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
    gCost:         params.gCost         ?? {},
    hCost:         {},
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

export function runUCS(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph

  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  const visited    = new Set()
  const gCost      = { [startId]: 0 }
  const parentMap  = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: 0, g: 0 })

  const getFrontierNodes  = () => pq.toArray().map(i => i.id)
  const getFrontierDetail = () => pq.toArray().map(i => ({ nodeId: i.id, priority: i.priority, g: i.g }))
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
      gCost: { [startId]: 0 }, frontierDetail: [],
      frontierBefore: [], frontierAfter: [],
      reason: `Start and Goal are the same node (${startId}). g(${startId}) = 0.`,
      calculations: [`g(${startId}) = 0`],
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
    gCost: { ...gCost }, frontierDetail: getFrontierDetail(),
    frontierBefore: [], frontierAfter: getFrontierNodes(),
    reason: `UCS starts! Node ${startId} is added to the Priority Queue with g(${startId}) = 0. UCS always expands the node with the LOWEST accumulated path cost g(n).`,
    calculations: [`g(${startId}) = 0`, `Priority Queue: [(${startId}, g=0)]`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true, isFinal: false, pathFound: false, goalReached: false,
  }))

  // ── UCS Loop ──────────────────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const pqBeforePop = getFrontierNodes()
    const detailBeforePop = getFrontierDetail()

    const topItem = pq.pop()
    const current = topItem.id

    // Stale entry
    if (visited.has(current)) {
      steps.push(ms({
        stepIndex: steps.length, actionType: ACTION_TYPE.SKIP_VISITED,
        currentNode: current, visitedNodes: Array.from(visited),
        frontierNodes: getFrontierNodes(), discoveredNodes: Array.from(new Set([...visited, ...getFrontierNodes()])),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        gCost: { ...gCost }, frontierDetail: getFrontierDetail(),
        frontierBefore: pqBeforePop, frontierAfter: getFrontierNodes(),
        reason: `Node ${current} was popped but is already VISITED via a cheaper path g(${current}) = ${gCost[current]}. This is a stale duplicate in the Priority Queue. UCS skips it.`,
        calculations: [`Stale entry for ${current} — already visited`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: gCost[current] ?? 0, frontierSize: pq.size },
        isInitial: false, isFinal: false, pathFound: false, goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentG = gCost[current]
    const currentPath = reconstructPath(parentMap, current)
    const pqAfterPop = getFrontierNodes()

    // Goal test
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
        gCost: { ...gCost }, frontierDetail: getFrontierDetail(),
        frontierBefore: pqBeforePop, frontierAfter: pqAfterPop,
        reason: `Goal node ${goalId} is popped from the Priority Queue with g(${goalId}) = ${currentG}. UCS guarantees this is the OPTIMAL (minimum cost) path! Path: ${pathNodes.join(' → ')}.`,
        calculations: [`Optimal path: ${pathNodes.join(' → ')}`, `Total cost g(${goalId}) = ${currentG}`],
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: currentG, frontierSize: pq.size },
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
      gCost: { ...gCost }, frontierDetail: getFrontierDetail(),
      frontierBefore: pqBeforePop, frontierAfter: pqAfterPop,
      reason: `Node ${current} is selected from the Priority Queue because it has the LOWEST path cost g(${current}) = ${currentG} among all frontier nodes. UCS now explores ${current}'s neighbors.`,
      calculations: [`g(${current}) = ${currentG}`, `PQ after pop: [${pqAfterPop.join(', ')}]`],
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentG, frontierSize: pq.size },
      isInitial: false, isFinal: false, pathFound: false, goalReached: false,
    }))

    // ── Evaluate each neighbor individually ──
    const rawNeighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      const pqSnapshot = getFrontierNodes()
      const detailSnapshot = getFrontierDetail()
      const newG = currentG + weight
      let actionType, decision, reason, calculations

      if (visited.has(neighborId)) {
        actionType = ACTION_TYPE.EVALUATE_NEIGHBOR
        decision   = NEIGHBOR_DECISION.ALREADY_VISITED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already VISITED with optimal cost g(${neighborId}) = ${gCost[neighborId]}. Skip.`
        calculations = [`New candidate cost: ${currentG} + ${weight} = ${newG}`, `${neighborId} already visited — skip`]

      } else if (!(neighborId in gCost) || newG < gCost[neighborId]) {
        const isUpdate = neighborId in gCost
        const oldG = gCost[neighborId]
        gCost[neighborId] = newG
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: newG, g: newG })
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        if (isUpdate) {
          actionType = ACTION_TYPE.UPDATE_FRONTIER
          decision   = NEIGHBOR_DECISION.UPDATE_COST
          reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Found a SHORTER path! Old g(${neighborId}) = ${oldG}, new g(${neighborId}) = ${newG} (via ${current}). Priority Queue updated.`
          calculations = [`Old g(${neighborId}) = ${oldG}`, `New path: ${currentG} + ${weight} = ${newG}`, `g(${neighborId}) updated to ${newG}`]
        } else {
          actionType = ACTION_TYPE.DISCOVER_NODE
          decision   = neighborId === goalId ? NEIGHBOR_DECISION.GOAL : NEIGHBOR_DECISION.DISCOVERED
          reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is newly discovered! Path cost g(${neighborId}) = ${currentG} + ${weight} = ${newG}. Added to Priority Queue.`
          calculations = [`g(${neighborId}) = g(${current}) + w(${current},${neighborId})`, `g(${neighborId}) = ${currentG} + ${weight} = ${newG}`]
        }

      } else {
        actionType = ACTION_TYPE.SKIP_HIGHER_COST
        decision   = NEIGHBOR_DECISION.SKIP_HIGHER_COST
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Existing path to ${neighborId} is CHEAPER: g(${neighborId}) = ${gCost[neighborId]} ≤ new candidate ${newG}. No update needed.`
        calculations = [`Candidate: ${currentG} + ${weight} = ${newG}`, `Existing: g(${neighborId}) = ${gCost[neighborId]}`, `${newG} ≥ ${gCost[neighborId]} — skip`]
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
        gCost: { ...gCost }, frontierDetail: getFrontierDetail(),
        frontierBefore: pqSnapshot, frontierAfter: getFrontierNodes(),
        decision, reason, calculations,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentG, frontierSize: pq.size },
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
    gCost: { ...gCost }, frontierDetail: [],
    frontierBefore: [], frontierAfter: [],
    reason: `Priority Queue is empty. No path exists from ${startId} to ${goalId}.`,
    calculations: [`PQ empty — no path found`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false, isFinal: true, pathFound: false, goalReached: false,
  }))

  return steps
}
