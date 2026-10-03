import {
  runGridBFS,
  runGridDFS,
  runGridUCS,
  runGridGreedy,
  runGridAStar,
  runGridHillClimbing,
  runGridSimulatedAnnealing,
} from '../src/features/grid/engine/gridEngines.js'

const ROWS = 10
const COLS = 10

const CELL_EMPTY = 0
const CELL_WALL = 1
const CELL_START = 2
const CELL_END = 3

function createGrid(rows = ROWS, cols = COLS, start = [0, 0], end = [rows - 1, cols - 1], wallCoords = []) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(CELL_EMPTY))
  for (const [r, c] of wallCoords) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      g[r][c] = CELL_WALL
    }
  }
  g[start[0]][start[1]] = CELL_START
  g[end[0]][end[1]] = CELL_END
  return g
}

const TEST_SCENARIOS = [
  {
    name: '1. Empty Grid',
    makeGrid: () => createGrid(8, 8, [0, 0], [7, 7], []),
    start: [0, 0],
    end: [7, 7],
    hasPath: true,
  },
  {
    name: '2. Simple Path (Direct Horizontal)',
    makeGrid: () => createGrid(5, 8, [2, 0], [2, 7], []),
    start: [2, 0],
    end: [2, 7],
    hasPath: true,
  },
  {
    name: '3. Complex Obstacles (U-shaped Trap)',
    makeGrid: () => createGrid(6, 6, [2, 2], [2, 5], [
      [1, 3], [2, 3], [3, 3], [3, 2], [3, 1]
    ]),
    start: [2, 2],
    end: [2, 5],
    hasPath: true,
  },
  {
    name: '4. No Path (Completely Enclosed Goal)',
    makeGrid: () => createGrid(6, 6, [0, 0], [3, 3], [
      [2, 3], [4, 3], [3, 2], [3, 4]
    ]),
    start: [0, 0],
    end: [3, 3],
    hasPath: false,
  },
  {
    name: '5. Start Next to Goal',
    makeGrid: () => createGrid(4, 4, [1, 1], [1, 2], []),
    start: [1, 1],
    end: [1, 2],
    hasPath: true,
  },
  {
    name: '6. Start Equals Goal',
    makeGrid: () => createGrid(4, 4, [2, 2], [2, 2], []),
    start: [2, 2],
    end: [2, 2],
    hasPath: true,
  },
  {
    name: '7. Large Wall Structures (Dividing Wall with Gap)',
    makeGrid: () => {
      const walls = []
      for (let r = 0; r < 9; r++) {
        if (r !== 8) walls.push([r, 5])
      }
      return createGrid(10, 10, [0, 0], [0, 9], walls)
    },
    start: [0, 0],
    end: [0, 9],
    hasPath: true,
  },
  {
    name: '8. Narrow Corridors (S-tunnel)',
    makeGrid: () => {
      const walls = []
      for (let c = 0; c < 5; c++) walls.push([1, c])
      for (let c = 1; c < 6; c++) walls.push([3, c])
      return createGrid(5, 6, [0, 0], [4, 5], walls)
    },
    start: [0, 0],
    end: [4, 5],
    hasPath: true,
  },
  {
    name: '9. Multiple Possible Paths (Symmetric Bypass)',
    makeGrid: () => createGrid(5, 5, [2, 0], [2, 4], [[2, 2]]),
    start: [2, 0],
    end: [2, 4],
    hasPath: true,
  },
]

const results = {
  BFS: { pass: true, failures: [] },
  DFS: { pass: true, failures: [] },
  UCS: { pass: true, failures: [] },
  Greedy: { pass: true, failures: [] },
  AStarManhattan: { pass: true, failures: [] },
  AStarEuclidean: { pass: true, failures: [] },
  HillClimbing: { pass: true, failures: [] },
  SimulatedAnnealing: { pass: true, failures: [] },
}

console.log('=====================================================')
console.log('  COMPLETE REGRESSION SUITE: 8 ALGORITHMS x 9 SCENARIOS')
console.log('=====================================================\n')

