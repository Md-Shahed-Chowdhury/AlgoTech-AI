/**
 * compareRunner.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs several search algorithms on the same graph and scores them on the four
 * evaluation criteria: execution time, solution quality, efficiency and
 * convergence. Pure logic — zero React, zero DOM.
 */

import { runAlgorithm } from '../../graph/engine/algorithmEngine.js'
import { getNodeHeuristic } from '../../graph/utils/graphUtils.js'
import { ALGORITHM } from '../../graph/types/graphTypes.js'
import { ALGO_BY_ID, ALGO_ORDER, formatTime } from '../constants.js'
import { pathCost, costToGoal, findInadmissibleNodes, buildSeries, measureAverageMs } from './metrics.js'

// Weights favor solution quality: on small graphs execution time differs by
// microseconds and should not let a non-optimal search win overall.
export const CRITERIA = [
  { id: 'time',        label: 'Execution Time',   weight: 0.10, hint: 'Average wall-clock time of the search engine' },
  { id: 'quality',     label: 'Solution Quality', weight: 0.45, hint: 'Path cost compared with the true optimal cost' },
  { id: 'efficiency',  label: 'Efficiency',       weight: 0.25, hint: 'Nodes expanded (70%) and peak frontier memory (30%)' },
  { id: 'convergence', label: 'Convergence',      weight: 0.20, hint: 'Steps needed before the search settles on the goal' },
]

/**
 * @param {import('../../graph/types/graphStructures.js').Graph} graph
 * @param {string[]} algoIds
 */
export function runComparison(graph, algoIds) {
  const ids = ALGO_ORDER.filter(id => algoIds.includes(id))
  const trueCost = costToGoal(graph)
  const optimalCost = graph.startId ? trueCost[graph.startId] : Infinity
  const reachable = optimalCost !== Infinity

  const results = {}
  for (const id of ids) {
    results[id] = summarize(id, graph, optimalCost, trueCost)
  }

  // Race finishing order: fewer steps to reach the goal = earlier finish
  const finishers = ids
    .filter(id => results[id].pathFound)
    .sort((a, b) => results[a].stepsToGoal - results[b].stepsToGoal)
  let rank = 0
  let prevSteps = null
  finishers.forEach((id, i) => {
    if (results[id].stepsToGoal !== prevSteps) rank = i + 1
    prevSteps = results[id].stepsToGoal
    results[id].finishRank = rank
  })

  const inadmissible = findInadmissibleNodes(graph, trueCost)
  const baseline = { optimalCost: reachable ? optimalCost : null, reachable, inadmissible }
  const verdict = buildVerdict(ids, results, graph, baseline)

  return { ids, results, baseline, verdict }
}

// ─────────────────────────────────────────────────────────────────────────────

function summarize(id, graph, optimalCost, trueCost) {
  const steps = runAlgorithm(id, graph)
  const final = steps[steps.length - 1] ?? null
  const pathFound = !!final?.pathFound
  const pathNodes = pathFound ? (final.pathNodes ?? []) : []
  const realCost = pathFound ? pathCost(pathNodes, graph) : null
  const timing = measureAverageMs(() => runAlgorithm(id, graph))

  const nodesExpanded = final?.metrics?.nodesExpanded ?? 0
  const maxFrontier = steps.reduce((m, s) => Math.max(m, s.metrics?.frontierSize ?? 0), 0)

  let optimalityRatio = null
  if (pathFound && realCost != null && optimalCost !== Infinity) {
    optimalityRatio = optimalCost === 0 ? (realCost === 0 ? 1 : Infinity) : realCost / optimalCost
  }

  return {
    id,
    steps,
    series: buildSeries(steps, graph, trueCost),
    pathFound,
    pathNodes,
    hops: pathFound ? pathNodes.length - 1 : null,
    realCost,
    optimalityRatio,
    isOptimal: optimalityRatio != null && Math.abs(optimalityRatio - 1) < 1e-9,
    nodesExpanded,
    maxFrontier,
    wastedExpansions: pathFound ? Math.max(0, nodesExpanded - pathNodes.length) : nodesExpanded,
    totalSteps: steps.length,
    stepsToGoal: pathFound ? steps.length - 1 : null,
    timeMs: timing.avgMs,
    timingRuns: timing.runs,
    finishRank: null,
  }
}

