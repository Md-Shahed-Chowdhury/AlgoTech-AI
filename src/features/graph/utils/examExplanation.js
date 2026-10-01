/**
 * examExplanation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pedagogical Feedback & Learning Analysis Generator for Exam Mode.
 *
 * Produces:
 *  1. Correct & Wrong answer explanations (with cost comparison formulas)
 *  2. Algorithm behavior mastery summary (demonstrated concepts)
 *  3. Mistake Timeline items (step-by-step prediction mistakes)
 *  4. Deterministic personalized learning recommendations
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
 * Generate wrong answer feedback with detailed cost comparison.
 */
export function generateWrongExplanation(algorithmId, clickedNode, correctNode, step, graph) {
  const meta = ALGORITHM_META[algorithmId] ?? { name: algorithmId }
  const visited = new Set(step?.visitedNodes ?? [])
  const frontier = step?.frontierNodes ?? []
  const queueOrStack = step?.algorithmSpecificState?.queueAfter ?? step?.algorithmSpecificState?.stackAfter ?? frontier

  const isVisited = visited.has(clickedNode)
  const isInFrontier = frontier.includes(clickedNode)

  const gClicked = step?.gCost?.[clickedNode] ?? 0
  const hClicked = step?.hCost?.[clickedNode] ?? getNodeHeuristic(clickedNode, graph)
  const fClicked = step?.fCost?.[clickedNode] ?? (gClicked + hClicked)

  const gCorrect = step?.gCost?.[correctNode] ?? 0
  const hCorrect = step?.hCost?.[correctNode] ?? getNodeHeuristic(correctNode, graph)
  const fCorrect = step?.fCost?.[correctNode] ?? (gCorrect + hCorrect)

  const costComparison = {
    clicked: { node: clickedNode, g: gClicked, h: hClicked, f: fClicked },
    correct: { node: correctNode, g: gCorrect, h: hCorrect, f: fCorrect },
  }

  // 1. Visited node selected
  if (isVisited) {
    const concise = `Not quite. You selected ${clickedNode}, but node ${clickedNode} has already been visited and expanded.`
    const detailed = `Node ${clickedNode} is in the Visited Set (Closed Set). Graph search algorithms never re-expand nodes that have already been finalized.`
    return { concise, detailed, mistakeType: 'Re-selecting Visited Node', costComparison }
  }

  // 2. Node not in frontier
  if (!isInFrontier) {
    const concise = `Not quite. You selected ${clickedNode}, but node ${clickedNode} is not currently in the frontier.`
    const detailed = `Node ${clickedNode} has not been discovered yet by any explored neighbor. Search algorithms can only select nodes active in the Frontier.`
    return { concise, detailed, mistakeType: 'Selecting Non-Frontier Node', costComparison }
  }

  switch (algorithmId) {
    case ALGORITHM.BFS: {
      const clickedIdx = queueOrStack.indexOf(clickedNode)
      const correctIdx = queueOrStack.indexOf(correctNode)
      const concise = `Not quite. You selected ${clickedNode}. BFS uses FIFO (First-In, First-Out) order. Node ${correctNode} was added earlier and is ahead of ${clickedNode} in the queue.`
      const detailed = `BFS strictly operates on a FIFO Queue. Node ${correctNode} is at position #${correctIdx + 1} at the front of the queue, whereas ${clickedNode} is at position #${clickedIdx + 1}. BFS always dequeues from the front.`
      return { concise, detailed, mistakeType: 'FIFO Order Ignored', costComparison }
    }

    case ALGORITHM.DFS: {
      const concise = `Not quite. You selected ${clickedNode}. DFS uses LIFO (Last-In, First-Out) stack order. Node ${correctNode} is at the top of the stack, so ${correctNode} must be explored first.`
      const detailed = `DFS strictly operates on a LIFO Stack. Node ${correctNode} was pushed most recently onto the top of the stack. Node ${clickedNode} is deeper down in the stack.`
      return { concise, detailed, mistakeType: 'LIFO Stack Top Ignored', costComparison }
    }

    case ALGORITHM.UCS: {
      const concise = `Not quite. You selected ${clickedNode} with path cost g(${clickedNode}) = ${gClicked}. UCS expands the node with the lowest cumulative path cost g(n). Node ${correctNode} has g(${correctNode}) = ${gCorrect} < ${gClicked}, so ${correctNode} must be explored first.`
      const detailed = `Uniform Cost Search (UCS) orders its priority queue by cumulative path cost g(n):\n  • ${clickedNode} → g(${clickedNode}) = ${gClicked}\n  • ${correctNode} → g(${correctNode}) = ${gCorrect}\nSince ${gCorrect} < ${gClicked}, node ${correctNode} is prioritized.`
      return { concise, detailed, mistakeType: 'Path Cost g(n) Ordering Error', costComparison }
    }

    case ALGORITHM.GREEDY: {
      const concise = `Not quite. You selected ${clickedNode} with heuristic h(${clickedNode}) = ${formatNum(hClicked)}. Greedy Search expands the node with the lowest heuristic distance h(n) to the goal. Node ${correctNode} has h(${correctNode}) = ${formatNum(hCorrect)} < ${formatNum(hClicked)}, so ${correctNode} must be explored first.`
      const detailed = `Greedy Best-First Search orders its priority queue purely by heuristic h(n):\n  • ${clickedNode} → h(${clickedNode}) = ${formatNum(hClicked)}\n  • ${correctNode} → h(${correctNode}) = ${formatNum(hCorrect)}\nSince ${formatNum(hCorrect)} < ${formatNum(hClicked)}, node ${correctNode} is closer to the goal according to the heuristic.`
      return { concise, detailed, mistakeType: 'Heuristic h(n) Ordering Error', costComparison }
    }

    case ALGORITHM.ASTAR: {
      const concise = `Not quite. You selected ${clickedNode} with f(${clickedNode}) = g(${clickedNode}) + h(${clickedNode}) = ${gClicked} + ${formatNum(hClicked)} = ${formatNum(fClicked)}. A* expands the node with the lowest total cost f(n). Node ${correctNode} has f(${correctNode}) = ${formatNum(fCorrect)} < ${formatNum(fClicked)}, so ${correctNode} must be explored first.`
      const detailed = `A* Search orders its priority queue by total estimated cost f(n) = g(n) + h(n):\n  • ${clickedNode} → g=${gClicked}, h=${formatNum(hClicked)}, f=${formatNum(fClicked)}\n  • ${correctNode} → g=${gCorrect}, h=${formatNum(hCorrect)}, f=${formatNum(fCorrect)}\nSince f(${correctNode}) = ${formatNum(fCorrect)} < ${formatNum(fClicked)}, node ${correctNode} has a smaller overall f-score.`
      return { concise, detailed, mistakeType: 'A* f(n) Evaluation Error', costComparison }
    }

    default:
      return {
        concise: `Not quite. Node ${correctNode} should be explored next according to algorithm rules.`,
        detailed: `Node ${correctNode} is prioritized by ${meta.name} at this step.`,
        mistakeType: 'Algorithm Selection Error',
        costComparison,
      }
  }
}

