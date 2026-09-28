/**
 * explanationGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pedagogical Explanation Generator for Graph Search Algorithms.
 *
 * Receives a structured AlgorithmStep and produces:
 *  1. Short explanation (1 concise sentence)
 *  2. Detailed explanation (Pedagogical text tailored for Beginner or Detailed mode)
 *  3. Calculation block (Mathematical formulas & numerical steps)
 *  4. Decision reason (Core logic of why the current node was selected)
 *  5. "Why not the others?" section (Dynamic comparison against other frontier candidates)
 *  6. Voice-friendly explanation (Natural, conversational speech text for Web Speech API)
 *
 * Algorithm-specific pedagogical rules:
 *  - BFS:    FIFO queue behavior & earliest discovery.
 *  - DFS:    LIFO stack behavior & depth-first exploration/backtracking.
 *  - UCS:    Lowest cumulative path cost g(n) selection.
 *  - GREEDY: Lowest heuristic h(n) estimate & target-directed search.
 *  - ASTAR:  f(n) = g(n) + h(n) balance & lowest f(n) selection.
 *
 * Pure JavaScript — 100% deterministic, zero external API / LLM dependencies.
 */

import { ALGORITHM, ALGORITHM_META } from '../types/graphTypes.js'

function normalizeAlgorithmId(id) {
  if (!id) return ALGORITHM.BFS
  const s = String(id).toLowerCase().replace(/[^a-z]/g, '')
  if (s.includes('star') || s === 'astar') return ALGORITHM.ASTAR
  if (s.includes('greedy')) return ALGORITHM.GREEDY
  if (s.includes('ucs') || s.includes('uniform')) return ALGORITHM.UCS
  if (s.includes('dfs') || s.includes('depth')) return ALGORITHM.DFS
  if (s.includes('bfs') || s.includes('breadth')) return ALGORITHM.BFS
  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} WhyNotOthersResult
 * @property {{ node: string, valueStr: string }} selected
 * @property {Array<{ node: string, valueStr: string, comparison: string, reason: string }>} alternatives
 * @property {string} summary
 * @property {string} formattedText
 */

/**
 * @typedef {Object} StepExplanation
 * @property {string} shortExplanation
 * @property {string} detailedExplanation
 * @property {string} beginnerExplanation
 * @property {string} advancedExplanation
 * @property {string[]} calculationBlock
 * @property {string} decisionReason
 * @property {WhyNotOthersResult} whyNotOthers
 * @property {string} voiceText
 * @property {string} concept
 * @property {object} algorithmMeta
 * @property {'beginner'|'detailed'} level
 */

/**
 * Enrich a single AlgorithmStep with algorithm-specific pedagogical explanations.
 *
 * @param {import('../types/graphStructures.js').AlgorithmStep} step
 * @param {string} algorithmId – one of ALGORITHM.*
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {'beginner'|'detailed'} [level='beginner']
 * @returns {StepExplanation}
 */
export function explainStep(step, algorithmId, graph, level = 'beginner') {
  const normAlgo = normalizeAlgorithmId(algorithmId)
  const meta = ALGORITHM_META[normAlgo] ?? { name: algorithmId, color: '#8b5cf6' }
  const currentNode = step.currentNode ?? step.selectedNode ?? '?'
  const startId = graph?.startId ?? 'Start'
  const goalId = graph?.goalId ?? 'Goal'

  // Generate sub-parts
  const beginnerExp = buildBeginnerExplanation(step, normAlgo, startId, goalId)
  const advancedExp = buildAdvancedExplanation(step, normAlgo, startId, goalId)
  const calcBlock   = buildCalculationBlock(step, normAlgo)
  const decision    = buildDecisionReason(step, normAlgo)
  const whyNot      = buildWhyNotOthers(step, normAlgo)
  const voice       = buildVoiceText(step, normAlgo, graph)
  const shortExp    = buildShortExplanation(step, normAlgo)
  const concept     = pickConcept(step, normAlgo)

  const activeDetail = level === 'beginner' ? beginnerExp : advancedExp

  return {
    shortExplanation: shortExp,
    detailedExplanation: activeDetail,
    beginnerExplanation: beginnerExp,
    advancedExplanation: advancedExp,
    calculationBlock: calcBlock,
    decisionReason: decision,
    whyNotOthers: whyNot,
    voiceText: voice,
    concept: concept,
    algorithmMeta: meta,
    level: level,

    // Legacy fields for backward compatibility with existing components
    summary: shortExp,
    detail: activeDetail,
    keyPoints: [decision, whyNot.summary],
    formula: calcBlock,
  }
}

