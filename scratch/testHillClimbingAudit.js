/**
 * scratch/testHillClimbingAudit.js
 * Test suite for auditing Hill Climbing implementation against all 8 required scenarios.
 */

import { runHillClimbingTwoPhase } from '../src/features/graph/engine/hillClimbingTwoPhaseEngine.js'
import { explainStep } from '../src/features/graph/engine/explanationGenerator.js'

function runTest(name, graph, expectedTrajectory, expectedStatus) {
  console.log(`\n==================================================`)
  console.log(`RUNNING: ${name}`)
  console.log(`==================================================`)

  const steps = runHillClimbingTwoPhase(graph)
  console.log(`Total Steps Produced: ${steps.length}`)

  const trajectory = []
  let finalStatus = 'Unknown'

  steps.forEach((step, idx) => {
    const act = step.stepType || step.action
    const node = step.currentNode
    const h = step.algorithmSpecificState?.currentH
    const status = step.algorithmSpecificState?.localOptimumStatus
    const best = step.algorithmSpecificState?.bestCandidate
    const neighbors = step.neighbors ?? []

    if (!trajectory.includes(node)) trajectory.push(node)
    finalStatus = status ?? finalStatus

    console.log(`Step ${idx} [${act}]: current=${node} (h=${h}), neighbors=[${neighbors.join(', ')}], bestCandidate=${best ?? 'None'}, status=${status}`)

    const expBeg = explainStep(step, 'hillclimbing', graph, 'beginner')
    const expDet = explainStep(step, 'hillclimbing', graph, 'detailed')

    // Check for illegal frontier terminology in Hill Climbing explanations
    const hasFrontierWordingBeg = expBeg.detailedExplanation.toLowerCase().includes('frontier queue')
    const hasFrontierWordingDet = expDet.detailedExplanation.toLowerCase().includes('frontier queue')
    if (hasFrontierWordingBeg || hasFrontierWordingDet) {
      console.error(`❌ FAIL: Explanation contains illegal 'frontier queue' wording!`)
    }
  })

  const trajStr = trajectory.join(' → ')
  console.log(`Result Trajectory: ${trajStr}`)
  console.log(`Final Status: ${finalStatus}`)

  const passTraj = !expectedTrajectory || trajStr === expectedTrajectory
  const passStatus = !expectedStatus || finalStatus === expectedStatus

  if (passTraj && passStatus) {
    console.log(`✅ TEST PASSED!`)
  } else {
    console.error(`❌ TEST FAILED! Expected trajectory: "${expectedTrajectory}", got: "${trajStr}". Expected status: "${expectedStatus}", got: "${finalStatus}".`)
  }
}

// TEST 1: Preset Graph (A=10, B=6, C=7, D=3, E=4, F=0) -> A -> B -> D -> F
const presetGraph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', x: 100, y: 250, isStart: true, isGoal: false, hValue: 10, h: 10 },
    B: { id: 'B', label: 'B', x: 260, y: 120, isStart: false, isGoal: false, hValue: 6, h: 6 },
    C: { id: 'C', label: 'C', x: 260, y: 380, isStart: false, isGoal: false, hValue: 7, h: 7 },
    D: { id: 'D', label: 'D', x: 440, y: 200, isStart: false, isGoal: false, hValue: 3, h: 3 },
    E: { id: 'E', label: 'E', x: 440, y: 340, isStart: false, isGoal: false, hValue: 4, h: 4 },
    F: { id: 'F', label: 'F', x: 620, y: 250, isStart: false, isGoal: true, hValue: 0, h: 0 },
  },
  edges: {
    'A-B': { id: 'A-B', sourceId: 'A', targetId: 'B', weight: 4, directed: false },
    'A-C': { id: 'A-C', sourceId: 'A', targetId: 'C', weight: 2, directed: false },
    'B-D': { id: 'B-D', sourceId: 'B', targetId: 'D', weight: 5, directed: false },
    'C-E': { id: 'C-E', sourceId: 'C', targetId: 'E', weight: 3, directed: false },
    'D-F': { id: 'D-F', sourceId: 'D', targetId: 'F', weight: 1, directed: false },
    'E-F': { id: 'E-F', sourceId: 'E', targetId: 'F', weight: 4, directed: false },
    'B-E': { id: 'B-E', sourceId: 'B', targetId: 'E', weight: 2, directed: false },
  }
}
runTest('TEST 1: Preset Graph (Expected: A → B → D → F)', presetGraph, 'A → B → D → F', 'Goal Reached')