/** 100 for the best value, proportionally less for worse (lower is better). */
function ratioScore(best, value) {
  if (value == null || !isFinite(value)) return 0
  if (value === best || value <= 0) return 100
  if (best <= 0) return 0
  return (100 * best) / value
}

function buildVerdict(ids, results, graph, baseline) {
  const list = ids.map(id => results[id])
  const minOf = (vals) => Math.min(...vals.filter(v => v != null && isFinite(v)))

  const bestTime = minOf(list.map(r => r.timeMs))
  const bestExpanded = minOf(list.map(r => r.nodesExpanded))
  const bestFrontier = minOf(list.map(r => r.maxFrontier))
  const bestSteps = minOf(list.map(r => r.stepsToGoal))

  const scores = {}
  for (const r of list) {
    // Squared so a 10% costlier path loses ~20 points and a 2× path loses 75
    const quality = !r.pathFound || r.optimalityRatio == null
      ? 0
      : (r.optimalityRatio === Infinity ? 0 : 100 / r.optimalityRatio ** 2)
    const s = {
      time: ratioScore(bestTime, r.timeMs),
      quality,
      efficiency: 0.7 * ratioScore(bestExpanded, r.nodesExpanded) + 0.3 * ratioScore(bestFrontier, r.maxFrontier),
      convergence: r.pathFound ? ratioScore(bestSteps, r.stepsToGoal) : 0,
    }
    s.overall = CRITERIA.reduce((sum, c) => sum + c.weight * s[c.id], 0)
    scores[r.id] = s
  }

  const winners = {}
  for (const { id: c } of CRITERIA) {
    const top = Math.max(...ids.map(id => scores[id][c]))
    winners[c] = top > 0 ? ids.filter(id => scores[id][c] >= top - 0.5) : []
  }

  const ranking = [...ids].sort((a, b) =>
    (scores[b].overall - scores[a].overall) || (scores[b].quality - scores[a].quality))

  return { scores, winners, ranking, insights: buildInsights(ids, results, graph, baseline) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-English insights
// ─────────────────────────────────────────────────────────────────────────────

const nameOf = (id) => ALGO_BY_ID[id].shortName
const joinNames = (ids) => {
  const names = ids.map(nameOf)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function buildInsights(ids, results, graph, baseline) {
  const out = []
  const list = ids.map(id => results[id])
  const has = (id) => ids.includes(id)

  if (!baseline.reachable) {
    out.push({ kind: 'danger', text: 'The goal is unreachable from the start node, so no algorithm can find a path. Connect the goal and run again.' })
    return out
  }

  // Quality
  const optimal = list.filter(r => r.isOptimal).map(r => r.id)
  if (optimal.length === ids.length) {
    out.push({ kind: 'success', text: `Every selected algorithm found an optimal path (cost ${baseline.optimalCost}). Try "Weighted Shortcut" or "Misleading Heuristic" to see them disagree.` })
  } else if (optimal.length > 0) {
    out.push({ kind: 'success', text: `${joinNames(optimal)} found the optimal path (cost ${baseline.optimalCost}).` })
  }
  for (const r of list) {
    if (!r.pathFound) {
      out.push({ kind: 'danger', algoId: r.id, text: `${nameOf(r.id)} finished without reaching the goal.` })
    } else if (!r.isOptimal && r.realCost != null) {
      const pct = Math.round((r.optimalityRatio - 1) * 100)
      let text = `${nameOf(r.id)} found a path costing ${r.realCost}: ${pct}% more than optimal (${baseline.optimalCost}).`
      if (r.id === ALGORITHM.BFS) text += ` BFS minimizes hops (${r.hops}), not weighted cost.`
      if (r.id === ALGORITHM.GREEDY) text += ' Greedy trusts h(n) alone and ignores the cost already paid.'
      out.push({ kind: 'warning', algoId: r.id, text })
    }
  }

  // Efficiency
  if (ids.length >= 2) {
    const byExpanded = [...list].sort((a, b) => a.nodesExpanded - b.nodesExpanded)
    const least = byExpanded[0]
    const most = byExpanded[byExpanded.length - 1]
    if (least.nodesExpanded !== most.nodesExpanded) {
      out.push({ kind: 'info', algoId: least.id, text: `${nameOf(least.id)} expanded the fewest nodes (${least.nodesExpanded}); ${nameOf(most.id)} expanded the most (${most.nodesExpanded}), ${most.wastedExpansions} of them off the final path.` })
    }
  }

  // A* vs UCS: the value of the heuristic
  if (has(ALGORITHM.ASTAR) && has(ALGORITHM.UCS)) {
    const a = results[ALGORITHM.ASTAR]
    const u = results[ALGORITHM.UCS]
    if (a.isOptimal && u.isOptimal) {
      const diff = u.nodesExpanded - a.nodesExpanded
      out.push(diff > 0
        ? { kind: 'success', algoId: ALGORITHM.ASTAR, text: `A* matched UCS's optimal cost while expanding ${diff} fewer node${diff === 1 ? '' : 's'}: the heuristic pruned the search.` }
        : { kind: 'info', algoId: ALGORITHM.ASTAR, text: 'A* expanded as many nodes as UCS here, so the heuristic gave no pruning advantage on this graph.' })
    }
  }

  // Greedy: fast but risky
  if (has(ALGORITHM.GREEDY)) {
    const g = results[ALGORITHM.GREEDY]
    const fastest = Math.min(...list.filter(r => r.pathFound).map(r => r.stepsToGoal))
    if (g.pathFound && g.stepsToGoal === fastest && !g.isOptimal) {
      out.push({ kind: 'warning', algoId: ALGORITHM.GREEDY, text: 'Greedy converged the fastest but paid for it with a non-optimal path: the classic speed-vs-quality trade-off.' })
    }
  }

  // Heuristic health
  const usesHeuristic = has(ALGORITHM.ASTAR) || has(ALGORITHM.GREEDY)
  if (usesHeuristic) {
    const allZero = Object.keys(graph.nodes).every(id => getNodeHeuristic(id, graph) === 0)
    if (allZero) {
      out.push({ kind: 'warning', text: 'Every h(n) is 0, so A* behaves exactly like UCS and Greedy has no guidance. Set heuristic values in Edit Graph.' })
    } else if (baseline.inadmissible.length > 0) {
      const { nodeId, h, trueCost } = baseline.inadmissible[0]
      const more = baseline.inadmissible.length - 1
      let text = `h(${nodeId}) = ${h} overestimates the true remaining cost ${trueCost}${more > 0 ? ` (and ${more} more node${more === 1 ? '' : 's'})` : ''}, so the heuristic is inadmissible and A*'s optimality guarantee does not hold.`
      if (has(ALGORITHM.ASTAR) && results[ALGORITHM.ASTAR].isOptimal) text += ' A* still happened to find the optimal path.'
      out.push({ kind: 'warning', algoId: ALGORITHM.ASTAR, text })
    }
  }

  // Execution time
  if (ids.length >= 2) {
    const byTime = [...list].sort((a, b) => a.timeMs - b.timeMs)
    const fastest = byTime[0]
    const slowest = byTime[byTime.length - 1]
    const spread = slowest.timeMs / fastest.timeMs
    out.push({
      kind: 'info',
      algoId: fastest.id,
      text: `${nameOf(fastest.id)} had the fastest execution (${formatTime(fastest.timeMs)} avg over ${fastest.timingRuns} runs).${spread < 1.25 ? ' Differences under ~25% are within measurement noise on a graph this small.' : ''}`,
    })
  }

  return out
}
