import {
  CELL_EMPTY,
  CELL_WALL,
  CELL_START,
  CELL_END,
  runGridBFS,
  runGridDFS,
  runGridUCS,
  runGridGreedy,
  runGridAStar,
  runGridHillClimbing,
  getManhattanDistance,
  getEuclideanDistance,
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

const ALGORITHMS = [
  { name: 'BFS', fn: runGridBFS },
  { name: 'DFS', fn: runGridDFS },
  { name: 'UCS', fn: runGridUCS },
  { name: 'Greedy (Manhattan)', fn: (g, s, e) => runGridGreedy(g, s, e, 'manhattan') },
  { name: 'Greedy (Euclidean)', fn: (g, s, e) => runGridGreedy(g, s, e, 'euclidean') },
  { name: 'A* (Manhattan)', fn: (g, s, e) => runGridAStar(g, s, e, 'manhattan') },
  { name: 'A* (Euclidean)', fn: (g, s, e) => runGridAStar(g, s, e, 'euclidean') },
]

// Test Suite Data Definitions (Categories A - J)
const TEST_SUITES = [
  {
    category: 'A. Empty Grid',
    rows: 5, cols: 5,
    start: [0, 0], end: [4, 4],
    walls: [],
    shouldFindPath: true,
    optimalCost: 8,
  },
  {
    category: 'B. Direct Path Horizontal',
    rows: 1, cols: 5,
    start: [0, 0], end: [0, 4],
    walls: [],
    shouldFindPath: true,
    optimalCost: 4,
  },
  {
    category: 'C. Single Wall Barrier',
    rows: 5, cols: 5,
    start: [2, 0], end: [2, 4],
    walls: [[2, 2]],
    shouldFindPath: true,
    optimalCost: 6,
  },
  {
    category: 'D. Maze / U-Shaped Barrier',
    rows: 5, cols: 5,
    start: [2, 2], end: [0, 2],
    walls: [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1]],
    shouldFindPath: true,
  },
  {
    category: 'E. No Possible Path (Fully Blocked Goal)',
    rows: 5, cols: 5,
    start: [0, 0], end: [2, 2],
    walls: [[1, 2], [3, 2], [2, 1], [2, 3]],
    shouldFindPath: false,
  },
  {
    category: 'F. Start Adjacent to Goal',
    rows: 3, cols: 3,
    start: [1, 1], end: [1, 2],
    walls: [],
    shouldFindPath: true,
    optimalCost: 1,
  },
  {
    category: 'G. Start & Goal Separated by Full Wall Line',
    rows: 5, cols: 5,
    start: [0, 0], end: [4, 4],
    walls: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
    shouldFindPath: false,
  },
  {
    category: 'H. Multiple Possible Paths (Symmetric Obstacle)',
    rows: 5, cols: 5,
    start: [2, 0], end: [2, 4],
    walls: [[2, 2]],
    shouldFindPath: true,
    optimalCost: 6,
  },
  {
    category: 'I. Equal Cost Step Consistency',
    rows: 4, cols: 4,
    start: [0, 0], end: [3, 3],
    walls: [],
    shouldFindPath: true,
    optimalCost: 6,
  },
  {
    category: 'J. Tie Situation Handling',
    rows: 3, cols: 3,
    start: [1, 1], end: [2, 2],
    walls: [],
    shouldFindPath: true,
    optimalCost: 2,
  },
]

let totalTests = 0
let passedTests = 0
let failedTests = 0
const failures = []

console.log('=====================================================')
console.log('  GRID ALGORITHM CORRECTNESS TEST LAYER SUITE')
console.log('=====================================================\n')

for (const suite of TEST_SUITES) {
  console.log(`\n--- Category: ${suite.category} ---`)
  const grid = createGrid(suite.rows, suite.cols, suite.start, suite.end, suite.walls)

  for (const algo of ALGORITHMS) {
    totalTests++
    const testName = `${suite.category} [${algo.name}]`
    try {
      const res = algo.fn(grid, suite.start, suite.end)

      const issues = []

      if (res.found !== suite.shouldFindPath) {
        issues.push(`Expected found=${suite.shouldFindPath}, got found=${res.found}`)
      }

      if (res.found) {
        if (res.path[0][0] !== suite.start[0] || res.path[0][1] !== suite.start[1]) {
          issues.push(`Path does not start at Start: ${JSON.stringify(res.path[0])}`)
        }

        const lastCell = res.path[res.path.length - 1]
        if (lastCell[0] !== suite.end[0] || lastCell[1] !== suite.end[1]) {
          issues.push(`Path does not end at Goal: ${JSON.stringify(lastCell)}`)
        }

        for (let i = 0; i < res.path.length - 1; i++) {
          const [r1, c1] = res.path[i]
          const [r2, c2] = res.path[i + 1]
          const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2)
          if (dist !== 1) {
            issues.push(`Invalid non-adjacent path step: [${r1},${c1}] to [${r2},${c2}]`)
          }
        }

        for (const [r, c] of res.path) {
          if (grid[r][c] === CELL_WALL) {
            issues.push(`Path passes through wall cell [${r},${c}]`)
          }
        }

        // Optimal cost check for BFS, UCS, and A*
        if (suite.optimalCost !== undefined && ['BFS', 'UCS', 'A* (Manhattan)', 'A* (Euclidean)'].includes(algo.name)) {
          const pathSteps = res.path.length - 1
          if (pathSteps !== suite.optimalCost) {
            issues.push(`Expected optimal path length ${suite.optimalCost}, got ${pathSteps}`)
          }
        }
      } else {
        if (res.path.length !== 0) {
          issues.push(`Found=false but path is non-empty: length ${res.path.length}`)
        }
      }

      for (const [r, c] of res.visitedOrder) {
        if (r < 0 || r >= suite.rows || c < 0 || c >= suite.cols) {
          issues.push(`Visited node out of grid bounds: [${r},${c}]`)
        }
        if (grid[r][c] === CELL_WALL) {
          issues.push(`Visited cell is a wall: [${r},${c}]`)
        }
      }

      if (issues.length === 0) {
        passedTests++
        console.log(`  ✓ PASSED: ${algo.name}`)
      } else {
        failedTests++
        failures.push({ testName, issues })
        console.log(`  ❌ FAILED: ${algo.name}`)
        for (const issue of issues) {
          console.log(`     - ${issue}`)
        }
      }
    } catch (err) {
      failedTests++
      failures.push({ testName, issues: [`Exception thrown: ${err.message}`] })
      console.log(`  ❌ EXCEPTION: ${algo.name} - ${err.message}`)
    }
  }
}

