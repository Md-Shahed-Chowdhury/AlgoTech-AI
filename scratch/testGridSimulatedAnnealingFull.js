import {
  CELL_EMPTY,
  CELL_WALL,
  CELL_START,
  CELL_END,
  runGridSimulatedAnnealing,
} from '../src/features/grid/engine/gridEngines.js'

function createGrid(rows, cols, start, end, walls = []) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(CELL_EMPTY))
  g[start[0]][start[1]] = CELL_START
  g[end[0]][end[1]] = CELL_END
  for (const [r, c] of walls) {
    g[r][c] = CELL_WALL
  }
  return g
}

const tests = []
let totalPassed = 0
let totalFailed = 0

function runTest(id, name, testFn) {
  try {
    testFn()
    console.log(`[TEST ${id}] PASS: ${name}`)
    totalPassed++
    tests.push({ id, name, passed: true })
  } catch (err) {
    console.log(`[TEST ${id}] FAIL: ${name}`)
    console.log(`   └─ Error: ${err.message}`)
    totalFailed++
    tests.push({ id, name, passed: false, error: err.message })
  }
}

console.log('=====================================================')
console.log('  GRID SIMULATED ANNEALING 8-POINT TEST SUITE')
console.log('=====================================================\n')

// 1. Accept better or equal move automatically (Delta <= 0)
runTest(1, 'Accept better move automatically (Delta <= 0)', () => {
  const grid = createGrid(5, 5, [0, 0], [4, 4])
  // Sequence rng that picks first candidate [0, 1] (h=7 < h=8)
  const rngSeq = [0.0] 
  let idx = 0
  const res = runGridSimulatedAnnealing(grid, [0, 0], [4, 4], 'manhattan', {
    initialTemp: 100,
    coolingRate: 0.95,
    rng: () => rngSeq[idx++ % rngSeq.length],
  })
  const step0 = res.steps[0]
  if (step0.delta > 0) throw new Error(`Expected delta <= 0, got ${step0.delta}`)
  if (!step0.accepted) throw new Error('Better move must be accepted automatically')
  if (step0.acceptanceProb !== 1.0) throw new Error('Probability for better move must be 1.0')
})

// 2. Accept worse move probabilistically (r < P)
runTest(2, 'Accept worse move probabilistically when r < P', () => {
  const grid = createGrid(5, 5, [0, 0], [4, 4])
  // Step 1 at [0, 0]: pick neighbor [0, 1] (delta = -1 <= 0, accepted)
  // Step 2 at [0, 1]: pick neighbor [0, 0] (delta = +1 > 0, P = exp(-1/95) = 0.989)
  // r = 0.10 < 0.989 => Accept worse move!
  let calls = 0
  const customRng = () => {
    calls++
    if (calls === 1) return 0.0  // Step 1 candidate index -> [0, 1] (h=7)
    if (calls === 2) return 0.7  // Step 2 candidate index -> [0, 0] (h=8, index 2 in [ [0,2], [1,1], [0,0] ])
    return 0.10                  // Step 2 r value: 0.10 < P => Accept worse move!
  }
  const res = runGridSimulatedAnnealing(grid, [0, 0], [4, 4], 'manhattan', {
    initialTemp: 100,
    coolingRate: 0.95,
    rng: customRng,
  })
  const worseSteps = res.steps.filter(s => s.delta > 0)
  if (worseSteps.length === 0) throw new Error('Expected at least one step with delta > 0')
  const acceptedWorse = worseSteps.find(s => s.accepted)
  if (!acceptedWorse) throw new Error('Expected worse move to be accepted when r < P')
  if (acceptedWorse.randomVal >= acceptedWorse.acceptanceProb) {
    throw new Error('Accepted worse move must satisfy r < P')
  }
})