/**
 * Generate enriched explanations for all steps at once.
 *
 * @param {import('../types/graphStructures.js').AlgorithmStep[]} steps
 * @param {string} algorithmId
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {'beginner'|'detailed'} [level='beginner']
 * @returns {StepExplanation[]}
 */
export function explainAllSteps(steps, algorithmId, graph, level = 'beginner') {
  return steps.map(step => explainStep(step, algorithmId, graph, level))
}

// ─────────────────────────────────────────────────────────────────────────────
// Short Explanations
// ─────────────────────────────────────────────────────────────────────────────

function buildShortExplanation(step, algorithmId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.actionType || step.action
  const pNode = step.parentNode
  const nNode = step.neighborNode

  if (act === 'INITIALIZE') {
    return `Initialized ${algorithmId.toUpperCase()} search starting at node ${node}.`
  }
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    return `Goal node ${node} reached! Search completed successfully.`
  }
  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) {
    return `Frontier exhausted. No path exists to the goal node.`
  }
  if (act === 'SKIP_VISITED') {
    return `Skipped node ${node} because it was already visited.`
  }
  if (act === 'EVALUATE_NEIGHBOR') {
    return `Evaluating edge ${pNode} → ${nNode} (weight ${step.edgeWeight ?? 1}).`
  }
  if (act === 'DISCOVER_NODE') {
    return `Discovered new neighbor ${nNode} from ${pNode}! Added to frontier.`
  }
  if (act === 'SKIP_ALREADY_DISCOVERED') {
    return `Skipped neighbor ${nNode} because it is already in the frontier.`
  }
  if (act === 'UPDATE_FRONTIER') {
    return `Found a shorter path to neighbor ${nNode}! Updated g(${nNode}) = ${step.gCost?.[nNode]}.`
  }
  if (act === 'SKIP_HIGHER_COST') {
    return `Skipped edge ${pNode} → ${nNode} because existing path to ${nNode} is already cheaper.`
  }

  // SELECT_NODE or default
  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `Selected node ${node} from front of FIFO queue (discovered earliest).`
    case ALGORITHM.DFS:
      return `Selected node ${node} from top of LIFO stack (most recently pushed).`
    case ALGORITHM.UCS:
      return `Selected node ${node} with lowest cumulative path cost g(${node}) = ${step.gCost?.[node] ?? 0}.`
    case ALGORITHM.GREEDY:
      return `Selected node ${node} with lowest estimated distance to goal h(${node}) = ${formatNum(step.hCost?.[node])}.`
    case ALGORITHM.ASTAR:
      return `Selected node ${node} with lowest total evaluation score f(${node}) = ${formatNum(step.fCost?.[node])}.`
    default:
      return `Selected node ${node} for expansion.`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Beginner Level Explanations (Analogy & Intuition Driven)
// ─────────────────────────────────────────────────────────────────────────────

