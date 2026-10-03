import { createPresetGraph } from '../src/features/graph/utils/graphUtils.js'
import { runAlgorithm } from '../src/features/graph/engine/algorithmEngine.js'
import { calculatePathCost } from '../src/features/graph/utils/graphUtils.js'
import { ALGORITHM } from '../src/features/graph/types/graphTypes.js'

console.log('=== STARTING COMPLETE ALGORITHM CALCULATION & CORRECTNESS AUDIT ===\n')

let allPassed = true

// ── TEST 1: Preset Graph Path Cost Audit (A-B:4, B-D:5, D-F:1 -> Path: A->B->D->F, Cost: 10) ────
console.log('--- TEST 1: PRESET GRAPH PATH COST & EDGE COUNT AUDIT ---')
const presetGraph = createPresetGraph()
// Preset graph edges: A-B:4, B-D:5, D-F:1. Path A->B->D->F cost = 10. Edges = 3. Nodes = 4.

const presetAlgos = [ALGORITHM.BFS, ALGORITHM.DFS, ALGORITHM.UCS, ALGORITHM.GREEDY, ALGORITHM.ASTAR, ALGORITHM.HILL_CLIMBING]

for (const algo of presetAlgos) {
  const steps = runAlgorithm(algo, presetGraph)
  const finalStep = steps[steps.length - 1]

  if (!finalStep || !finalStep.goalReached) {
    console.error(`❌ [FAIL] ${algo}: Did not reach goal in preset graph!`)
    allPassed = false
    continue
  }

  const path = finalStep.pathNodes || finalStep.currentPath
  const cost = finalStep.metrics.totalCost
  const edges = finalStep.metrics.pathLength
  const trueCost = calculatePathCost(path, presetGraph)

  if (cost !== trueCost) {
    console.error(`❌ [FAIL] ${algo}: Metric totalCost (${cost}) != true path cost (${trueCost}) for path [${path.join('->')}]!`)
    allPassed = false
  } else if (edges !== path.length - 1) {
    console.error(`❌ [FAIL] ${algo}: Metric pathLength (${edges}) != edges count (${path.length - 1})!`)
    allPassed = false
  } else {
    console.log(`✅ [PASS] ${algo.toUpperCase()}: Path [${path.join(' → ')}], Nodes: ${path.length}, Edges: ${edges}, Path Cost: ${cost} (Matches True Cost ${trueCost})`)
  }
}

// ── TEST 2: Start = Goal Edge Case ─────────────────────────────────────────
console.log('\n--- TEST 2: START = GOAL EDGE CASE ---')
const sameNodeGraph = {
  startId: 'A',
  goalId: 'A',
  nodes: { A: { id: 'A', label: 'A', x: 100, y: 100, isStart: true, isGoal: true } },
  edges: {},
}

for (const algo of presetAlgos) {
  const steps = runAlgorithm(algo, sameNodeGraph)
  const finalStep = steps[steps.length - 1]
  if (finalStep.metrics.totalCost !== 0 || finalStep.metrics.pathLength !== 0 || finalStep.pathNodes.length !== 1) {
    console.error(`❌ [FAIL] ${algo} Start=Goal: Invalid metrics!`, finalStep.metrics)
    allPassed = false
  } else {
    console.log(`✅ [PASS] ${algo.toUpperCase()} Start=Goal: Cost=0, Edges=0, Nodes=1, GoalReached=true`)
  }
}

// ── TEST 3: Disconnected / No Path Edge Case ──────────────────────────────
console.log('\n--- TEST 3: DISCONNECTED / NO PATH EDGE CASE ---')
const noPathGraph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', x: 100, y: 100, isStart: true, isGoal: false },
    F: { id: 'F', label: 'F', x: 500, y: 500, isStart: false, isGoal: true },
  },
  edges: {},
}

for (const algo of presetAlgos) {
  const steps = runAlgorithm(algo, noPathGraph)
  const finalStep = steps[steps.length - 1]
  if (finalStep.goalReached || finalStep.pathFound) {
    console.error(`❌ [FAIL] ${algo} No Path: Reported path found on disconnected graph!`)
    allPassed = false
  } else {
    console.log(`✅ [PASS] ${algo.toUpperCase()} No Path: GoalReached=false, PathFound=false, Final Action=${finalStep.action}`)
  }
}

console.log('\n=== SUMMARY ===')
if (allPassed) {
  console.log('🎉 ALL CALCULATION & ALGORITHM CORRECTNESS AUDITS PASSED 100%!')
} else {
  console.error('⚠️ SOME AUDIT TESTS FAILED!')
  process.exit(1)
}
