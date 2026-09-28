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
  if (!Array.isArray(steps)) return []
  return steps.map(step => explainStep(step, algorithmId, graph, level))
}

// ─────────────────────────────────────────────────────────────────────────────
// Short Explanations
// ─────────────────────────────────────────────────────────────────────────────

function buildShortExplanation(step, algorithmId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.stepType || step.actionType || step.action
  const pNode = step.parentNode ?? step.currentNode
  const neighbors = step.neighbors ?? []

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') {
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
  if (act === 'VISIT_NODE') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `Popped node ${node} from the front of the FIFO queue.`
      case ALGORITHM.DFS:
        return `Popped node ${node} from the top of the LIFO stack.`
      case ALGORITHM.UCS:
        return `Selected node ${node} with lowest cumulative cost g(${node}) = ${step.gCost?.[node] ?? 0}.`
      case ALGORITHM.GREEDY:
        return `Selected node ${node} with lowest heuristic h(${node}) = ${formatNum(step.hCost?.[node])}.`
      case ALGORITHM.ASTAR:
        return `Selected node ${node} with lowest evaluation score f(${node}) = ${formatNum(step.fCost?.[node])}.`
      default:
        return `Visited node ${node}.`
    }
  }
  if (act === 'EXPLORE_NEIGHBORS') {
    return neighbors.length > 0
      ? `Explored all ${neighbors.length} outgoing neighbor(s) of node ${pNode} [${neighbors.join(', ')}].`
      : `Node ${pNode} has no outgoing edges.`
  }

  return `Step action: ${act}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Beginner Level Explanations (Analogy & Intuition Driven)
// ─────────────────────────────────────────────────────────────────────────────

function buildBeginnerExplanation(step, algorithmId, startId, goalId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.stepType || step.actionType || step.action
  const pNode = step.parentNode ?? step.currentNode
  const neighbors = step.neighbors ?? []
  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `We begin Breadth-First Search at node ${startId}. Imagine a coffee shop line (First-In, First-Out). We place node ${startId} at the front of the queue.`
      case ALGORITHM.DFS:
        return `We begin Depth-First Search at node ${startId}. Imagine a stack of cafeteria trays (Last-In, First-Out). We push node ${startId} onto top of the stack.`
      case ALGORITHM.UCS:
        return `We start Uniform Cost Search at node ${startId} with cost 0. UCS behaves like a budget traveler: it always picks the cheapest ticket available next.`
      case ALGORITHM.GREEDY:
        return `We start Greedy Best-First Search at node ${startId}. Greedy acts like a person with a compass pointing toward goal ${goalId}.`
      case ALGORITHM.ASTAR:
        return `We start A* Search at node ${startId}. A* acts like a smart GPS navigator: it balances distance driven g(n) with estimated distance remaining h(n).`
      default:
        return `Starting search from node ${startId} to ${goalId}.`
    }
  }

  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    const pathStr = step.pathNodes?.join(' → ') ?? node
    return `Goal node ${node} reached! We have found the solution path: ${pathStr} with total cost ${step.metrics?.totalCost ?? 0}.`
  }

  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) {
    return `The search ended because the frontier is empty. Goal node ${goalId} is unreachable from start node ${startId}.`
  }

  if (act === 'SKIP_VISITED') {
    return `Node ${node} was popped from the frontier, but it was already explored earlier via a different path. We skip it.`
  }

  if (act === 'VISIT_NODE') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `BFS pops node ${node} from the front of the FIFO queue. Node ${node} is now active. Its neighbors have NOT been evaluated yet. In the next step, BFS will examine all of ${node}'s outgoing neighbors.`
      case ALGORITHM.DFS:
        return `DFS pops node ${node} from the top of the LIFO stack. Node ${node} is now active. Its neighbors have NOT been evaluated yet. In the next step, DFS will examine all of ${node}'s outgoing neighbors to explore deeper.`
      case ALGORITHM.UCS:
        return `UCS selects node ${node} with the lowest path cost g(${node}) = ${g}. Node ${node} is now active. Its neighbors have NOT been evaluated yet.`
      case ALGORITHM.GREEDY:
        return `Greedy selects node ${node} with the lowest estimated distance h(${node}) = ${formatNum(h)} to the goal. Its neighbors have NOT been evaluated yet.`
      case ALGORITHM.ASTAR:
        return `A* selects node ${node} with the lowest total evaluation score f(${node}) = ${formatNum(f)}. Its neighbors have NOT been evaluated yet.`
      default:
        return `Node ${node} selected from the frontier.`
    }
  }

  if (act === 'EXPLORE_NEIGHBORS') {
    const pushed = (step.neighborsConsidered ?? []).filter(n => n.status === 'pushed_to_frontier' || n.status === 'updated_in_frontier' || n.status === 'goal')
    const pushedIds = pushed.map(n => n.neighborId)
    return neighbors.length > 0
      ? `Node ${pNode} explores all ${neighbors.length} outgoing neighbor(s): [${neighbors.join(', ')}]. ${pushedIds.length > 0 ? `Newly discovered neighbor(s) [${pushedIds.join(', ')}] are added to the frontier (discovered, but not yet visited!).` : 'No new unvisited neighbors.'} The next step will select the next node from the frontier.`
      : `Node ${pNode} has no outgoing edges to explore.`
  }

  return `Action ${act} executed.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Detailed Level Explanations (Rich Teacher Narrative)
// ─────────────────────────────────────────────────────────────────────────────

function buildAdvancedExplanation(step, algorithmId, startId, goalId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.stepType || step.actionType || step.action
  const pNode = step.parentNode ?? step.currentNode
  const neighbors = step.neighbors ?? []
  const g = step.gCost?.[node] ?? 0
  const h = step.hCost?.[node] ?? 0
  const f = step.fCost?.[node] ?? (g + h)

  const qBefore = formatFrontierList(step.algorithmSpecificState?.queueBefore ?? step.frontierBefore, algorithmId, step)
  const qAfter = formatFrontierList(step.algorithmSpecificState?.queueAfter ?? step.frontierAfter ?? step.frontierNodes, algorithmId, step)

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `Initialize Breadth-First Search (BFS):\nWe place start node ${startId} into the First-In, First-Out (FIFO) queue. BFS explores nodes level-by-level in concentric rings from the start node.`
      case ALGORITHM.DFS:
        return `Initialize Depth-First Search (DFS):\nWe push start node ${startId} onto the Last-In, First-Out (LIFO) stack. DFS explores as deep as possible down each branch prior to backtracking.`
      case ALGORITHM.UCS:
        return `Initialize Uniform Cost Search (UCS):\nWe insert start node ${startId} into the Min-Priority Queue with initial path cost g(${startId}) = 0. UCS expands nodes in strictly non-decreasing order of path cost.`
      case ALGORITHM.GREEDY:
        return `Initialize Greedy Best-First Search:\nWe insert start node ${startId} into the Min-Priority Queue keyed by heuristic estimate h(${startId}) = ${formatNum(step.hCost?.[startId])}. Greedy prioritizes nodes that appear closest to goal ${goalId}.`
      case ALGORITHM.ASTAR:
        return `Initialize A* Search:\nWe insert start node ${startId} into the Min-Priority Queue with evaluation score f(${startId}) = g(0) + h(${formatNum(step.hCost?.[startId])}) = ${formatNum(step.fCost?.[startId])}. A* balances path cost spent with estimated distance remaining.`
      default:
        return `Initialize search engine from start node ${startId}.`
    }
  }

  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    const pathStr = step.pathNodes?.join(' → ') ?? node
    return `Goal node ${node} reached and popped from the frontier!\n\nThe algorithm has completed successfully. Solution Path: ${pathStr}.\nTotal path length: ${step.metrics?.pathLength ?? 0} edge(s), cumulative path cost: ${step.metrics?.totalCost ?? 0}, total nodes expanded: ${step.metrics?.nodesExpanded ?? 0}.`
  }

  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) {
    return `Frontier set is empty (Open Set = Ø).\nNo connected path exists between start node ${startId} and goal node ${goalId}. Search terminated with no solution.`
  }

  if (act === 'SKIP_VISITED') {
    return `Node ${node} was popped from the frontier, but it was already marked as CLOSED (visited) via a lower-cost path. Skipped to prevent redundant computation.`
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VISIT_NODE Phase Detailed Teacher Explanation (Answers all 8 Points)
  // ─────────────────────────────────────────────────────────────────────────
  if (act === 'VISIT_NODE') {
    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `Node ${node} is now being removed from the front of the queue.\n\n` +
          `Before this action, the FIFO queue was ${qBefore}.\n\n` +
          `BFS follows the First-In, First-Out rule, meaning the node that entered the queue earliest is processed first. Because ${node} is currently at the front of the queue, ${node} must be selected before any later-discovered nodes.\n\n` +
          `After removing ${node}, the queue becomes ${qAfter}.\n\n` +
          `Node ${node} is now the current node being processed and is marked as VISITED. Its outgoing neighbors have NOT been evaluated yet. In the next step, BFS will examine all relevant neighbors of ${node} and determine which ones are new and should be added to the back of the queue.`

      case ALGORITHM.DFS:
        return `Node ${node} is now being removed from the top of the stack.\n\n` +
          `Before this action, the LIFO stack (top → bottom) was ${qBefore}.\n\n` +
          `DFS follows the Last-In, First-Out rule, meaning the most recently added node is processed first. Because ${node} sits at the top of the stack, ${node} is selected before older alternatives.\n\n` +
          `After removing ${node}, the stack becomes ${qAfter}.\n\n` +
          `Node ${node} is now the current node being processed and is marked as VISITED. Its outgoing neighbors have NOT been evaluated yet. In the next step, DFS will examine all relevant neighbors of ${node} to explore deeper along this branch.`

      case ALGORITHM.UCS:
        return `Node ${node} is now being selected from the Priority Queue.\n\n` +
          `Before this action, the Priority Queue contained: ${qBefore}.\n\n` +
          `UCS follows the Minimum Path Cost rule: it always expands the node with the smallest cumulative path cost g(n) from the start node, regardless of physical distance to the goal. Because g(${node}) = ${g} is the lowest cost among all frontier candidates, node ${node} is selected.\n\n` +
          `After selecting ${node}, the Priority Queue becomes ${qAfter}.\n\n` +
          `Node ${node} is now the current node being processed and is marked as VISITED. Its outgoing neighbors have NOT been evaluated yet. In the next step, UCS will evaluate all outgoing edges from ${node} and calculate candidate path costs g(n) = g(${node}) + edge_cost.`

      case ALGORITHM.GREEDY:
        return `Node ${node} is now being selected from the Priority Queue.\n\n` +
          `Before this action, the Priority Queue contained: ${qBefore}.\n\n` +
          `Greedy Best-First Search follows the Lowest Heuristic rule: it always selects the node that appears closest to the goal according to the heuristic estimate h(n), ignoring past path cost g(n). Because h(${node}) = ${formatNum(h)} is smaller than any other candidate, node ${node} is selected.\n\n` +
          `After selecting ${node}, the Priority Queue becomes ${qAfter}.\n\n` +
          `Node ${node} is now the current node being processed and is marked as VISITED. Its outgoing neighbors have NOT been evaluated yet. In the next step, Greedy Search will examine all relevant neighbors of ${node} and compute their heuristic estimates to the goal.`

      case ALGORITHM.ASTAR: {
        const frontierDetailList = formatAStarFrontierList(step)
        return `A* Search is selecting the frontier node with the smallest total evaluation score f(n) = g(n) + h(n).\n\n` +
          `The current frontier candidates were:\n${frontierDetailList}\n\n` +
          `Because node ${node} has the smallest total score f(${node}) = g(${g}) + h(${formatNum(h)}) = ${formatNum(f)}, A* selects ${node}.\n\n` +
          `After selecting ${node}, the Priority Queue becomes ${qAfter}.\n\n` +
          `Node ${node} is now the current node being processed. Its outgoing neighbors have NOT been evaluated yet. In the next step, A* will evaluate all relevant neighbors of ${node}, computing their candidate g, h, and f values.`
      }

      default:
        return `Node ${node} selected from frontier. Neighbors will be evaluated in the next step.`
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPLORE_NEIGHBORS Phase Detailed Teacher Explanation (Full Combined Operation)
  // ─────────────────────────────────────────────────────────────────────────
  if (act === 'EXPLORE_NEIGHBORS') {
    const listStr = neighbors.length > 0 ? neighbors.join(', ') : 'none'
    const edgesStr = neighbors.length > 0 ? neighbors.map(n => `${pNode} → ${n}`).join(', ') : 'none'
    const items = step.neighborsConsidered ?? []

    let breakdownText = ''
    if (items.length === 0) {
      breakdownText = `Node ${pNode} has no outgoing edges to explore.`
    } else {
      breakdownText = items.map(item => {
        const nId = item.neighborId
        const w = item.weight ?? 1
        const nG = step.gCost?.[nId]
        const nH = step.hCost?.[nId]
        const nF = step.fCost?.[nId]

        switch (algorithmId) {
          case ALGORITHM.BFS:
            if (item.status === 'already_visited') return `• Edge ${pNode} → ${nId}: Neighbor ${nId} was already visited and processed. BFS skips it.`
            if (item.status === 'already_in_frontier') return `• Edge ${pNode} → ${nId}: Neighbor ${nId} is already discovered and currently in the queue. BFS does not add ${nId} again.`
            return `• Edge ${pNode} → ${nId}: Neighbor ${nId} has not been discovered yet! BFS discovers ${nId} and adds it to the back of the FIFO queue.`

          case ALGORITHM.DFS:
            if (item.status === 'already_visited') return `• Edge ${pNode} → ${nId}: Neighbor ${nId} was already visited on a previous path. DFS skips it.`
            return `• Edge ${pNode} → ${nId}: Neighbor ${nId} is unvisited. DFS pushes ${nId} onto the top of the LIFO stack so it will be explored deeper.`

          case ALGORITHM.UCS:
            if (item.status === 'already_visited') return `• Edge ${pNode} → ${nId} (weight ${w}): Neighbor ${nId} is already closed (expanded with optimal g=${nG}). Skipped.`
            if (item.status === 'updated_in_frontier') return `• Edge ${pNode} → ${nId} (weight ${w}): Candidate g(${nId}) = g(${pNode}) + ${w} = ${nG}. This is CHEAPER than its old path cost! Priority Queue updated with new g(${nId}) = ${nG}.`
            if (item.status === 'higher_cost_skipped') return `• Edge ${pNode} → ${nId} (weight ${w}): Candidate g(${nId}) = g(${pNode}) + ${w} = ${(step.gCost?.[pNode]??0)+w}. Existing path to ${nId} is cheaper (g=${nG}). Retaining existing path.`
            return `• Edge ${pNode} → ${nId} (weight ${w}): Candidate g(${nId}) = g(${pNode}) + ${w} = ${nG}. Neighbor ${nId} is newly discovered and added to Priority Queue with g(${nId}) = ${nG}.`

          case ALGORITHM.GREEDY:
            if (item.status === 'already_visited') return `• Edge ${pNode} → ${nId}: Neighbor ${nId} is already visited. Skipped.`
            if (item.status === 'already_in_frontier') return `• Edge ${pNode} → ${nId}: Neighbor ${nId} is already in the frontier with h(${nId}) = ${formatNum(nH)}. Skipped.`
            return `• Edge ${pNode} → ${nId}: Computed heuristic estimate h(${nId}) = ${formatNum(nH)} to goal. Newly discovered neighbor ${nId} is added to Priority Queue with h(${nId}) = ${formatNum(nH)}.`

          case ALGORITHM.ASTAR:
            if (item.status === 'already_visited') return `• Edge ${pNode} → ${nId} (weight ${w}): Neighbor ${nId} is already closed. Skipped.`
            if (item.status === 'updated_in_frontier') return `• Edge ${pNode} → ${nId} (weight ${w}): Candidate g(${nId}) = g(${pNode}) + ${w} = ${nG}, h(${nId}) = ${formatNum(nH)} ⇒ f(${nId}) = ${formatNum(nF)}. This is CHEAPER than its old path! Priority Queue updated.`
            if (item.status === 'higher_cost_skipped') return `• Edge ${pNode} → ${nId} (weight ${w}): Candidate f-score is higher than existing path to ${nId}. Retaining existing path.`
            return `• Edge ${pNode} → ${nId} (weight ${w}): Candidate g(${nId}) = g(${pNode}) + ${w} = ${nG}, h(${nId}) = ${formatNum(nH)} ⇒ f(${nId}) = ${formatNum(nF)}. Newly discovered neighbor ${nId} added to Priority Queue.`

          default:
            return `• Edge ${pNode} → ${nId}: Evaluated.`
        }
      }).join('\n')
    }

    const previewMsg = `The next step will select the next node from the frontier according to the algorithm's ordering rule.`

    return `Now ${ALGORITHM_META[algorithmId]?.shortName ?? algorithmId.toUpperCase()} is exploring all relevant neighbors of node ${pNode}.\n\n` +
      `Node ${pNode} has ${neighbors.length} neighbor(s): [${listStr}].\n` +
      `The simulator is examining the edges: ${edgesStr}. Animated transitions show these relationships visually.\n\n` +
      `Evaluation breakdown:\n${breakdownText}\n\n` +
      `Therefore, after processing all neighbors, the frontier changes from ${qBefore} to ${qAfter}.\n\n` +
      `The key educational distinction is that newly added nodes have now been DISCOVERED and placed in the frontier, but they have NOT been processed/visited yet. They will be visited in later steps.\n\n` +
      `${previewMsg}`
  }

  return `Expanded vertex ${node}.`
}

