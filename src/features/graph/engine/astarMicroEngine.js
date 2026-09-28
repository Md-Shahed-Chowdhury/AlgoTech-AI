/**
 * astarMicroEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Micro-step A* Search engine.
 * Evaluates f(n) = g(n) + h(n) for each node.
 * Per neighbor: computes g, h, f then decides whether to add/update frontier.
 */

import { ACTION_TYPE, NEIGHBOR_DECISION } from '../types/graphTypes.js'
import { MinHeap } from '../utils/MinHeap.js'
import { buildAdjacency, getNeighbors, euclideanHeuristic, reconstructPath, pathToEdges } from '../utils/graphUtils.js'

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
    gCost:         params.gCost ?? {},
    hCost:         params.hCost ?? {},
    fCost:         params.fCost ?? {},
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

const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? n : n.toFixed(1)) : n)

export function runAStar(graph, options = {}) {
  const steps = []
  const { startId, goalId, nodes } = graph

  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const goalNode = nodes[goalId]
  const hFunc = options.heuristicFn ?? euclideanHeuristic

  const computeH = (nodeId) => Math.round(hFunc(nodes[nodeId], goalNode) * 10) / 10

  const visited    = new Set()
  const gCost      = { [startId]: 0 }
  const hCost      = { [startId]: computeH(startId) }
  const fCost      = { [startId]: gCost[startId] + hCost[startId] }
  const parentMap  = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const pq = new MinHeap()
  pq.push({ id: startId, priority: fCost[startId], g: gCost[startId], h: hCost[startId], f: fCost[startId] })

  const getFrontierNodes  = () => pq.toArray().map(i => i.id)
  const getFrontierDetail = () => pq.toArray().map(i => ({ nodeId: i.id, priority: i.priority, g: i.g, h: i.h, f: i.f }))
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
      gCost: { [startId]: 0 }, hCost: { [startId]: 0 }, fCost: { [startId]: 0 },
      frontierDetail: [],
      frontierBefore: [], frontierAfter: [],
      reason: `Start and Goal are the same node (${startId}). f(${startId}) = g=0 + h=0 = 0.`,
      calculations: [`g(${startId}) = 0`, `h(${startId}) = 0`, `f(${startId}) = 0`],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true, isFinal: true, pathFound: true, goalReached: true,
    }))
    return steps
  }

  const sG = gCost[startId], sH = hCost[startId], sF = fCost[startId]
  steps.push(ms({
    stepIndex: 0, actionType: ACTION_TYPE.INITIALIZE,
    currentNode: startId, visitedNodes: [], frontierNodes: getFrontierNodes(),
    discoveredNodes: [startId], unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap }, currentPath: [startId],
    gCost: { ...gCost }, hCost: { ...hCost }, fCost: { ...fCost },
    frontierDetail: getFrontierDetail(),
    frontierBefore: [], frontierAfter: getFrontierNodes(),
    reason: `A* starts! Node ${startId} added to Priority Queue. f(${startId}) = g(${sG}) + h(${sH}) = ${sF}. A* picks the node with the LOWEST f(n) at each step.`,
    calculations: [`g(${startId}) = ${sG}`, `h(${startId}) = ${sH}`, `f(${startId}) = ${sG} + ${sH} = ${sF}`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true, isFinal: false, pathFound: false, goalReached: false,
  }))

  // ── A* Loop ───────────────────────────────────────────────────────────────
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
        gCost: { ...gCost }, hCost: { ...hCost }, fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        frontierBefore: pqBeforePop, frontierAfter: getFrontierNodes(),
        reason: `Node ${current} was popped from Priority Queue but is already CLOSED (visited via a lower-f path). Stale entry — A* skips it.`,
        calculations: [`Stale entry for ${current} — skip`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: gCost[current] ?? 0, frontierSize: pq.size },
        isInitial: false, isFinal: false, pathFound: false, goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++
    const cG = gCost[current]
    const cH = hCost[current] ?? computeH(current)
    const cF = fCost[current] ?? (cG + cH)
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
        gCost: { ...gCost }, hCost: { ...hCost }, fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        frontierBefore: pqBeforePop, frontierAfter: pqAfterPop,
        reason: `Goal node ${goalId} is selected! f(${goalId}) = g(${cG}) + h(0) = ${cF}. A* guarantees this is the OPTIMAL path (with admissible heuristic). Path: ${pathNodes.join(' → ')}.`,
        calculations: [`g(${goalId}) = ${cG}`, `h(${goalId}) = 0`, `f(${goalId}) = ${cF}`, `Optimal path: ${pathNodes.join(' → ')}`],
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: cG, frontierSize: pq.size },
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
      gCost: { ...gCost }, hCost: { ...hCost }, fCost: { ...fCost },
      frontierDetail: getFrontierDetail(),
      frontierBefore: pqBeforePop, frontierAfter: pqAfterPop,
      reason: `Node ${current} is selected because f(${current}) = g(${cG}) + h(${fmt(cH)}) = ${fmt(cF)} is the LOWEST f-score in the Priority Queue. A* now evaluates ${current}'s neighbors.`,
      calculations: [`g(${current}) = ${cG}`, `h(${current}) = ${fmt(cH)}`, `f(${current}) = ${cG} + ${fmt(cH)} = ${fmt(cF)}`],
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: cG, frontierSize: pq.size },
      isInitial: false, isFinal: false, pathFound: false, goalReached: false,
    }))

    // ── Evaluate each neighbor individually ──
    const rawNeighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      const pqSnapshot = getFrontierNodes()
      const tentG = cG + weight
      const tentH = computeH(neighborId)
      const tentF = tentG + tentH
      let actionType, decision, reason, calculations

      if (visited.has(neighborId)) {
        actionType = ACTION_TYPE.EVALUATE_NEIGHBOR
        decision   = NEIGHBOR_DECISION.ALREADY_VISITED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is CLOSED (already expanded with optimal g=${gCost[neighborId]}). Skip.`
        calculations = [
          `Candidate: g(${current}) + w = ${cG} + ${weight} = ${tentG}`,
          `${neighborId} already closed — skip`,
        ]

      } else if (!(neighborId in gCost) || tentG < gCost[neighborId]) {
        const isUpdate = neighborId in gCost
        const oldG = gCost[neighborId]
        const oldF = fCost[neighborId]

        gCost[neighborId] = tentG
        hCost[neighborId] = tentH
        fCost[neighborId] = tentF
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: tentF, g: tentG, h: tentH, f: tentF })
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        if (isUpdate) {
          actionType = ACTION_TYPE.UPDATE_FRONTIER
          decision   = NEIGHBOR_DECISION.UPDATE_COST
          reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Found a BETTER path! Old f(${neighborId}) = ${fmt(oldF)}, new f(${neighborId}) = ${fmt(tentG)} + ${fmt(tentH)} = ${fmt(tentF)}. Priority Queue updated.`
          calculations = [
            `Old: g(${neighborId}) = ${oldG}, f(${neighborId}) = ${fmt(oldF)}`,
            `New: g(${neighborId}) = ${tentG} (via ${current})`,
            `h(${neighborId}) = ${fmt(tentH)}`,
            `f(${neighborId}) = ${tentG} + ${fmt(tentH)} = ${fmt(tentF)}  ← BETTER`,
          ]
        } else {
          actionType = ACTION_TYPE.DISCOVER_NODE
          decision   = neighborId === goalId ? NEIGHBOR_DECISION.GOAL : NEIGHBOR_DECISION.DISCOVERED
          reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Newly discovered! g(${neighborId}) = ${tentG}, h(${neighborId}) = ${fmt(tentH)}, f(${neighborId}) = ${fmt(tentF)}. Added to Priority Queue.`
          calculations = [
            `g(${neighborId}) = g(${current}) + w(${current},${neighborId})`,
            `g(${neighborId}) = ${cG} + ${weight} = ${tentG}`,
            `h(${neighborId}) = ${fmt(tentH)}`,
            `f(${neighborId}) = ${tentG} + ${fmt(tentH)} = ${fmt(tentF)}`,
          ]
        }

      } else {
        actionType = ACTION_TYPE.SKIP_HIGHER_COST
        decision   = NEIGHBOR_DECISION.SKIP_HIGHER_COST
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Existing path to ${neighborId} is BETTER: f(${neighborId}) = ${fmt(fCost[neighborId])} vs new f = ${fmt(tentF)}. No update.`
        calculations = [
          `Candidate: ${cG} + ${weight} = ${tentG}; tentF = ${fmt(tentF)}`,
          `Existing: g(${neighborId}) = ${gCost[neighborId]}, f = ${fmt(fCost[neighborId])}`,
          `${fmt(tentF)} ≥ ${fmt(fCost[neighborId])} — skip`,
        ]
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
        gCost: { ...gCost }, hCost: { ...hCost }, fCost: { ...fCost },
        frontierDetail: getFrontierDetail(),
        frontierBefore: pqSnapshot, frontierAfter: getFrontierNodes(),
        decision, reason, calculations,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: cG, frontierSize: pq.size },
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
    gCost: { ...gCost }, hCost: { ...hCost }, fCost: { ...fCost }, frontierDetail: [],
    frontierBefore: [], frontierAfter: [],
    reason: `Priority Queue is empty. No path exists from ${startId} to ${goalId}.`,
    calculations: [`PQ empty — no path found`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false, isFinal: true, pathFound: false, goalReached: false,
  }))

  return steps
}
