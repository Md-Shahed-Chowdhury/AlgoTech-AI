/**
 * explanationGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates rich, human-readable explanations for each AlgorithmStep.
 *
 * The engine already stores a `reason` string per step. This module upgrades
 * those terse reason strings into multi-sentence pedagogical explanations
 * that are rendered in the Explanation Panel and optionally read aloud by
 * the Voice Explanation module.
 *
 * Pure logic — zero React, zero DOM, zero side effects.
 */

import { ALGORITHM, ALGORITHM_META } from '../types/graphTypes.js'

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enrich a single AlgorithmStep with a detailed explanation object.
 *
 * @param {import('../types/graphStructures.js').AlgorithmStep} step
 * @param {string} algorithmId  – one of ALGORITHM.*
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {StepExplanation}
 */
export function explainStep(step, algorithmId, graph) {
  const meta = ALGORITHM_META[algorithmId]

  return {
    // Short one-liner (from the engine)
    summary:       step.reason,

    // Full paragraph for the Explanation Panel
    detail:        buildDetail(step, algorithmId, graph),

    // Bullet points highlighting key concept for this step
    keyPoints:     buildKeyPoints(step, algorithmId),

    // Formula shown in the Metrics Panel (A* / UCS / Greedy only)
    formula:       step.calculations ?? [],

    // TTS-friendly plain text (no formula symbols)
    voiceText:     buildVoiceText(step, algorithmId, graph),

    // Concept being demonstrated at this step
    concept:       pickConcept(step, algorithmId),

    // Algorithm-level metadata for the header
    algorithmMeta: meta,
  }
}

/**
 * Generate explanations for all steps at once.
 *
 * @param {import('../types/graphStructures.js').AlgorithmStep[]} steps
 * @param {string} algorithmId
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {StepExplanation[]}
 */
export function explainAllSteps(steps, algorithmId, graph) {
  return steps.map(step => explainStep(step, algorithmId, graph))
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildDetail(step, algorithmId, graph) {
  const { currentNode, visitedNodes, frontierNodes, isFinal, pathFound } = step

  if (step.isInitial) {
    return getInitialExplanation(algorithmId, graph.startId, graph.goalId)
  }

  if (isFinal && pathFound) {
    return getFinalExplanation(algorithmId, step)
  }

  if (isFinal && !pathFound) {
    return `The algorithm exhausted all reachable nodes without finding the goal. ` +
           `This means no path exists between the start and goal nodes in this graph.`
  }

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `We are currently expanding node **${currentNode}** from the front of the queue. ` +
             `BFS processes nodes level by level, guaranteeing the shortest path in terms of hops. ` +
             `Visited: ${visitedNodes.length} node(s). Queue size: ${frontierNodes.length}.`

    case ALGORITHM.DFS:
      return `We are expanding node **${currentNode}** from the top of the stack. ` +
             `DFS dives deep into one branch before backtracking. ` +
             `Visited: ${visitedNodes.length} node(s). Stack size: ${frontierNodes.length}.`

    case ALGORITHM.UCS:
      return `Expanding node **${currentNode}** with the lowest cumulative cost g = ${step.gCost?.[currentNode] ?? '?'}. ` +
             `UCS always expands the cheapest path so far, guaranteeing the optimal solution in weighted graphs.`

    case ALGORITHM.GREEDY:
      return `Expanding node **${currentNode}** with heuristic h = ${step.hCost?.[currentNode]?.toFixed(2) ?? '?'}. ` +
             `Greedy ignores path cost and only looks at the estimated distance to the goal — fast but may not find the optimal path.`

    case ALGORITHM.ASTAR:
      return `Expanding node **${currentNode}**: ` +
             `g = ${step.gCost?.[currentNode] ?? '?'}, ` +
             `h = ${step.hCost?.[currentNode]?.toFixed(2) ?? '?'}, ` +
             `f = ${step.fCost?.[currentNode]?.toFixed(2) ?? '?'}. ` +
             `A* balances path cost (g) and estimated remaining distance (h) to find the optimal path efficiently.`

    default:
      return step.reason
  }
}

function buildKeyPoints(step, algorithmId) {
  const points = []

  if (step.isInitial) {
    points.push('Initialize the data structure with the start node.')
    points.push(getDataStructureNote(algorithmId))
    return points
  }

  if (step.isFinal) {
    if (step.pathFound) {
      points.push(`Path found with ${step.pathNodes?.length - 1 ?? 0} edge(s).`)
      points.push(`Total cost: ${step.metrics?.totalCost ?? 0}`)
      points.push(`Nodes expanded: ${step.metrics?.nodesExpanded ?? 0}`)
    } else {
      points.push('Goal is unreachable from the start node.')
      points.push(`Nodes expanded: ${step.metrics?.nodesExpanded ?? 0}`)
    }
    return points
  }

  if (step.activeEdge) {
    points.push(`Evaluating edge to check if neighbor is reachable.`)
  }
  if (algorithmId === ALGORITHM.ASTAR || algorithmId === ALGORITHM.UCS) {
    points.push('If this is a shorter path, update cost and re-enqueue.')
  }
  if (algorithmId === ALGORITHM.GREEDY || algorithmId === ALGORITHM.ASTAR) {
    points.push('Heuristic guides expansion toward the goal.')
  }

  return points
}

