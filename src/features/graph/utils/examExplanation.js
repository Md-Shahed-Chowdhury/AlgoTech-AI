/**
 * examExplanation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates pedagogical feedback, concise & detailed explanations,
 * and algorithm-specific mistake classifications for Exam Mode.
 */

import { ALGORITHM, ALGORITHM_META } from '../types/graphTypes.js'
import { getNodeHeuristic } from './graphUtils.js'

function formatNum(num) {
  if (num === undefined || num === null) return '0'
  if (typeof num !== 'number') return String(num)
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}

/**
 * Generate correct answer rationale.
 *
 * @param {string} algorithmId
 * @param {string} node
 * @param {object} step - current algorithm step snapshot
 * @param {object} graph
 * @returns {string}
 */
export function generateCorrectExplanation(algorithmId, node, step, graph) {
  const meta = ALGORITHM_META[algorithmId] ?? { name: algorithmId }
  const g = step?.gCost?.[node] ?? 0
  const h = step?.hCost?.[node] ?? getNodeHeuristic(node, graph)
  const f = step?.fCost?.[node] ?? (g + h)

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return `Correct! BFS explores ${node} next because ${node} is at the front of the FIFO queue (earliest unvisited node).`

    case ALGORITHM.DFS:
      return `Correct! DFS explores ${node} next because ${node} is at the top of the LIFO stack (most recently discovered branch).`

    case ALGORITHM.UCS:
      return `Correct! UCS explores ${node} next because ${node} has the lowest cumulative path cost g(${node}) = ${g} in the priority queue.`

    case ALGORITHM.GREEDY:
      return `Correct! Greedy Search explores ${node} next because ${node} has the lowest heuristic estimate h(${node}) = ${formatNum(h)} to the goal.`

    case ALGORITHM.ASTAR:
      return `Correct! A* Search explores ${node} next because ${node} has the lowest total cost f(${node}) = g(${node}) + h(${node}) = ${g} + ${formatNum(h)} = ${formatNum(f)}.`

    default:
      return `Correct! Node ${node} is the correct next node to explore.`
  }
}

/**
 * Generate wrong answer feedback (concise + detailed).
 *
 * @param {string} algorithmId
 * @param {string} clickedNode
 * @param {string} correctNode
 * @param {object} step - step snapshot before expansion
 * @param {object} graph
 * @returns {{ concise: string, detailed: string, mistakeType: string }}
 */