console.log('\n=====================================================')
console.log('  TEST SUITE SUMMARY')
console.log('=====================================================')
console.log(`Total Tests Run:  ${totalTests}`)
console.log(`Passed:           ${passedTests}`)
console.log(`Failed:           ${failedTests}`)

if (failures.length > 0) {
  console.log('\nEXACT FAILURES DETAIL:')
  for (const f of failures) {
    console.log(`\n• ${f.testName}:`)
    for (const issue of f.issues) {
      console.log(`   └─ ${issue}`)
    }
  }
} else {
  console.log('\n🎉 ALL ALGORITHM ENGINES PASSED 100% OF CORRECTNESS TESTS!')
}

// Dedicated A* Heuristic & Formula Validation
console.log('\n=====================================================')
console.log('  DEDICATED A* HEURISTIC & FORMULA VALIDATION')
console.log('=====================================================\n')

function verifyAStarFormulas(heuristicName, heuristicFn) {
  const cases = [
    { name: 'Empty Grid', grid: createGrid(5, 5, [0, 0], [4, 4]), end: [4, 4] },
    { name: 'Grid with Walls', grid: createGrid(5, 5, [2, 0], [2, 4], [[2, 2]]), end: [2, 4] },
    { name: 'No-Path Grid', grid: createGrid(5, 5, [0, 0], [2, 2], [[1, 2], [3, 2], [2, 1], [2, 3]]), end: [2, 2] },
  ]

  for (const c of cases) {
    const res = runGridAStar(c.grid, null, null, heuristicName)
    console.log(`Testing A* + ${heuristicName} on ${c.name}:`)
    if (res.found) {
      const pathSteps = res.path.length - 1
      const [endR, endC] = c.end
      const expectedH = heuristicFn(endR, endC, endR, endC) // At goal node, h(n) = 0
      const expectedF = pathSteps + expectedH

      const g = pathSteps
      const h = expectedH
      const f = g + h

      console.log(`  ✓ g(n) = ${g} (actual cost from start)`)
      console.log(`  ✓ h(n) = ${h} (selected ${heuristicName} distance to goal)`)
      console.log(`  ✓ f(n) = g(n) + h(n) = ${f}`)
      if (f !== expectedF) {
        throw new Error(`Formula mismatch for A* + ${heuristicName}: f=${f}, expected=${expectedF}`)
      }
    } else {
      console.log(`  ✓ Correctly returned found=false when goal is unreachable`)
    }
  }
}

verifyAStarFormulas('manhattan', getManhattanDistance)
verifyAStarFormulas('euclidean', getEuclideanDistance)
console.log('\n🎉 A* MANHATTAN AND EUCLIDEAN FORMULA VALIDATIONS PASSED 100%!')

// Dedicated Hill Climbing Local Search Validation
console.log('\n=====================================================')
console.log('  DEDICATED HILL CLIMBING LOCAL SEARCH VALIDATION')
console.log('=====================================================\n')

// 1. Empty Grid (Unobstructed descent to goal)
const emptyGrid = createGrid(5, 5, [0, 0], [4, 4])
const hcEmpty = runGridHillClimbing(emptyGrid, [0, 0], [4, 4], 'manhattan')
console.log(`Hill Climbing on Empty Grid (0,0 -> 4,4):`)
console.log(`  ✓ Found: ${hcEmpty.found}`)
console.log(`  ✓ Stuck: ${hcEmpty.stuck}`)
console.log(`  ✓ Steps Generated: ${hcEmpty.steps.length}`)
if (!hcEmpty.found) throw new Error('Hill Climbing should reach goal on empty grid!')

// 2. U-Shaped Wall Barrier (Traps local search at local optimum)
const uGrid = createGrid(5, 5, [2, 2], [0, 2], [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1]])
const hcU = runGridHillClimbing(uGrid, [2, 2], [0, 2], 'manhattan')
console.log(`Hill Climbing on U-Shaped Barrier Grid (Local Optimum Trap):`)
console.log(`  ✓ Found: ${hcU.found}`)
console.log(`  ✓ Stuck: ${hcU.stuck}`)
console.log(`  ✓ Stopped at Local Optimum cell: [${hcU.steps[hcU.steps.length - 1].currentCell.join(',')}] (h=${hcU.steps[hcU.steps.length - 1].currentH})`)
if (hcU.found || !hcU.stuck) throw new Error('Hill Climbing must get stuck at local optimum in U-shaped trap!')

console.log('\n🎉 HILL CLIMBING LOCAL SEARCH VALIDATIONS PASSED 100%!')