// Helper formatting functions
function formatFrontierList(list, algorithmId, step) {
  if (!list || list.length === 0) return '[]'
  if (typeof list[0] === 'object' && list[0].nodeId) {
    return '[' + list.map(item => {
      if (algorithmId === ALGORITHM.ASTAR) return `${item.nodeId} (f=${formatNum(item.f)})`
      if (algorithmId === ALGORITHM.GREEDY) return `${item.nodeId} (h=${formatNum(item.h)})`
      if (algorithmId === ALGORITHM.UCS) return `${item.nodeId} (g=${item.g})`
      return item.nodeId
    }).join(', ') + ']'
  }
  if (Array.isArray(list)) {
    return '[' + list.map(id => {
      if (algorithmId === ALGORITHM.ASTAR && step?.fCost?.[id] !== undefined) return `${id} (f=${formatNum(step.fCost[id])})`
      if (algorithmId === ALGORITHM.GREEDY && step?.hCost?.[id] !== undefined) return `${id} (h=${formatNum(step.hCost[id])})`
      if (algorithmId === ALGORITHM.UCS && step?.gCost?.[id] !== undefined) return `${id} (g=${step.gCost[id]})`
      return id
    }).join(', ') + ']'
  }
  return String(list)
}

function formatAStarFrontierList(step) {
  const detail = step.frontierDetail ?? []
  if (detail.length > 0) {
    return detail.map(item => {
      const g = item.g ?? step.gCost?.[item.nodeId] ?? 0
      const h = item.h ?? step.hCost?.[item.nodeId] ?? 0
      const f = item.f ?? step.fCost?.[item.nodeId] ?? (g + h)
      return `• Node ${item.nodeId}: g=${g}, h=${formatNum(h)} ⇒ f=${formatNum(f)}`
    }).join('\n')
  }
  const nodes = step.frontierBefore ?? step.frontierNodes ?? []
  return nodes.map(id => {
    const g = step.gCost?.[id] ?? 0
    const h = step.hCost?.[id] ?? 0
    const f = step.fCost?.[id] ?? (g + h)
    return `• Node ${id}: g=${g}, h=${formatNum(h)} ⇒ f=${formatNum(f)}`
  }).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculation Block Generator
// ─────────────────────────────────────────────────────────────────────────────

function buildCalculationBlock(step, algorithmId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.stepType || step.actionType || step.action
  const pNode = step.parentNode ?? step.currentNode
  const neighbors = step.neighbors ?? []
  const items = step.neighborsConsidered ?? []

  const qBefore = formatFrontierList(step.algorithmSpecificState?.queueBefore ?? step.frontierBefore, algorithmId, step)
  const qAfter = formatFrontierList(step.algorithmSpecificState?.queueAfter ?? step.frontierAfter ?? step.frontierNodes, algorithmId, step)

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') {
    return [`Initialization at start node: ${node}`]
  }
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    return step.calculations ?? [`Total cost: ${step.metrics?.totalCost ?? 0}`]
  }

  if (act === 'VISIT_NODE') {
    return [
      `Frontier state before selection: ${qBefore}`,
      `Selected active node: ${node}`,
      `Ordering rule: ${getRuleName(algorithmId)}`,
      `Frontier state after selection: ${qAfter}`,
    ]
  }

  if (act === 'EXPLORE_NEIGHBORS') {
    const calcLines = [
      `Parent node: ${pNode}`,
      `Evaluated edges: ${neighbors.length > 0 ? neighbors.map(n => `${pNode} → ${n}`).join(', ') : 'none'}`,
    ]

    items.forEach(item => {
      const nId = item.neighborId
      const w = item.weight ?? 1
      const pG = step.gCost?.[pNode] ?? 0
      const candG = pG + w
      const nH = step.hCost?.[nId] ?? 0
      const nF = candG + nH

      if (algorithmId === ALGORITHM.ASTAR) {
        calcLines.push(`• Edge ${pNode} → ${nId}: cand_g = ${pG} + ${w} = ${candG}, h = ${formatNum(nH)} ⇒ cand_f = ${formatNum(nF)} [${item.status}]`)
      } else if (algorithmId === ALGORITHM.UCS) {
        calcLines.push(`• Edge ${pNode} → ${nId}: cand_g = ${pG} + ${w} = ${candG} [${item.status}]`)
      } else if (algorithmId === ALGORITHM.GREEDY) {
        calcLines.push(`• Edge ${pNode} → ${nId}: h(${nId}) = ${formatNum(nH)} [${item.status}]`)
      } else {
        calcLines.push(`• Edge ${pNode} → ${nId}: [${item.status}]`)
      }
    })

    calcLines.push(`Frontier before: ${qBefore}`)
    calcLines.push(`Frontier after: ${qAfter}`)
    return calcLines
  }

  return step.calculations ?? []
}