// 3. Reject worse move when r >= P
runTest(3, 'Reject worse move when r >= P', () => {
  const grid = createGrid(5, 5, [0, 0], [4, 4])
  // At T = 1.0, delta = +2, P = exp(-2 / 1.0) = 0.1353.
  // If r = 0.90 (>= 0.1353), it MUST be rejected!
  let calls = 0
  const customRng = () => {
    calls++
    if (calls === 1) return 0.0 // pick candidate
    if (calls === 2) return 0.0 // candidate pick
    return 0.95 // r = 0.95 >= P => Reject
  }
  const res = runGridSimulatedAnnealing(grid, [0, 0], [4, 4], 'manhattan', {
    initialTemp: 1.0,
    coolingRate: 0.95,
    rng: customRng,
  })
  const worseSteps = res.steps.filter(s => s.delta > 0)
  if (worseSteps.length === 0) throw new Error('Expected at least one step with delta > 0')
  const rejectedWorse = worseSteps.find(s => !s.accepted)
  if (!rejectedWorse) throw new Error('Expected worse move to be rejected when r >= P')
  if (rejectedWorse.randomVal < rejectedWorse.acceptanceProb) {
    throw new Error('Rejected worse move must satisfy r >= P')
  }
})

// 4. Temperature cooling (T_next = alpha * T)
runTest(4, 'Temperature cooling rule T_next = alpha * T', () => {
  const grid = createGrid(5, 5, [0, 0], [4, 4])
  const initialTemp = 100
  const coolingRate = 0.90
  const res = runGridSimulatedAnnealing(grid, [0, 0], [4, 4], 'manhattan', {
    initialTemp,
    coolingRate,
  })
  let expectedT = initialTemp
  for (let i = 0; i < res.steps.length; i++) {
    if (Math.abs(res.steps[i].temperature - expectedT) > 1e-5) {
      throw new Error(`Step ${i}: expected T=${expectedT}, got T=${res.steps[i].temperature}`)
    }
    expectedT = expectedT * coolingRate
  }
})

// 5. Termination on Goal Reached
runTest(5, 'Termination on Goal Reached', () => {
  const grid = createGrid(3, 3, [1, 1], [1, 2])
  const res = runGridSimulatedAnnealing(grid, [1, 1], [1, 2])
  if (!res.found) throw new Error('Expected found=true when goal is reached')
  if (res.stuck) throw new Error('Expected stuck=false when goal is reached')
})

// 6. Termination on Minimum Temperature reached
runTest(6, 'Termination on Minimum Temperature reached', () => {
  // Goal is unreachable, minTemp = 50, initialTemp = 100, coolingRate = 0.90
  const grid = createGrid(5, 5, [0, 0], [2, 2], [[1, 2], [3, 2], [2, 1], [2, 3]])
  const res = runGridSimulatedAnnealing(grid, [0, 0], [2, 2], 'manhattan', {
    initialTemp: 100,
    minTemp: 50,
    coolingRate: 0.90,
  })
  if (res.found) throw new Error('Goal is blocked, found should be false')
  if (!res.stuck) throw new Error('Expected stuck=true when minTemp reached')
  if (res.finalTemp > 50) throw new Error(`Final temp ${res.finalTemp} should be <= minTemp 50`)
})

// 7. Termination on Max Iterations reached
runTest(7, 'Termination on Max Iterations reached', () => {
  const grid = createGrid(5, 5, [0, 0], [2, 2], [[1, 2], [3, 2], [2, 1], [2, 3]])
  const res = runGridSimulatedAnnealing(grid, [0, 0], [2, 2], 'manhattan', {
    initialTemp: 1000,
    minTemp: 0.001,
    coolingRate: 0.999,
    maxIterations: 10,
  })
  if (res.found) throw new Error('Goal is blocked, found should be false')
  if (res.steps.length !== 10) throw new Error(`Expected exactly 10 step iterations, got ${res.steps.length}`)
})

// 8. Neighbor validity & Wall / Out-of-bounds safety invariant
runTest(8, 'Neighbor validity & Wall / Out-of-bounds safety invariant', () => {
  const walls = [[1, 0], [0, 1]]
  const grid = createGrid(3, 3, [0, 0], [2, 2], walls)
  const res = runGridSimulatedAnnealing(grid, [0, 0], [2, 2])
  for (const step of res.steps) {
    const cand = step.candidateCell
    if (cand[0] < 0 || cand[0] >= 3 || cand[1] < 0 || cand[1] >= 3) {
      throw new Error(`Out of bounds candidate: ${cand}`)
    }
    if (grid[cand[0]][cand[1]] === CELL_WALL) {
      throw new Error(`Wall candidate selected: ${cand}`)
    }
  }
})

console.log('\n=====================================================')
console.log('  SUMMARY')
console.log('=====================================================')
console.log(`Passed: ${totalPassed} / 8`)
console.log(`Failed: ${totalFailed} / 8`)

if (totalFailed > 0) {
  process.exit(1)
}