function buildBeginnerExplanation(step, algorithmId, startId, goalId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.actionType || step.action
  const pNode = step.parentNode
  const nNode = step.neighborNode
  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  if (act === 'INITIALIZE') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `We begin Breadth-First Search at node ${startId}. BFS uses a FIFO queue (First-In, First-Out). We place ${startId} at the front of the queue.`
      case ALGORITHM.DFS:
        return `We begin Depth-First Search at node ${startId}. DFS uses a LIFO stack (Last-In, First-Out). We push ${startId} onto top of the stack.`
      case ALGORITHM.UCS:
        return `We start Uniform Cost Search at node ${startId} with cost g(${startId}) = 0. UCS always picks the node with the lowest path cost so far.`
      case ALGORITHM.GREEDY:
        return `We start Greedy Best-First Search at node ${startId}. Greedy uses a compass heuristic h(n) pointing toward goal ${goalId}.`
      case ALGORITHM.ASTAR:
        return `We start A* Search at node ${startId}. A* balances path cost g(n) and heuristic h(n) using f(n) = g(n) + h(n).`
      default:
        return `Starting search from node ${startId} to ${goalId}.`
    }
  }

  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    const pathStr = step.pathNodes?.join(' → ') ?? node
    return `Goal node ${node} popped from the frontier! We have found the solution path: ${pathStr} with total cost ${step.metrics?.totalCost ?? 0}.`
  }

  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) {
    return `The search ended because the frontier is empty. Goal node ${goalId} is unreachable from start node ${startId}.`
  }

  if (act === 'SKIP_VISITED') {
    return `Node ${node} was popped from the frontier, but it was already explored earlier via a different path. We skip it.`
  }

  if (act === 'EVALUATE_NEIGHBOR') {
    return `Node ${pNode} is expanding its edges. We cross edge ${pNode} → ${nNode} (weight ${step.edgeWeight ?? 1}) to inspect neighbor ${nNode}.`
  }

  if (act === 'DISCOVER_NODE') {
    const nG = step.gCost?.[nNode] ?? 0
    const nH = step.hCost?.[nNode] ?? 0
    const nF = step.fCost?.[nNode] ?? (nG + nH)
    return `Neighbor ${nNode} has not been visited yet! We set its parent to ${pNode} and add ${nNode} to the frontier (g=${nG}${algorithmId === 'astar' ? `, f=${formatNum(nF)}` : ''}).`
  }

  if (act === 'SKIP_ALREADY_DISCOVERED') {
    return `Neighbor ${nNode} is already in the frontier or explored. We do not re-add it to avoid redundant work.`
  }

  if (act === 'UPDATE_FRONTIER') {
    const newG = step.gCost?.[nNode]
    return `Path through ${pNode} gives a lower cost to ${nNode} (new g=${newG}) than its previously recorded path! We update its parent to ${pNode} and update its priority in the frontier.`
  }

  if (act === 'SKIP_HIGHER_COST') {
    return `The path to ${nNode} through ${pNode} costs more than the path we already found earlier. We keep the existing cheaper path.`
  }

  // SELECT_NODE
  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `BFS pops node ${node} from the front of the FIFO queue. Because it was discovered earliest, we now explore all of ${node}'s outgoing edges next.`
    case ALGORITHM.DFS:
      return `DFS pops node ${node} from the top of the LIFO stack. We will explore as deep as possible down ${node}'s branch before backtracking.`
    case ALGORITHM.UCS:
      return `UCS selects node ${node} because its cumulative path cost g(${node}) = ${g} is the smallest among all frontier nodes.`
    case ALGORITHM.GREEDY:
      return `Greedy selects node ${node} because its estimated heuristic distance h(${node}) = ${formatNum(h)} is the smallest among all frontier nodes.`
    case ALGORITHM.ASTAR:
      return `A* selects node ${node} because its total score f(${node}) = g(${g}) + h(${formatNum(h)}) = ${formatNum(f)} is the lowest in the frontier.`
    default:
      return `Node ${node} selected from the frontier.`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Advanced / Detailed Level Explanations (Formal & Algorithmic)
// ─────────────────────────────────────────────────────────────────────────────