function getRuleName(algorithmId) {
  switch (algorithmId) {
    case ALGORITHM.BFS: return 'FIFO (First-In, First-Out)'
    case ALGORITHM.DFS: return 'LIFO (Last-In, First-Out)'
    case ALGORITHM.UCS: return 'Minimum Path Cost g(n)'
    case ALGORITHM.GREEDY: return 'Lowest Heuristic Estimate h(n)'
    case ALGORITHM.ASTAR: return 'Lowest Total Evaluation Score f(n) = g(n) + h(n)'
    default: return 'Standard'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Reason Generator
// ─────────────────────────────────────────────────────────────────────────────

function buildDecisionReason(step, algorithmId) {
  const node = step.currentNode ?? step.selectedNode
  const act = step.stepType || step.actionType || step.action
  const pNode = step.parentNode ?? step.currentNode
  const neighbors = step.neighbors ?? []

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') return `Node ${node} is selected because it is the designated start node.`
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) return `Node ${node} is the goal node!`

  if (act === 'VISIT_NODE') {
    const g = step.gCost?.[node] ?? 0
    const h = step.hCost?.[node] ?? 0
    const f = step.fCost?.[node] ?? (g + h)

    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `Node ${node} was selected because BFS uses a FIFO queue, and ${node} reached the front of the queue (discovered earliest).`
      case ALGORITHM.DFS:
        return `Node ${node} was selected because DFS uses a LIFO stack, and ${node} was at the top of the stack (most recently pushed).`
      case ALGORITHM.UCS:
        return `Node ${node} was selected because it has the lowest cumulative path cost g(${node}) = ${g} among all nodes in the frontier.`
      case ALGORITHM.GREEDY:
        return `Node ${node} was selected because it has the lowest heuristic estimate h(${node}) = ${formatNum(h)} to the goal.`
      case ALGORITHM.ASTAR:
        return `Node ${node} was selected because it has the lowest total evaluation score f(${node}) = ${formatNum(f)} in the frontier.`
      default:
        return `Node ${node} selected from frontier.`
    }
  }

  if (act === 'EXPLORE_NEIGHBORS') {
    const items = step.neighborsConsidered ?? []
    const pushed = items.filter(n => n.status === 'pushed_to_frontier' || n.status === 'updated_in_frontier' || n.status === 'goal').map(n => n.neighborId)
    return neighbors.length > 0
      ? `Node ${pNode} evaluated all ${neighbors.length} outgoing neighbor(s) [${neighbors.join(', ')}]. ${pushed.length > 0 ? `Active neighbor(s) [${pushed.join(', ')}] were added/updated in the frontier.` : 'No new frontier updates.'}`
      : `Node ${pNode} has no outgoing edges.`
  }

  return step.reason ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// "Why Not The Others?" Dynamic Comparative Section
// ─────────────────────────────────────────────────────────────────────────────

function buildWhyNotOthers(step, algorithmId) {
  const selectedNode = step.currentNode ?? step.selectedNode
  const act = step.stepType || step.actionType || step.action

  if (step.isInitial || step.isFinal || act === 'SKIP_VISITED') {
    return {
      selected: { node: selectedNode ?? 'N/A', valueStr: '' },
      alternatives: [],
      summary: step.isInitial ? 'Only start node in frontier.' : 'Search ended.',
      formattedText: 'No competing candidates at this step.',
    }
  }

  if (act === 'EXPLORE_NEIGHBORS') {
    const items = step.neighborsConsidered ?? []
    const alternatives = items.map(item => {
      let statusText = ''
      switch (item.status) {
        case 'pushed_to_frontier': statusText = 'New → Added to frontier'; break
        case 'updated_in_frontier': statusText = 'Cheaper path → Frontier updated'; break
        case 'already_in_frontier': statusText = 'Already in frontier → Skipped'; break
        case 'already_visited': statusText = 'Already visited → Skipped'; break
        case 'higher_cost_skipped': statusText = 'Higher cost path → Skipped'; break
        case 'goal': statusText = 'Goal node → Added to frontier'; break
        default: statusText = item.status
      }
      return {
        node: item.neighborId,
        valueStr: statusText,
        comparison: `Edge ${step.currentNode} → ${item.neighborId}`,
        reason: statusText
      }
    })

    return {
      selected: { node: step.currentNode ?? 'Parent', valueStr: 'Parent node exploring edges' },
      alternatives,
      summary: `All ${items.length} neighbor(s) evaluated together in this step.`,
      formattedText: `Explored neighbors for ${step.currentNode}: ${items.map(i => `${i.neighborId} (${i.status})`).join(', ')}`
    }
  }

  // VISIT_NODE case
  let candidates = []
  const gMap = step.gCost ?? {}
  const hMap = step.hCost ?? {}
  const fMap = step.fCost ?? {}
  const frontierBefore = step.algorithmSpecificState?.queueBefore ?? step.algorithmSpecificState?.stackBefore ?? step.frontierBefore ?? []

  if (step.frontierDetail && step.frontierDetail.length > 0) {
    candidates = step.frontierDetail.map(d => ({
      node: d.nodeId,
      g: d.g ?? gMap[d.nodeId],
      h: d.h ?? hMap[d.nodeId],
      f: d.f ?? fMap[d.nodeId],
    }))
  } else if (frontierBefore.length > 0) {
    candidates = frontierBefore.map((id, idx) => ({ node: id, pos: idx + 1 }))
  }

  const uniqueCandidatesMap = new Map()
  for (const c of candidates) {
    if (!uniqueCandidatesMap.has(c.node)) uniqueCandidatesMap.set(c.node, c)
  }
  const uniqueCandidates = Array.from(uniqueCandidatesMap.values())
  const altCandidates = uniqueCandidates.filter(c => c.node !== selectedNode)

  if (altCandidates.length === 0) {
    return {
      selected: { node: selectedNode, valueStr: getSelectedValueStr(selectedNode, step, algorithmId) },
      alternatives: [],
      summary: `Node ${selectedNode} was the only candidate in the frontier.`,
      formattedText: `Selected: ${selectedNode}\nNo other candidate nodes were waiting in the frontier.`
    }
  }

  const selectedValueStr = getSelectedValueStr(selectedNode, step, algorithmId)
  const selG = gMap[selectedNode] ?? 0
  const selH = hMap[selectedNode] ?? 0
  const selF = fMap[selectedNode] ?? (selG + selH)

  const alternatives = []
  const textLines = [`Selected: ${selectedNode} (${selectedValueStr})`, '']

  for (const alt of altCandidates) {
    const altNode = alt.node
    let altValStr = ''
    let comparisonStr = ''
    let reasonText = ''

    switch (algorithmId) {
      case ALGORITHM.BFS:
        altValStr = `Position ${alt.pos ?? '2+'} in FIFO queue`
        comparisonStr = `Discovered after ${selectedNode}`
        reasonText = `Node ${altNode} was discovered after ${selectedNode}, so it waits behind ${selectedNode} in the FIFO queue.`
        break
      case ALGORITHM.DFS:
        altValStr = `Buried on stack (Position ${alt.pos ?? '2+'})`
        comparisonStr = `Pushed earlier than ${selectedNode}`
        reasonText = `Node ${altNode} sits beneath ${selectedNode} on the LIFO stack.`
        break
      case ALGORITHM.UCS: {
        const altG = alt.g ?? gMap[altNode] ?? 0
        altValStr = `g(${altNode}) = ${altG}`
        comparisonStr = `g(${altNode})=${altG} > g(${selectedNode})=${selG}`
        reasonText = `g(${altNode}) = ${altG} is higher than g(${selectedNode}) = ${selG}.`
        break
      }
      case ALGORITHM.GREEDY: {
        const altH = formatNum(alt.h ?? hMap[altNode] ?? 0)
        altValStr = `h(${altNode}) = ${altH}`
        comparisonStr = `h(${altNode})=${altH} > h(${selectedNode})=${formatNum(selH)}`
        reasonText = `h(${altNode}) = ${altH} is further from the goal than h(${selectedNode}) = ${formatNum(selH)}.`
        break
      }
      case ALGORITHM.ASTAR: {
        const altG = alt.g ?? gMap[altNode] ?? 0
        const altH = alt.h ?? hMap[altNode] ?? 0
        const altF = formatNum(alt.f ?? fMap[altNode] ?? (altG + altH))
        altValStr = `f(${altNode}) = ${altF}`
        comparisonStr = `f(${altNode})=${altF} > f(${selectedNode})=${formatNum(selF)}`
        reasonText = `f(${altNode}) = ${altF} is higher than f(${selectedNode}) = ${formatNum(selF)}.`
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

    textLines.push(`Why not ${altNode}? ${altValStr} — ${reasonText}`)
  }

  let summaryLine = ''
  switch (algorithmId) {
    case ALGORITHM.BFS: summaryLine = `Therefore ${selectedNode} is at the front of the FIFO queue.`; break
    case ALGORITHM.DFS: summaryLine = `Therefore ${selectedNode} is at the top of the LIFO stack.`; break
    case ALGORITHM.UCS: summaryLine = `Therefore ${selectedNode} has the lowest cumulative path cost g(n).`; break
    case ALGORITHM.GREEDY: summaryLine = `Therefore ${selectedNode} has the lowest estimated heuristic h(n).`; break
    case ALGORITHM.ASTAR: summaryLine = `Therefore ${selectedNode} has the lowest f(n) = g(n) + h(n).`; break
    default: summaryLine = `Therefore ${selectedNode} is selected.`
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
  const act = step.stepType || step.actionType || step.action
  const pNode = step.parentNode ?? step.currentNode
  const neighbors = step.neighbors ?? []

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') {
    return `Starting search algorithm from node ${node}.`
  }
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    return `Goal node ${node} reached! Path found with total cost ${step.metrics?.totalCost ?? 0}.`
  }
  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) {
    return `No path found to goal node ${graph?.goalId ?? ''}.`
  }
  if (act === 'SKIP_VISITED') {
    return `Skipping node ${node} because it was already visited.`
  }

  if (act === 'VISIT_NODE') {
    const g = step.gCost?.[node] ?? 0
    const h = step.hCost?.[node] ?? 0
    const f = step.fCost?.[node] ?? (g + h)
    const gWords = numberToWords(g)
    const hWords = numberToWords(h)
    const fWords = numberToWords(f)

    switch (algorithmId) {
      case ALGORITHM.BFS:
        return `Node ${node} is popped from the front of the queue. Its neighbors have not been evaluated yet.`
      case ALGORITHM.DFS:
        return `Node ${node} is popped from the top of the stack. Its neighbors have not been evaluated yet.`
      case ALGORITHM.UCS:
        return `Node ${node} is selected with lowest path cost ${gWords}. Its neighbors have not been evaluated yet.`
      case ALGORITHM.GREEDY:
        return `Node ${node} is selected with lowest heuristic ${hWords}. Its neighbors have not been evaluated yet.`
      case ALGORITHM.ASTAR:
        return `Node ${node} is selected with lowest f-score ${fWords}. Its neighbors have not been evaluated yet.`
      default:
        return `Node ${node} is visited.`
    }
  }

  if (act === 'EXPLORE_NEIGHBORS') {
    const items = step.neighborsConsidered ?? []
    const pushed = items.filter(n => n.status === 'pushed_to_frontier' || n.status === 'updated_in_frontier' || n.status === 'goal').map(n => n.neighborId)

    if (neighbors.length === 0) {
      return `Node ${pNode} has no outgoing edges.`
    }

    if (pushed.length === 0) {
      return `Node ${pNode} explored its neighbors ${neighbors.join(', ')}, but all were already in the frontier or visited.`
    }

    return `Node ${pNode} is now exploring its neighbors ${neighbors.join(', ')}. Newly discovered nodes ${pushed.join(', ')} are added to the frontier.`
  }

  return `Step ${node}`
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
  const act = step.stepType || step.actionType || step.action
  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') return 'Initialization'
  if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) return 'Goal Reached'
  if (act === 'NO_PATH' || (step.isFinal && !step.goalReached)) return 'No Path Found'
  if (act === 'SKIP_VISITED') return 'Skip Visited'
  if (act === 'VISIT_NODE') return 'Visit Node'
  if (act === 'EXPLORE_NEIGHBORS') return 'Explore All Neighbors'

  switch (algorithmId) {
    case ALGORITHM.BFS:    return 'FIFO Queue Selection'
    case ALGORITHM.DFS:    return 'LIFO Stack Selection'
    case ALGORITHM.UCS:    return 'Lowest Path Cost g(n)'
    case ALGORITHM.GREEDY: return 'Lowest Heuristic h(n)'
    case ALGORITHM.ASTAR:  return 'Lowest Total Score f(n)'
    default:               return 'Node Expansion'
  }
}