/**
 * Generate algorithm behavior mastery summary.
 */
export function generateAlgorithmBehaviorSummary(algorithmId, accuracy) {
  const meta = ALGORITHM_META[algorithmId] ?? { name: algorithmId }

  const isHigh = accuracy >= 80

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return {
        conceptTitle: 'FIFO Queue & Level-Order Mechanics',
        description: isHigh
          ? 'You successfully demonstrated mastery of BFS First-In, First-Out (FIFO) queue behavior, correctly identifying nodes level-by-level in exact discovery sequence.'
          : 'BFS relies strictly on a FIFO Queue to explore nodes level-by-level. Focus on dequeuing the earliest discovered node first.',
      }

    case ALGORITHM.DFS:
      return {
        conceptTitle: 'LIFO Stack & Deep Branch Backtracking',
        description: isHigh
          ? 'You demonstrated strong understanding of DFS Last-In, First-Out (LIFO) stack mechanics, following deep paths before backtracking.'
          : 'DFS operates on a LIFO Stack, always popping the most recently discovered node. Focus on exploring deep along the active branch before returning to older branches.',
      }

    case ALGORITHM.UCS:
      return {
        conceptTitle: 'Cumulative Path Cost g(n) Prioritization',
        description: isHigh
          ? 'You demonstrated solid understanding of Uniform Cost Search, correctly prioritizing nodes with the lowest accumulated edge path cost g(n).'
          : 'UCS selects nodes based purely on lowest path cost g(n) from the start node. Pay close attention to cumulative edge weights.',
      }

    case ALGORITHM.GREEDY:
      return {
        conceptTitle: 'Heuristic Distance h(n) Target-Directed Search',
        description: isHigh
          ? 'You demonstrated proficiency in Greedy Best-First Search, prioritizing nodes strictly by lowest estimated heuristic distance h(n) to the goal.'
          : 'Greedy Search ignores edge path costs g(n) and chooses nodes purely based on lowest heuristic h(n). Ensure you compare h(n) values across all frontier candidates.',
      }

    case ALGORITHM.ASTAR:
      return {
        conceptTitle: 'Balanced Cost Evaluation f(n) = g(n) + h(n)',
        description: isHigh
          ? 'You demonstrated excellent mastery of A* Search, balancing cumulative path cost g(n) and heuristic estimate h(n) to select nodes with the lowest f(n).'
          : 'A* Search combines path cost g(n) and heuristic estimate h(n) via f(n) = g(n) + h(n). Remember to add both components together when evaluating frontier candidates.',
      }

    default:
      return {
        conceptTitle: 'Graph Search Node Selection',
        description: 'Demonstrated node selection behavior for search algorithm.',
      }
  }
}