function buildVoiceText(step, algorithmId, graph) {
  // Strip markdown and formula symbols for TTS
  return step.reason
    .replace(/\*\*/g, '')
    .replace(/→/g, 'to')
    .replace(/≤/g, 'is less than or equal to')
    .replace(/≥/g, 'is greater than or equal to')
    .replace(/∞/g, 'infinity')
    .replace(/\[|\]/g, '')
}

function pickConcept(step, algorithmId) {
  if (step.isInitial)          return 'Initialization'
  if (step.isFinal && step.pathFound) return 'Path Found'
  if (step.isFinal)            return 'No Path'

  switch (algorithmId) {
    case ALGORITHM.BFS:    return 'Queue Expansion'
    case ALGORITHM.DFS:    return 'Stack Expansion'
    case ALGORITHM.UCS:    return 'Cost Relaxation'
    case ALGORITHM.GREEDY: return 'Heuristic Evaluation'
    case ALGORITHM.ASTAR:  return 'f(n) = g(n) + h(n)'
    default:               return 'Expansion'
  }
}

function getInitialExplanation(algorithmId, startId, goalId) {
  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `We begin BFS from node **${startId}**, aiming to reach **${goalId}**. ` +
             `We initialize a queue with just the start node. BFS explores all neighbors ` +
             `at the current "depth" before moving further, ensuring the shortest path is found.`

    case ALGORITHM.DFS:
      return `We begin DFS from node **${startId}**, aiming to reach **${goalId}**. ` +
             `We initialize a stack with the start node. DFS immediately dives into ` +
             `the deepest reachable node before backtracking to explore other branches.`

    case ALGORITHM.UCS:
      return `We begin UCS from node **${startId}** to **${goalId}**. ` +
             `g(${startId}) = 0 is placed in the priority queue. UCS expands the ` +
             `node with the lowest cumulative cost first, guaranteeing the optimal solution.`

    case ALGORITHM.GREEDY:
      return `We begin Greedy Best-First Search from **${startId}** to **${goalId}**. ` +
             `The heuristic h(n) estimates the remaining distance to the goal. ` +
             `Greedy always expands whichever node looks closest to the goal — it is fast ` +
             `but may not find the optimal path.`

    case ALGORITHM.ASTAR:
      return `We begin A* from **${startId}** to **${goalId}**. ` +
             `A* uses f(n) = g(n) + h(n) where g is the cost so far and h is the heuristic estimate. ` +
             `With an admissible heuristic, A* always finds the optimal path and is generally ` +
             `more efficient than BFS or UCS.`

    default:
      return `Starting search from ${startId} to ${goalId}.`
  }
}

function getFinalExplanation(algorithmId, step) {
  const path   = step.pathNodes?.join(' → ') ?? ''
  const cost   = step.metrics?.totalCost ?? 0
  const hops   = step.metrics?.pathLength ?? 0
  const expanded = step.metrics?.nodesExpanded ?? 0

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `BFS found the goal! The shortest path (by number of hops) is: **${path}**. ` +
             `This path uses ${hops} edge(s). BFS expanded ${expanded} node(s) in total.`

    case ALGORITHM.DFS:
      return `DFS found the goal via path: **${path}**. ` +
             `Note: DFS does not guarantee the shortest path — it found the first path by depth.`

    case ALGORITHM.UCS:
      return `UCS found the optimal path: **${path}** with total cost **${cost}**. ` +
             `Because UCS always expands the cheapest path first, this is guaranteed to be optimal.`

    case ALGORITHM.GREEDY:
      return `Greedy found path: **${path}**. ` +
             `Greedy reached the goal quickly but this may not be the optimal path — it only follows heuristic guidance.`

    case ALGORITHM.ASTAR:
      return `A* found the optimal path: **${path}** with total cost **${cost}**. ` +
             `A* combines actual path cost g(n) with heuristic h(n) to guarantee ` +
             `both optimality and completeness (with an admissible heuristic).`

    default:
      return `Goal found! Path: ${path}`
  }
}

function getDataStructureNote(algorithmId) {
  switch (algorithmId) {
    case ALGORITHM.BFS:    return 'Data structure: Queue (FIFO)'
    case ALGORITHM.DFS:    return 'Data structure: Stack (LIFO)'
    case ALGORITHM.UCS:    return 'Data structure: Min-Heap (priority = g cost)'
    case ALGORITHM.GREEDY: return 'Data structure: Min-Heap (priority = h heuristic)'
    case ALGORITHM.ASTAR:  return 'Data structure: Min-Heap (priority = f = g + h)'
    default:               return ''
  }
}