// TEST 2: A has neighbors B=5 and C=8 while A=10 -> A -> B
const test2Graph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', hValue: 10, h: 10 },
    B: { id: 'B', label: 'B', hValue: 5, h: 5 },
    C: { id: 'C', label: 'C', hValue: 8, h: 8 },
    F: { id: 'F', label: 'F', hValue: 0, h: 0 },
  },
  edges: {
    'A-B': { id: 'A-B', sourceId: 'A', targetId: 'B', directed: true },
    'A-C': { id: 'A-C', sourceId: 'A', targetId: 'C', directed: true },
    'B-C': { id: 'B-C', sourceId: 'B', targetId: 'C', directed: true },
  }
}
runTest('TEST 2: A=10, B=5, C=8 (Expected: A → B)', test2Graph, 'A → B', 'Local Optimum / No Better Neighbor')

// TEST 3: A=5, neighbors B=7 and C=8 -> Stop at A
const test3Graph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', hValue: 5, h: 5 },
    B: { id: 'B', label: 'B', hValue: 7, h: 7 },
    C: { id: 'C', label: 'C', hValue: 8, h: 8 },
    F: { id: 'F', label: 'F', hValue: 0, h: 0 },
  },
  edges: {
    'A-B': { id: 'A-B', sourceId: 'A', targetId: 'B', directed: true },
    'A-C': { id: 'A-C', sourceId: 'A', targetId: 'C', directed: true },
  }
}
runTest('TEST 3: Local Optimum (A=5, B=7, C=8 -> Stop at A)', test3Graph, 'A', 'Local Optimum / No Better Neighbor')

// TEST 4: A=5, B=5 (Equal Heuristic Plateau -> Stop at A)
const test4Graph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', hValue: 5, h: 5 },
    B: { id: 'B', label: 'B', hValue: 5, h: 5 },
    F: { id: 'F', label: 'F', hValue: 0, h: 0 },
  },
  edges: {
    'A-B': { id: 'A-B', sourceId: 'A', targetId: 'B', directed: true },
  }
}
runTest('TEST 4: Plateau / Equal Heuristic (A=5, B=5 -> Stop at A)', test4Graph, 'A', 'Plateau / Equal Heuristic')

// TEST 5: Current node has no neighbors -> Stop at A (No Neighbors)
const test5Graph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', hValue: 10, h: 10 },
    F: { id: 'F', label: 'F', hValue: 0, h: 0 },
  },
  edges: {}
}
runTest('TEST 5: No Neighbors (Expected: Stop at A)', test5Graph, 'A', 'No Neighbors')

// TEST 6: Start node is already the goal (A=0, Start=A, Goal=A)
const test6Graph = {
  startId: 'A',
  goalId: 'A',
  nodes: {
    A: { id: 'A', label: 'A', hValue: 0, h: 0 },
  },
  edges: {}
}
runTest('TEST 6: Start = Goal (Expected: Goal Reached immediately)', test6Graph, 'A', 'Goal Reached')

// TEST 7: Deterministic tie-breaking (B=4, C=4 when A=10)
const test7Graph = {
  startId: 'A',
  goalId: 'F',
  nodes: {
    A: { id: 'A', label: 'A', hValue: 10, h: 10 },
    B: { id: 'B', label: 'B', hValue: 4, h: 4 },
    C: { id: 'C', label: 'C', hValue: 4, h: 4 },
    F: { id: 'F', label: 'F', hValue: 0, h: 0 },
  },
  edges: {
    'A-C': { id: 'A-C', sourceId: 'A', targetId: 'C', directed: true },
    'A-B': { id: 'A-B', sourceId: 'A', targetId: 'B', directed: true },
    'B-C': { id: 'B-C', sourceId: 'B', targetId: 'C', directed: true },
  }
}
runTest('TEST 7: Deterministic Tie-breaking (B=4, C=4 -> Picks B alphabetically)', test7Graph, 'A → B', 'Plateau / Equal Heuristic')

// TEST 8: Repeated Runs Determinism Test
console.log(`\n==================================================`)
console.log(`RUNNING: TEST 8: Multi-Run Determinism`)
console.log(`==================================================`)
const run1 = runHillClimbingTwoPhase(presetGraph).map(s => `${s.currentNode}:${s.algorithmSpecificState?.bestCandidate}`).join('|')
const run2 = runHillClimbingTwoPhase(presetGraph).map(s => `${s.currentNode}:${s.algorithmSpecificState?.bestCandidate}`).join('|')
const run3 = runHillClimbingTwoPhase(presetGraph).map(s => `${s.currentNode}:${s.algorithmSpecificState?.bestCandidate}`).join('|')

if (run1 === run2 && run2 === run3) {
  console.log(`✅ TEST 8 PASSED! All 3 runs produced identical output state sequences.`)
} else {
  console.error(`❌ TEST 8 FAILED! Non-deterministic runs detected.`)
}