/**
 * Generate Chronological Mistake Timeline items from question records.
 */
export function generateMistakeTimeline(questionRecords, algorithmId, graph) {
  const timeline = []

  questionRecords.forEach((record, idx) => {
    if (record.attempts.length === 0 && !record.revealed) return

    // Filter wrong attempt clicks
    const wrongClicks = record.attempts.filter(clickedId => clickedId !== record.correctNodeId)

    if (wrongClicks.length > 0 || record.revealed) {
      const primaryWrongClick = wrongClicks[0] ?? (record.revealed ? 'None (Revealed)' : '?')
      const explanation = generateWrongExplanation(
        algorithmId,
        primaryWrongClick === 'None (Revealed)' ? record.correctNodeId : primaryWrongClick,
        record.correctNodeId,
        record.stepSnapshotBefore,
        graph
      )

      timeline.push({
        stepNumber: idx + 1,
        questionIndex: idx,
        userSelected: primaryWrongClick,
        correctNode: record.correctNodeId,
        wasRevealed: record.revealed,
        conciseReason: explanation.concise,
        detailedReason: explanation.detailed,
        mistakeType: explanation.mistakeType,
        costComparison: explanation.costComparison,
      })
    }
  })

  return timeline
}

/**
 * Generate deterministic learning recommendations based on actual recorded mistake counts.
 */
export function generateLearningRecommendations(mistakeCounts, algorithmId) {
  const recommendations = []

  if (!mistakeCounts || Object.keys(mistakeCounts).length === 0) {
    recommendations.push(
      '🎉 Perfect prediction accuracy! You have demonstrated thorough understanding of node selection rules for this algorithm.'
    )
    return recommendations
  }

  if (mistakeCounts['A* f(n) Evaluation Error']) {
    recommendations.push(
      '💡 If you repeatedly selected nodes based purely on closeness to the goal during A*, review the difference between heuristic distance h(n) and total score f(n) = g(n) + h(n).'
    )
  }

  if (mistakeCounts['FIFO Order Ignored']) {
    recommendations.push(
      '💡 If you selected recently discovered nodes first during BFS, review FIFO (First-In, First-Out) queue behavior. BFS always dequeues the earliest added node.'
    )
  }

  if (mistakeCounts['LIFO Stack Top Ignored']) {
    recommendations.push(
      '💡 If you selected older nodes from the frontier during DFS, review LIFO (Last-In, First-Out) stack behavior. DFS always pops the most recently added node.'
    )
  }

  if (mistakeCounts['Path Cost g(n) Ordering Error']) {
    recommendations.push(
      '💡 If you miscalculated priority during UCS, review cumulative path cost g(n). UCS requires summing edge weights along the entire path from the start node.'
    )
  }

  if (mistakeCounts['Heuristic h(n) Ordering Error']) {
    recommendations.push(
      '💡 If you chose nodes with higher heuristic values during Greedy Search, double-check node h(n) values to select the node with smallest estimated distance to the goal.'
    )
  }

  if (mistakeCounts['Re-selecting Visited Node']) {
    recommendations.push(
      '⚠️ You selected nodes already in the Visited Set. Remember that graph search algorithms maintain a Closed Set to prevent infinite loops and redundant processing.'
    )
  }

  if (mistakeCounts['Selecting Non-Frontier Node']) {
    recommendations.push(
      '⚠️ You selected nodes not currently active in the Frontier. Search algorithms can only explore nodes that have been added to the open queue/stack/priority queue.'
    )
  }

  return recommendations
}