export function generateWrongExplanation(algorithmId, clickedNode, correctNode, step, graph) {
  const meta = ALGORITHM_META[algorithmId] ?? { name: algorithmId }
  const visited = new Set(step?.visitedNodes ?? [])
  const frontier = step?.frontierNodes ?? []
  const queueOrStack = step?.algorithmSpecificState?.queueAfter ?? step?.algorithmSpecificState?.stackAfter ?? frontier

  const isVisited = visited.has(clickedNode)
  const isInFrontier = frontier.includes(clickedNode)

  // 1. Visited node selected
  if (isVisited) {
    const concise = `Not quite. You selected ${clickedNode}, but node ${clickedNode} has already been visited and expanded.`
    const detailed = `Node ${clickedNode} is in the Visited Set (Closed Set). Graph search algorithms never re-expand nodes that have already been finalized. The algorithm must pick from the unvisited nodes in the Frontier.`
    return { concise, detailed, mistakeType: 'Re-selecting Visited Node' }
  }

  // 2. Unexplored node not yet in frontier
  if (!isInFrontier) {
    const concise = `Not quite. You selected ${clickedNode}, but node ${clickedNode} is not currently in the frontier.`
    const detailed = `Node ${clickedNode} has not been discovered yet by any explored neighbor. Search algorithms can only select nodes that are currently in the active Frontier (Queue/Stack/Priority Queue).`
    return { concise, detailed, mistakeType: 'Selecting Non-Frontier Node' }
  }

  // 3. Node is in frontier, but not the priority/FIFO/LIFO target
  const gClicked = step?.gCost?.[clickedNode] ?? 0
  const hClicked = step?.hCost?.[clickedNode] ?? getNodeHeuristic(clickedNode, graph)
  const fClicked = step?.fCost?.[clickedNode] ?? (gClicked + hClicked)

  const gCorrect = step?.gCost?.[correctNode] ?? 0
  const hCorrect = step?.hCost?.[correctNode] ?? getNodeHeuristic(correctNode, graph)
  const fCorrect = step?.fCost?.[correctNode] ?? (gCorrect + hCorrect)

  switch (algorithmId) {
    case ALGORITHM.BFS: {
      const clickedIdx = queueOrStack.indexOf(clickedNode)
      const correctIdx = queueOrStack.indexOf(correctNode)
      const concise = `Not quite. You selected ${clickedNode}. BFS uses FIFO (First-In, First-Out) order. Node ${correctNode} was added to the queue earlier and is ahead of ${clickedNode}, so ${correctNode} must be explored first.`
      const detailed = `BFS strictly operates on a FIFO Queue. Node ${correctNode} is at position #${correctIdx + 1} at the front of the queue, whereas ${clickedNode} is at position #${clickedIdx + 1}. BFS always dequeues from the front.`
      return { concise, detailed, mistakeType: 'FIFO Order Ignored' }
    }

    case ALGORITHM.DFS: {
      const concise = `Not quite. You selected ${clickedNode}. DFS uses LIFO (Last-In, First-Out) stack order. Node ${correctNode} is at the top of the stack, so ${correctNode} must be explored first.`
      const detailed = `DFS strictly operates on a LIFO Stack. Node ${correctNode} was pushed most recently onto the top of the stack. Node ${clickedNode} is buried underneath in the stack.`
      return { concise, detailed, mistakeType: 'LIFO Stack Top Ignored' }
    }

    case ALGORITHM.UCS: {
      const concise = `Not quite. You selected ${clickedNode} with path cost g(${clickedNode}) = ${gClicked}. UCS expands the node with the lowest cumulative path cost g(n). Node ${correctNode} has g(${correctNode}) = ${gCorrect} < ${gClicked}, so ${correctNode} must be explored first.`
      const detailed = `Uniform Cost Search (UCS) orders its priority queue by cumulative path cost g(n) from start.
  • g(${clickedNode}) = ${gClicked}
  • g(${correctNode}) = ${gCorrect}
  Since ${gCorrect} < ${gClicked}, node ${correctNode} is prioritized.`
      return { concise, detailed, mistakeType: 'Path Cost g(n) Ordering Error' }
    }

    case ALGORITHM.GREEDY: {
      const concise = `Not quite. You selected ${clickedNode} with heuristic h(${clickedNode}) = ${formatNum(hClicked)}. Greedy Search expands the node with the lowest heuristic distance h(n) to the goal. Node ${correctNode} has h(${correctNode}) = ${formatNum(hCorrect)} < ${formatNum(hClicked)}, so ${correctNode} must be explored first.`
      const detailed = `Greedy Best-First Search orders its priority queue purely by heuristic h(n):
  • h(${clickedNode}) = ${formatNum(hClicked)}
  • h(${correctNode}) = ${formatNum(hCorrect)}
  Since ${formatNum(hCorrect)} < ${formatNum(hClicked)}, node ${correctNode} is closer to the goal according to the heuristic.`
      return { concise, detailed, mistakeType: 'Heuristic h(n) Ordering Error' }
    }

    case ALGORITHM.ASTAR: {
      const concise = `Not quite. You selected ${clickedNode} with f(${clickedNode}) = g(${clickedNode}) + h(${clickedNode}) = ${gClicked} + ${formatNum(hClicked)} = ${formatNum(fClicked)}. A* expands the node with the lowest total cost f(n). Node ${correctNode} has f(${correctNode}) = ${formatNum(fCorrect)} < ${formatNum(fClicked)}, so ${correctNode} must be explored first.`
      const detailed = `A* Search orders its priority queue by total estimated cost f(n) = g(n) + h(n):
  • f(${clickedNode}) = ${gClicked} + ${formatNum(hClicked)} = ${formatNum(fClicked)}
  • f(${correctNode}) = ${gCorrect} + ${formatNum(hCorrect)} = ${formatNum(fCorrect)}
  Since ${formatNum(fCorrect)} < ${formatNum(fClicked)}, node ${correctNode} has a smaller overall f-score.`
      return { concise, detailed, mistakeType: 'A* f(n) Evaluation Error' }
    }

    default:
      return {
        concise: `Not quite. Node ${correctNode} should be explored next according to the algorithm rules.`,
        detailed: `Node ${correctNode} is prioritized by ${meta.name} at this step.`,
        mistakeType: 'Algorithm Selection Error',
      }
  }
}