function buildAdvancedExplanation(step, algorithmId, startId, goalId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.actionType || step.action
  const pNode = step.parentNode
  const nNode = step.neighborNode

  if (act === 'INITIALIZE') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `Initialize Breadth-First Search: Enqueue start vertex ${startId} into a First-In-First-Out (FIFO) queue structure.`
      case ALGORITHM.DFS:
        return `Initialize Depth-First Search: Push start vertex ${startId} onto an explicit Last-In-First-Out (LIFO) stack.`
      case ALGORITHM.UCS:
        return `Initialize Uniform Cost Search: Push vertex ${startId} into Min-Priority Queue keyed by g(${startId}) = 0.`
      case ALGORITHM.GREEDY:
        return `Initialize Greedy Best-First Search: Insert start vertex ${startId} into Min-Priority Queue keyed by h(${startId}).`
      case ALGORITHM.ASTAR:
        return `Initialize A* Search: Insert start vertex ${startId} into Min-Priority Queue with priority f(${startId}) = g(${startId}) + h(${startId}).`
      default:
        return `Initialize search engine.`
    }
  }

  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    return `Goal state ${node} popped from frontier. Search terminated. Solution Path: [${step.pathNodes?.join(', ')}]. Path cost: ${step.metrics?.totalCost ?? 0}.`
  }

  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) {
    return `Frontier set is empty (Open Set = Ø). No connected path exists to goal vertex ${goalId}.`
  }

  if (act === 'SKIP_VISITED') {
    return `State ${node} popped from frontier was previously closed. Skipped to preserve monotonic expansion invariants.`
  }

  if (act === 'EVALUATE_NEIGHBOR') {
    return `Traversing incident edge (${pNode}, ${nNode}) with edge weight ${step.edgeWeight ?? 1}.`
  }

  if (act === 'DISCOVER_NODE') {
    return `Vertex ${nNode} unvisited. Inserted into Open Set with parent pointer π[${nNode}] = ${pNode}.`
  }

  if (act === 'SKIP_ALREADY_DISCOVERED') {
    return `Vertex ${nNode} already present in Open Set or Closed Set. Skipped redundant insertion.`
  }

  if (act === 'UPDATE_FRONTIER') {
    return `Relaxation successful for edge (${pNode}, ${nNode}): g(${pNode}) + w > g(${nNode}). Key updated in Min-PQ.`
  }

  if (act === 'SKIP_HIGHER_COST') {
    return `Edge (${pNode}, ${nNode}) relaxation failed: candidate g(${pNode}) + w ≥ current g(${nNode}). Existing key retained.`
  }

  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `Popped head vertex ${node} from FIFO queue. BFS processes vertices by depth layers.`
    case ALGORITHM.DFS:
      return `Popped top vertex ${node} from LIFO stack. DFS advances along newest topological branch.`
    case ALGORITHM.UCS:
      return `Popped minimum key vertex ${node} from Priority Queue with path cost g(${node}) = ${g}.`
    case ALGORITHM.GREEDY:
      return `Popped minimum key vertex ${node} from Priority Queue with heuristic rating h(${node}) = ${formatNum(h)}.`
    case ALGORITHM.ASTAR:
      return `Popped minimum key vertex ${node} from Priority Queue with total evaluation f(${node}) = g(${g}) + h(${formatNum(h)}) = ${formatNum(f)}.`
    default:
      return `Expanded vertex ${node}.`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculation Block Generator
// ─────────────────────────────────────────────────────────────────────────────