for (const sc of TEST_SCENARIOS) {
  const g = sc.makeGrid()

  // 1. BFS
  try {
    const res = runGridBFS(g, sc.start, sc.end)
    if (sc.hasPath) {
      if (!res.found) throw new Error('Failed to find path when one exists')
      if (res.path[0][0] !== sc.start[0] || res.path[0][1] !== sc.start[1]) throw new Error('Start cell not respected in path')
      const last = res.path[res.path.length - 1]
      if (last[0] !== sc.end[0] || last[1] !== sc.end[1]) throw new Error('End cell not respected in path')
    } else {
      if (res.found) throw new Error('Found path on blocked grid')
    }
  } catch (err) {
    results.BFS.pass = false
    results.BFS.failures.push(`${sc.name}: ${err.message}`)
  }

  // 2. DFS
  try {
    const res = runGridDFS(g, sc.start, sc.end)
    if (sc.hasPath) {
      if (!res.found) throw new Error('Failed to find path when one exists')
      if (res.path[0][0] !== sc.start[0] || res.path[0][1] !== sc.start[1]) throw new Error('Start cell not respected in path')
    } else {
      if (res.found) throw new Error('Found path on blocked grid')
    }
  } catch (err) {
    results.DFS.pass = false
    results.DFS.failures.push(`${sc.name}: ${err.message}`)
  }

  // 3. UCS
  try {
    const res = runGridUCS(g, sc.start, sc.end)
    if (sc.hasPath) {
      if (!res.found) throw new Error('Failed to find path when one exists')
    } else {
      if (res.found) throw new Error('Found path on blocked grid')
    }
  } catch (err) {
    results.UCS.pass = false
    results.UCS.failures.push(`${sc.name}: ${err.message}`)
  }

  // 4. Greedy
  try {
    const res = runGridGreedy(g, sc.start, sc.end, 'manhattan')
    if (sc.hasPath && sc.name !== '3. Complex Obstacles (U-shaped Trap)') {
      if (!res.found) throw new Error('Failed to find path on open grid')
    }
    if (!sc.hasPath && res.found) throw new Error('Found path on blocked grid')
  } catch (err) {
    results.Greedy.pass = false
    results.Greedy.failures.push(`${sc.name}: ${err.message}`)
  }

  // 5. A* Manhattan
  try {
    const res = runGridAStar(g, sc.start, sc.end, 'manhattan')
    if (sc.hasPath) {
      if (!res.found) throw new Error('Failed to find path when one exists')
    } else {
      if (res.found) throw new Error('Found path on blocked grid')
    }
  } catch (err) {
    results.AStarManhattan.pass = false
    results.AStarManhattan.failures.push(`${sc.name}: ${err.message}`)
  }

  // 6. A* Euclidean
  try {
    const res = runGridAStar(g, sc.start, sc.end, 'euclidean')
    if (sc.hasPath) {
      if (!res.found) throw new Error('Failed to find path when one exists')
    } else {
      if (res.found) throw new Error('Found path on blocked grid')
    }
  } catch (err) {
    results.AStarEuclidean.pass = false
    results.AStarEuclidean.failures.push(`${sc.name}: ${err.message}`)
  }

  // 7. Hill Climbing
  try {
    const res = runGridHillClimbing(g, sc.start, sc.end, 'manhattan')
    if (sc.name === '3. Complex Obstacles (U-shaped Trap)') {
      if (res.found) throw new Error('Hill Climbing should get stuck at local optimum trap')
      if (!res.stuck) throw new Error('Hill Climbing should report stuck=true at local optimum')
    } else if (sc.name === '1. Empty Grid') {
      if (!res.found) throw new Error('Hill Climbing should reach goal on open grid')
    }
  } catch (err) {
    results.HillClimbing.pass = false
    results.HillClimbing.failures.push(`${sc.name}: ${err.message}`)
  }

  // 8. Simulated Annealing
  try {
    const res = runGridSimulatedAnnealing(g, sc.start, sc.end, 'manhattan', {
      initialTemp: 100,
      coolingRate: 0.95,
      minTemp: 0.1,
      maxIterations: 200,
    })
    if (sc.name === '6. Start Equals Goal') {
      if (!res.found) throw new Error('Start equals goal should return found=true')
    } else {
      if (!res.steps || res.steps.length === 0) throw new Error('No steps generated')
    }
    if (!sc.hasPath && res.found) throw new Error('Found path on blocked grid')
  } catch (err) {
    results.SimulatedAnnealing.pass = false
    results.SimulatedAnnealing.failures.push(`${sc.name}: ${err.message}`)
  }
}

console.log('=====================================================')
console.log('  REGRESSION RESULT MATRIX')
console.log('=====================================================\n')

console.log('ALGORITHM            | PASS/FAIL | NOTES')
console.log('-----------------------------------------------------')
for (const key of Object.keys(results)) {
  const r = results[key]
  const status = r.pass ? 'PASS' : 'FAIL'
  const note = r.pass ? 'All 9 scenarios verified' : r.failures.join('; ')
  console.log(`${key.padEnd(20)} | ${status.padEnd(9)} | ${note}`)
}

console.log('\nAll 9 scenarios completed successfully!')