function buildCalculationBlock(step, algorithmId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.actionType || step.action
  const pNode = step.parentNode
  const nNode = step.neighborNode

  if (act === 'INITIALIZE') {
    return [`Initialization at start node: ${node}`]
  }
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    return step.calculations ?? [`Total cost: ${step.metrics?.totalCost ?? 0}`]
  }

  if (act === 'EVALUATE_NEIGHBOR' || act === 'DISCOVER_NODE' || act === 'UPDATE_FRONTIER' || act === 'SKIP_HIGHER_COST') {
    const pG = step.gCost?.[pNode] ?? 0
    const w = step.edgeWeight ?? 1
    const candG = pG + w
    const curG = step.gCost?.[nNode]
    const nH = step.hCost?.[nNode] ?? 0

    if (algorithmId === ALGORITHM.ASTAR) {
      return [
        `Edge: ${pNode} → ${nNode} (weight = ${w})`,
        `g(${pNode}) = ${pG}`,
        `Candidate g(${nNode}) = g(${pNode}) + weight = ${pG} + ${w} = ${candG}`,
        curG !== undefined ? `Current g(${nNode}) = ${curG}` : `Neighbor ${nNode} unvisited`,
        `h(${nNode}) = ${formatNum(nH)}`,
        `f(${nNode}) = candidate g + h = ${candG} + ${formatNum(nH)} = ${formatNum(candG + nH)}`,
      ]
    }

    if (algorithmId === ALGORITHM.UCS) {
      return [
        `Edge: ${pNode} → ${nNode} (weight = ${w})`,
        `g(${pNode}) = ${pG}`,
        `Candidate g(${nNode}) = ${pG} + ${w} = ${candG}`,
        curG !== undefined ? `Current g(${nNode}) = ${curG}` : `Neighbor ${nNode} unvisited`,
      ]
    }

    if (algorithmId === ALGORITHM.GREEDY) {
      return [
        `Edge: ${pNode} → ${nNode}`,
        `Heuristic h(${nNode}) = ${formatNum(nH)}`,
      ]
    }

    return [
      `Edge: ${pNode} → ${nNode}`,
      `Discovered via parent ${pNode}`,
    ]
  }

  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  switch (algorithmId) {
    case ALGORITHM.BFS: {
      const qBefore = step.algorithmSpecificState?.queueBefore ?? step.frontierNodes ?? []
      return [
        `Queue state before selection: [${qBefore.join(', ')}]`,
        `Selected front element: ${node}`,
        `Discovered depth layer: ${step.currentPath?.length ? step.currentPath.length - 1 : 0}`,
      ]
    }
    case ALGORITHM.DFS: {
      const sBefore = step.algorithmSpecificState?.stackBefore ?? step.frontierNodes ?? []
      return [
        `Stack state before selection (top last): [${sBefore.join(', ')}]`,
        `Selected top element: ${node}`,
        `Current branch depth: ${step.currentPath?.length ? step.currentPath.length - 1 : 0}`,
      ]
    }
    case ALGORITHM.UCS:
      return [
        `g(${node}) = ${g} (Cumulative cost from start)`,
        `Priority Queue Key = g(${node}) = ${g}`,
      ]
    case ALGORITHM.GREEDY:
      return [
        `h(${node}) = ${formatNum(h)} (Euclidean heuristic to goal)`,
        `Priority Queue Key = h(${node}) = ${formatNum(h)}`,
      ]
    case ALGORITHM.ASTAR:
      return [
        `g(${node}) = ${g} (Path cost from start)`,
        `h(${node}) = ${formatNum(h)} (Heuristic estimate to goal)`,
        `f(${node}) = g(${node}) + h(${node})`,
        `f(${node}) = ${g} + ${formatNum(h)} = ${formatNum(f)}`,
      ]
    default:
      return step.calculations ?? []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Reason Generator
// ─────────────────────────────────────────────────────────────────────────────

function buildDecisionReason(step, algorithmId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.actionType || step.action
  const pNode = step.parentNode
  const nNode = step.neighborNode

  if (act === 'INITIALIZE') return `Node ${node} is selected because it is the designated start node.`
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) return `Node ${node} is the goal node!`
  if (act === 'EVALUATE_NEIGHBOR') return `Examining edge from ${pNode} to evaluate neighbor ${nNode}.`
  if (act === 'DISCOVER_NODE') return `Node ${nNode} is newly discovered from parent ${pNode} and pushed to frontier.`
  if (act === 'SKIP_ALREADY_DISCOVERED') return `Node ${nNode} is already in the frontier.`
  if (act === 'UPDATE_FRONTIER') return `Cheaper path found to ${nNode} via ${pNode}.`
  if (act === 'SKIP_HIGHER_COST') return `Path via ${pNode} is more expensive than existing path to ${nNode}.`

  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `Node ${node} was selected because BFS uses a FIFO queue, and ${node} was discovered earlier than all other waiting nodes.`
    case ALGORITHM.DFS:
      return `Node ${node} was selected because DFS uses a LIFO stack, and ${node} was at the top of the stack (most recently pushed).`
    case ALGORITHM.UCS:
      return `Node ${node} was selected because it has the lowest cumulative path cost g(${node}) = ${g} among all nodes in the frontier.`
    case ALGORITHM.GREEDY:
      return `Node ${node} was selected because it has the lowest heuristic estimate h(${node}) = ${formatNum(h)} to the goal.`
    case ALGORITHM.ASTAR:
      return `Node ${node} was selected because it has the lowest total evaluation score f(${node}) = ${formatNum(f)} among all open nodes.`
    default:
      return step.reason
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// "Why Not The Others?" Dynamic Comparative Section
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds dynamic comparisons explaining why candidate `node` was picked over other candidates in frontier.
 *
 * @param {import('../types/graphStructures.js').AlgorithmStep} step
 * @param {string} algorithmId
 * @returns {WhyNotOthersResult}
 */
function buildWhyNotOthers(step, algorithmId) {
  const selectedNode = step.currentNode ?? step.selectedNode

  if (step.isInitial || step.isFinal || step.action === 'SKIP_VISITED') {
    return {
      selected: { node: selectedNode ?? 'N/A', valueStr: '' },
      alternatives: [],
      summary: step.isInitial ? 'Only start node in frontier.' : 'Search ended.',
      formattedText: 'No competing candidates at this step.',
    }
  }

  // Determine candidate list and values
  let candidates = []
  const gMap = step.gCost ?? {}
  const hMap = step.hCost ?? {}
  const fMap = step.fCost ?? {}

  // Determine newly pushed neighbors in this step so we don't count them as competing prior candidates
  const newlyPushedIds = new Set(
    (step.neighborsConsidered ?? [])
      .filter(item => item.status === 'pushed_to_frontier' || item.status === 'updated_in_frontier')
      .map(item => item.neighborId)
  )

  if (step.frontierDetail && step.frontierDetail.length > 0) {
    candidates = step.frontierDetail
      .filter(d => !newlyPushedIds.has(d.nodeId))
      .map(d => ({
        node: d.nodeId,
        g: d.g ?? gMap[d.nodeId],
        h: d.h ?? hMap[d.nodeId],
        f: d.f ?? fMap[d.nodeId],
      }))
  } else if (step.algorithmSpecificState?.queueBefore?.length) {
    const q = step.algorithmSpecificState.queueBefore
    candidates = q.map((id, idx) => ({ node: id, pos: idx + 1 }))
  } else if (step.algorithmSpecificState?.stackBefore?.length) {
    const s = step.algorithmSpecificState.stackBefore
    const reversed = [...s].reverse()
    candidates = reversed.map((id, idx) => ({ node: id, pos: idx + 1 }))
  } else if (step.frontierNodes && step.frontierNodes.length > 0) {
    candidates = step.frontierNodes
      .filter(id => !newlyPushedIds.has(id))
      .map(id => ({
        node: id,
        g: gMap[id],
        h: hMap[id],
        f: fMap[id],
      }))
  }

  // Filter out duplicates and keep unique node entries
  const uniqueCandidatesMap = new Map()
  for (const c of candidates) {
    if (!uniqueCandidatesMap.has(c.node)) {
      uniqueCandidatesMap.set(c.node, c)
    }
  }
  const uniqueCandidates = Array.from(uniqueCandidatesMap.values())

  // Separate selected vs alternatives
  const altCandidates = uniqueCandidates.filter(c => c.node !== selectedNode)

  if (altCandidates.length === 0) {
    return {
      selected: { node: selectedNode, valueStr: getSelectedValueStr(selectedNode, step, algorithmId) },
      alternatives: [],
      summary: `Node ${selectedNode} was the only candidate in the frontier.`,
      formattedText: `Selected: ${selectedNode}\n\nNo other candidate nodes were waiting in the frontier at this step.`,
    }
  }

  const selectedValueStr = getSelectedValueStr(selectedNode, step, algorithmId)
  const selG = gMap[selectedNode] ?? 0
  const selH = hMap[selectedNode] ?? 0
  const selF = fMap[selectedNode] ?? (selG + selH)

  const alternatives = []
  const textLines = [`Selected: ${selectedNode}`, selectedValueStr, '']

  for (const alt of altCandidates) {
    const altNode = alt.node
    let altValStr = ''
    let comparisonStr = ''
    let reasonText = ''

    switch (algorithmId) {
      case ALGORITHM.BFS: {
        altValStr = `Position ${alt.pos ?? '2+'} in FIFO queue`
        comparisonStr = `Discovered after ${selectedNode}`
        reasonText = `Node ${altNode} was discovered after ${selectedNode}, so it must wait behind ${selectedNode} in the FIFO queue.`
        break
      }
      case ALGORITHM.DFS: {
        altValStr = `Buried on stack (Position ${alt.pos ?? '2+'})`
        comparisonStr = `Pushed earlier than ${selectedNode}`
        reasonText = `Node ${altNode} is buried beneath ${selectedNode} on the LIFO stack and will only be explored after backtracking.`
        break
      }
      case ALGORITHM.UCS: {
        const altG = alt.g ?? gMap[altNode] ?? 0
        altValStr = `g(${altNode}) = ${altG}`
        comparisonStr = `g(${altNode}) = ${altG} > g(${selectedNode}) = ${selG}`
        reasonText = `g(${altNode}) = ${altG} is higher than g(${selectedNode}) = ${selG}`
        break
      }
      case ALGORITHM.GREEDY: {
        const altH = formatNum(alt.h ?? hMap[altNode] ?? 0)
        const selHStr = formatNum(selH)
        altValStr = `h(${altNode}) = ${altH}`
        comparisonStr = `h(${altNode}) = ${altH} > h(${selectedNode}) = ${selHStr}`
        reasonText = `h(${altNode}) = ${altH} is further from the goal than h(${selectedNode}) = ${selHStr}`
        break
      }
      case ALGORITHM.ASTAR: {
        const altG = alt.g ?? gMap[altNode] ?? 0
        const altH = alt.h ?? hMap[altNode] ?? 0
        const altF = formatNum(alt.f ?? fMap[altNode] ?? (altG + altH))
        const selFStr = formatNum(selF)
        altValStr = `f(${altNode}) = ${altF}`
        comparisonStr = `f(${altNode}) = ${altF} > f(${selectedNode}) = ${selFStr}`
        reasonText = `f(${altNode}) = ${altF} is higher than f(${selectedNode}) = ${selFStr}`
        break
      }
      default:
        altValStr = `Waiting in frontier`
        reasonText = `Ranked lower than ${selectedNode}`
    }

    alternatives.push({
      node: altNode,
      valueStr: altValStr,
      comparison: comparisonStr,
      reason: reasonText,
    })

    textLines.push(`Why not ${altNode}?`)
    textLines.push(altValStr)
    textLines.push('')
  }

  let summaryLine = ''
  switch (algorithmId) {
    case ALGORITHM.BFS:
      summaryLine = `Therefore ${selectedNode} is at the front of the FIFO queue.`
      break
    case ALGORITHM.DFS:
      summaryLine = `Therefore ${selectedNode} is at the top of the LIFO stack.`
      break
    case ALGORITHM.UCS:
      summaryLine = `Therefore ${selectedNode} has the lowest cumulative path cost g(n).`
      break
    case ALGORITHM.GREEDY:
      summaryLine = `Therefore ${selectedNode} has the lowest estimated heuristic distance h(n).`
      break
    case ALGORITHM.ASTAR:
      summaryLine = `Therefore ${selectedNode} has the lowest f(n).`
      break
    default:
      summaryLine = `Therefore ${selectedNode} is selected.`
  }

  textLines.push(summaryLine)

  return {
    selected: { node: selectedNode, valueStr: selectedValueStr },
    alternatives,
    summary: summaryLine,
    formattedText: textLines.join('\n'),
  }
}

function getSelectedValueStr(node, step, algorithmId) {
  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  switch (algorithmId) {
    case ALGORITHM.BFS:    return `Front of FIFO queue`
    case ALGORITHM.DFS:    return `Top of LIFO stack`
    case ALGORITHM.UCS:    return `g(${node}) = ${g}`
    case ALGORITHM.GREEDY: return `h(${node}) = ${formatNum(h)}`
    case ALGORITHM.ASTAR:  return `f(${node}) = ${formatNum(f)}`
    default:               return `Selected`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Text Generator (Natural & Speech-Friendly)
// ─────────────────────────────────────────────────────────────────────────────

function buildVoiceText(step, algorithmId, graph) {
  const node = step.currentNode ?? step.selectedNode

  if (step.isInitial) {
    return `Starting search algorithm from node ${node}.`
  }
  if (step.isFinal) {
    if (step.goalReached) {
      return `Goal node ${node} reached! Path found with total cost ${step.metrics?.totalCost ?? 0}.`
    }
    return `No path found to goal node ${graph?.goalId ?? ''}.`
  }
  if (step.action === 'SKIP_VISITED') {
    return `Skipping node ${node} because it was already visited.`
  }

  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  const gWords = numberToWords(g)
  const hWords = numberToWords(h)
  const fWords = numberToWords(f)

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `Now Breadth-First Search explores node ${node}. Since BFS uses a first-in first-out queue, ${node} is selected because it was discovered earliest among all waiting nodes.`

    case ALGORITHM.DFS:
      return `Now Depth-First Search explores node ${node}. DFS uses a last-in first-out stack, so it selects ${node} to explore deeper along this new branch.`

    case ALGORITHM.UCS:
      return `Now Uniform Cost Search explores node ${node}. Its cumulative path cost is ${gWords}. This is the lowest path cost among all available nodes, so ${node} is selected.`

    case ALGORITHM.GREEDY:
      return `Now Greedy Best-First Search explores node ${node}. Its heuristic estimate to the goal is ${hWords}. This is the lowest estimated distance among available nodes, so ${node} is selected.`

    case ALGORITHM.ASTAR:
      return `Now A-star explores node ${node}. Its path cost is ${gWords}, its heuristic is ${hWords}, so its total f-score is ${fWords}. This is the lowest f-score among the available nodes, so ${node} is selected.`

    default:
      return `Now exploring node ${node}.`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatNum(num) {
  if (num === undefined || num === null) return '0'
  if (typeof num !== 'number') return String(num)
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}

function numberToWords(num) {
  if (num === undefined || num === null) return 'zero'
  const val = typeof num === 'number' ? num : parseFloat(num)
  if (isNaN(val)) return String(num)

  if (!Number.isInteger(val)) {
    const parts = val.toFixed(1).split('.')
    return `${numberToWords(parseInt(parts[0], 10))} point ${numberToWords(parseInt(parts[1], 10))}`
  }

  const wordsMap = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
    16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  }

  if (wordsMap[val]) return wordsMap[val]
  return String(val)
}

function pickConcept(step, algorithmId) {
  const act = step.actionType || step.action
  if (act === 'INITIALIZE') return 'Initialization'
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) return 'Goal Reached'
  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) return 'No Path Found'
  if (act === 'SKIP_VISITED') return 'Skip Visited'
  if (act === 'EVALUATE_NEIGHBOR') return 'Edge Evaluation'
  if (act === 'DISCOVER_NODE') return 'New Node Discovered'
  if (act === 'SKIP_ALREADY_DISCOVERED') return 'Skip Duplicate Neighbor'
  if (act === 'UPDATE_FRONTIER') return 'Frontier Cost Update'
  if (act === 'SKIP_HIGHER_COST') return 'Skip (Higher Cost)'

  switch (algorithmId) {
    case ALGORITHM.BFS:    return 'FIFO Queue Selection'
    case ALGORITHM.DFS:    return 'LIFO Stack Selection'
    case ALGORITHM.UCS:    return 'Lowest Path Cost g(n)'
    case ALGORITHM.GREEDY: return 'Lowest Heuristic h(n)'
    case ALGORITHM.ASTAR:  return 'Lowest Total Score f(n)'
    default:               return 'Node Expansion'
  }
}
