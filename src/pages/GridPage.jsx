import { useState, useCallback, useRef, useEffect } from 'react'
import { Grid3x3, Play, RotateCcw, Paintbrush, Flag, MapPin, Activity, Cpu, Square, FastForward } from 'lucide-react'
import { MinHeap } from '../features/graph/utils/MinHeap.js'
import {
  runGridBFS,
  runGridDFS,
  runGridUCS,
  runGridGreedy,
  runGridAStar,
  runGridHillClimbing,
} from '../features/grid/engine/gridEngines.js'
import styles from './GridPage.module.css'

const ROWS = 16
const COLS = 30

const CELL_EMPTY = 0
const CELL_WALL = 1
const CELL_START = 2
const CELL_END = 3
const CELL_VISITED = 4
const CELL_PATH = 5

function makeGrid() {
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(CELL_EMPTY))
  g[4][4] = CELL_START
  g[ROWS - 5][COLS - 5] = CELL_END
  return g
}

const CELL_CLASS = {
  [CELL_EMPTY]: styles.empty,
  [CELL_WALL]: styles.wall,
  [CELL_START]: styles.start,
  [CELL_END]: styles.end,
  [CELL_VISITED]: styles.visited,
  [CELL_PATH]: styles.path,
}

const ALGORITHM_INFO = {
  bfs: {
    name: 'Breadth-First Search (BFS)',
    frontierType: 'Queue (FIFO)',
    formula: 'Unweighted Shortest Path',
    desc: 'Explores grid cells level-by-level in concentric rings using a FIFO Queue.',
  },
  dfs: {
    name: 'Depth-First Search (DFS)',
    frontierType: 'Stack (LIFO)',
    formula: 'Depth Exploration',
    desc: 'Explores deeply along one path until hitting a wall before backtracking using a LIFO Stack.',
  },
  ucs: {
    name: 'Uniform-Cost Search (UCS / Dijkstra)',
    frontierType: 'Min-Priority Queue',
    formula: 'Priority = g(n)',
    desc: 'Expands node with minimum accumulated path cost g(n) from Start.',
  },
  greedy: {
    name: 'Greedy Best-First Search',
    frontierType: 'Min-Priority Queue',
    formula: 'Priority = h(n)',
    desc: 'Directs search toward Goal using distance heuristic h(n).',
  },
  astar: {
    name: 'A* Search',
    frontierType: 'Min-Priority Queue',
    formula: 'Priority = f(n) = g(n) + h(n)',
    desc: 'Combines actual path cost g(n) and heuristic h(n) for optimal search.',
  },
  hillclimbing: {
    name: 'Hill Climbing',
    frontierType: 'Local Candidate Set',
    formula: 'Best Neighbor Move',
    desc: 'Iteratively moves to neighboring cell with lowest heuristic value h(n).',
  },
  simulatedannealing: {
    name: 'Simulated Annealing',
    frontierType: 'Single State + Temperature',
    formula: 'P = exp(-ΔE / T)',
    desc: 'Stochastic search accepting worse moves with probability decaying over Temperature T.',
  },
}

export default function GridPage() {
  const [grid, setGrid] = useState(makeGrid)
  const [drawing, setDrawing] = useState(false)
  const [running, setRunning] = useState(false)
  const [algorithm, setAlgorithm] = useState('bfs')
  const [heuristic, setHeuristic] = useState('manhattan') // 'manhattan' | 'euclidean'
  const [editTool, setEditTool] = useState('wall') // 'wall' | 'start' | 'goal'

  const stopSignalRef = useRef(false)
  const skipSignalRef = useRef(false)

  const createInitialStats = (algo = algorithm) => ({
    visitedCount: 0,
    pathLength: 0,
    status: 'Ready',
    commentary: `${ALGORITHM_INFO[algo]?.name || 'Algorithm'}: ${ALGORITHM_INFO[algo]?.desc || 'Select options and run.'}`,
    frontierSize: 0,
    currentCell: null,
    gCost: null,
    hCost: null,
    fCost: null,
    neighborCandidates: null,
    neighborH: null,
    selectedNeighbor: null,
    heuristicImproved: null,
    localOptimumStatus: null,
    candidateCell: null,
    candidateH: null,
    deltaH: null,
    temperature: null,
    acceptanceProb: null,
    randomVal: null,
    annealingDecision: null,
  })

  const [stats, setStats] = useState(() => ({
    ...createInitialStats('bfs'),
    commentary: 'Select an algorithm, edit walls or start/goal nodes, and click Run Algorithm to begin search.',
  }))

  // Clear visual animation overlay (CELL_VISITED & CELL_PATH)
  const clearExecutionState = useCallback(() => {
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell))
      )
    )
    setStats(createInitialStats(algorithm))
  }, [algorithm])

  // Stop current running simulation mid-way
  const stopSimulation = useCallback(() => {
    if (running) {
      stopSignalRef.current = true
    }
  }, [running])

  // Handle editing grid cells (Wall toggling, moving Start, moving Goal)
  const interactCell = useCallback((r, c) => {
    if (running) stopSimulation()

    setGrid(prev => {
      const g = prev.map(row => [...row])
      if (editTool === 'wall') {
        if (g[r][c] === CELL_EMPTY) g[r][c] = CELL_WALL
        else if (g[r][c] === CELL_WALL) g[r][c] = CELL_EMPTY
      } else if (editTool === 'start') {
        for (let i = 0; i < ROWS; i++)
          for (let j = 0; j < COLS; j++)
            if (g[i][j] === CELL_START) g[i][j] = CELL_EMPTY
        g[r][c] = CELL_START
      } else if (editTool === 'goal') {
        for (let i = 0; i < ROWS; i++)
          for (let j = 0; j < COLS; j++)
            if (g[i][j] === CELL_END) g[i][j] = CELL_EMPTY
        g[r][c] = CELL_END
      }
      return g.map(row => row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell)))
    })
    setStats(prev => ({ ...prev, visitedCount: 0, pathLength: 0, status: 'Ready' }))
  }, [editTool, running, stopSimulation])

  const reset = () => {
    stopSignalRef.current = true
    setGrid(makeGrid())
    setRunning(false)
    setStats({
      ...createInitialStats(algorithm),
      status: 'Reset Complete',
      commentary: 'Grid reset to default layout.',
    })
  }

  const handleAlgorithmChange = (newAlgo) => {
    if (running) stopSimulation()
    setAlgorithm(newAlgo)
    if (newAlgo !== 'astar') {
      setHeuristic('manhattan')
    }
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell))
      )
    )
    setStats(createInitialStats(newAlgo))
  }

  const handleHeuristicChange = (newHeuristic) => {
    if (running) stopSimulation()
    setHeuristic(newHeuristic)
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell))
      )
    )
    setStats(s => ({
      ...s,
      visitedCount: 0,
      pathLength: 0,
      status: 'Ready',
      commentary: `Heuristic updated to ${newHeuristic.toUpperCase()}.`,
    }))
  }

  // Instant calculation / Skip animation handler
  const handleInstantResult = () => {
    if (running) {
      skipSignalRef.current = true
      return
    }

    if (algorithm === 'simulatedannealing') {
      setStats(s => ({
        ...s,
        status: 'Not Implemented Yet',
        commentary: `${ALGORITHM_INFO[algorithm].name} logic is not implemented yet. Select BFS, DFS, UCS, Greedy, A*, or Hill Climbing.`,
      }))
      return
    }

    // Always compute on a PRISTINE grid snapshot (stripping CELL_VISITED & CELL_PATH)
    const cleanGrid = grid.map(row =>
      row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell))
    )

    const engineMap = {
      bfs: runGridBFS,
      dfs: runGridDFS,
      ucs: runGridUCS,
      greedy: runGridGreedy,
      astar: runGridAStar,
      hillclimbing: runGridHillClimbing,
    }
    const engine = engineMap[algorithm] || runGridBFS
    const res = engine(cleanGrid, null, null, heuristic)

    setGrid(() => {
      const ng = cleanGrid.map(row => [...row])
      if (res.visitedOrder) {
        for (const [r, c] of res.visitedOrder) {
          if (ng[r][c] !== CELL_START && ng[r][c] !== CELL_END) ng[r][c] = CELL_VISITED
        }
      }
      if (res.path) {
        for (const [r, c] of res.path) {
          if (ng[r][c] !== CELL_START && ng[r][c] !== CELL_END) ng[r][c] = CELL_PATH
        }
      }
      return ng
    })

    // Exact count of visited intermediate cells excluding Start & Goal nodes
    const visitedNum = res.visitedOrder ? res.visitedOrder.filter(
      ([r, c]) => cleanGrid[r][c] !== CELL_START && cleanGrid[r][c] !== CELL_END
    ).length : 0
    const pathSteps = res.path && res.path.length > 0 ? res.path.length - 1 : 0
    const lastCell = res.path && res.path.length > 0 ? res.path[res.path.length - 1] : null

    let statusText = res.found ? 'Goal Found (Instant)' : 'No Path Found'
    let commentaryText = res.found
      ? `${ALGORITHM_INFO[algorithm].name} (${algorithm === 'astar' || algorithm === 'greedy' || algorithm === 'hillclimbing' ? heuristic.toUpperCase() : 'Standard'}) completed instantly. Path length: ${pathSteps} steps. Visited cells: ${visitedNum}.`
      : 'Target is unreachable.'

    if (algorithm === 'hillclimbing') {
      if (res.found) {
        statusText = 'Goal Found via Hill Climbing'
        commentaryText = `Hill Climbing reached goal via local search trajectory in ${pathSteps} steps after evaluating ${visitedNum} cells.`
      } else {
        statusText = 'Local Optimum Reached (Stuck)'
        commentaryText = `Hill Climbing reached a local optimum after ${visitedNum} steps. No neighbor has a strictly lower heuristic value.`
      }
    }

    setStats({
      ...createInitialStats(algorithm),
      visitedCount: visitedNum,
      pathLength: pathSteps,
      status: statusText,
      commentary: commentaryText,
      frontierSize: 0,
      currentCell: lastCell,
      gCost: algorithm === 'ucs' || algorithm === 'astar' ? pathSteps : null,
      hCost: algorithm === 'greedy' || algorithm === 'astar' || algorithm === 'hillclimbing' ? 0 : null,
      fCost: algorithm === 'astar' ? pathSteps : null,
      localOptimumStatus: algorithm === 'hillclimbing' ? (res.found ? 'Goal Reached' : 'Local Optimum Reached') : null,
      heuristicImproved: algorithm === 'hillclimbing' ? res.found : null,
    })
  }

  const [speed, setSpeed] = useState('normal') // 'slow' | 'normal' | 'fast' | 'ultra'
  const speedRef = useRef('normal')

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const SPEED_MULTIPLIER = {
    very_slow: 6.0,
    slow: 2.2,
    normal: 1.0,
    fast: 0.4,
    ultra: 0.1,
  }

  // Helper delay function respecting speed, skip, and stop signals
  const stepDelay = (ms) => {
    if (skipSignalRef.current) return Promise.resolve()
    const mult = SPEED_MULTIPLIER[speedRef.current] || 1.0
    const delay = Math.max(1, Math.round(ms * mult))
    return new Promise(r => setTimeout(r, delay))
  }

  // Helper heuristic calculation
  const getHeuristic = (r, c, endR, endC) => {
    if (heuristic === 'euclidean') {
      return Math.sqrt((r - endR) ** 2 + (c - endC) ** 2)
    }
    return Math.abs(r - endR) + Math.abs(c - endC)
  }

  // --- ALGORITHM EXECUTIONS ---

  // 1. BFS
  const runBFS = async () => {
    setRunning(true)
    stopSignalRef.current = false
    skipSignalRef.current = false
    clearExecutionState()
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
    const queue   = [[startR, startC]]
    visited[startR][startC] = true
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false
    let visitedCount = 0

    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Running BFS...',
      commentary: 'BFS: Exploring grid level-by-level using FIFO Queue.',
      frontierSize: queue.length,
      currentCell: [startR, startC],
    })

    while (queue.length) {
      if (stopSignalRef.current) {
        setRunning(false)
        setStats(s => ({ ...s, status: 'Simulation Stopped', commentary: 'Simulation stopped by user.' }))
        return
      }

      const [r, c] = queue.shift()
      if (r === endR && c === endC) { found = true; break }

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (visited[nr][nc] || g[nr][nc] === CELL_WALL) continue
        if (g[nr][nc] === CELL_START) continue
        visited[nr][nc] = true
        parent[nr][nc] = [r, c]
        queue.push([nr, nc])

        if (g[nr][nc] !== CELL_END) {
          visitedCount++
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[nr][nc] = CELL_VISITED
            return ng
          })
          setStats(s => ({
            ...s,
            visitedCount,
            frontierSize: queue.length,
            currentCell: [nr, nc],
            commentary: `BFS expanded cell [${nr}, ${nc}]. Queue size: ${queue.length}`,
          }))
          await stepDelay(18)
        }
      }
    }

    if (found && !stopSignalRef.current) {
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      const pathSteps = path.length - 1
      for (const [r, c] of path) {
        if (stopSignalRef.current) { setRunning(false); return }
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await stepDelay(30)
        }
      }
      setStats(s => ({
        ...s,
        visitedCount,
        pathLength: pathSteps,
        frontierSize: 0,
        currentCell: null,
        status: 'Goal Found!',
        commentary: `BFS found optimal unweighted path in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      }))
    } else if (!stopSignalRef.current) {
      setStats(s => ({ ...s, status: 'No Path Found', commentary: 'Target node is completely blocked by walls.' }))
    }
    setRunning(false)
  }

  // 2. DFS
  const runDFS = async () => {
    setRunning(true)
    stopSignalRef.current = false
    skipSignalRef.current = false
    clearExecutionState()
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
    const stack   = [[startR, startC]]
    const dirs    = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false
    let visitedCount = 0

    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Running DFS...',
      commentary: 'DFS: Popping nodes from LIFO Stack to explore deeply.',
      frontierSize: stack.length,
      currentCell: [startR, startC],
    })

    while (stack.length) {
      if (stopSignalRef.current) {
        setRunning(false)
        setStats(s => ({ ...s, status: 'Simulation Stopped', commentary: 'Simulation stopped by user.' }))
        return
      }

      const [r, c] = stack.pop()

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        visitedCount++
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        setStats(s => ({
          ...s,
          visitedCount,
          frontierSize: stack.length,
          currentCell: [r, c],
          commentary: `DFS exploring branch cell [${r}, ${c}]. Stack size: ${stack.length}`,
        }))
        await stepDelay(18)
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (visited[nr][nc] || g[nr][nc] === CELL_WALL) continue
        if (g[nr][nc] === CELL_START) continue
        if (!parent[nr][nc]) {
          parent[nr][nc] = [r, c]
        }
        stack.push([nr, nc])
      }
    }

    if (found && !stopSignalRef.current) {
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      const pathSteps = path.length - 1
      for (const [r, c] of path) {
        if (stopSignalRef.current) { setRunning(false); return }
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await stepDelay(30)
        }
      }
      setStats(s => ({
        ...s,
        visitedCount,
        pathLength: pathSteps,
        frontierSize: 0,
        currentCell: null,
        status: 'Goal Found!',
        commentary: `DFS reached goal in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      }))
    } else if (!stopSignalRef.current) {
      setStats(s => ({ ...s, status: 'No Path Found', commentary: 'Target node is completely blocked by walls.' }))
    }
    setRunning(false)
  }

  // 3. UCS
  const runUCS = async () => {
    setRunning(true)
    stopSignalRef.current = false
    skipSignalRef.current = false
    clearExecutionState()
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    const gScore  = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity))
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

    const pq = new MinHeap()
    gScore[startR][startC] = 0
    pq.push({ id: `${startR},${startC}`, priority: 0, r: startR, c: startC, gCost: 0 })

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false
    let visitedCount = 0

    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Running UCS...',
      commentary: 'UCS: Priority Queue extracting node with minimum path cost g(n).',
      frontierSize: pq.size,
      currentCell: [startR, startC],
      gCost: 0,
    })

    while (!pq.isEmpty()) {
      if (stopSignalRef.current) {
        setRunning(false)
        setStats(s => ({ ...s, status: 'Simulation Stopped', commentary: 'Simulation stopped by user.' }))
        return
      }

      const top = pq.pop()
      const { r, c, gCost } = top

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        visitedCount++
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        setStats(s => ({
          ...s,
          visitedCount,
          frontierSize: pq.size,
          currentCell: [r, c],
          gCost,
          commentary: `UCS expanding cell [${r}, ${c}] with g(n) = ${gCost}. Priority Queue size: ${pq.size}`,
        }))
        await stepDelay(18)
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (g[nr][nc] === CELL_WALL || g[nr][nc] === CELL_START) continue

        const movementCost = 1
        const newCost = gCost + movementCost

        if (newCost < gScore[nr][nc]) {
          gScore[nr][nc] = newCost
          parent[nr][nc] = [r, c]
          pq.push({ id: `${nr},${nc}`, priority: newCost, r: nr, c: nc, gCost: newCost })
        }
      }
    }

    if (found && !stopSignalRef.current) {
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      const pathSteps = path.length - 1
      for (const [r, c] of path) {
        if (stopSignalRef.current) { setRunning(false); return }
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await stepDelay(30)
        }
      }
      setStats(s => ({
        ...s,
        visitedCount,
        pathLength: pathSteps,
        frontierSize: 0,
        currentCell: null,
        gCost: pathSteps,
        status: 'Goal Found!',
        commentary: `UCS found optimal path with cost g = ${pathSteps} after visiting ${visitedCount} cells.`,
      }))
    } else if (!stopSignalRef.current) {
      setStats(s => ({ ...s, status: 'No Path Found', commentary: 'Target node is completely blocked by walls.' }))
    }
    setRunning(false)
  }

  // 4. Greedy Best-First
  const runGreedy = async () => {
    setRunning(true)
    stopSignalRef.current = false
    skipSignalRef.current = false
    clearExecutionState()
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

    const pq = new MinHeap()
    const startH = getHeuristic(startR, startC, endR, endC)
    pq.push({ id: `${startR},${startC}`, priority: startH, r: startR, c: startC, hCost: startH })

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false
    let visitedCount = 0

    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Running Greedy Best-First...',
      commentary: `Greedy: Priority Queue extracting node with minimum ${heuristic.toUpperCase()} heuristic h(n).`,
      frontierSize: pq.size,
      currentCell: [startR, startC],
      hCost: startH,
    })

    while (!pq.isEmpty()) {
      if (stopSignalRef.current) {
        setRunning(false)
        setStats(s => ({ ...s, status: 'Simulation Stopped', commentary: 'Simulation stopped by user.' }))
        return
      }

      const top = pq.pop()
      const { r, c, hCost } = top

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        visitedCount++
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        const formattedH = Number(hCost).toFixed(2).replace(/\.00$/, '')
        setStats(s => ({
          ...s,
          visitedCount,
          frontierSize: pq.size,
          currentCell: [r, c],
          hCost,
          commentary: `Greedy expanding cell [${r}, ${c}] with h(n) = ${formattedH}. Priority Queue size: ${pq.size}`,
        }))
        await stepDelay(18)
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (visited[nr][nc] || g[nr][nc] === CELL_WALL || g[nr][nc] === CELL_START) continue

        if (!parent[nr][nc]) {
          parent[nr][nc] = [r, c]
        }
        const hVal = getHeuristic(nr, nc, endR, endC)
        pq.push({ id: `${nr},${nc}`, priority: hVal, r: nr, c: nc, hCost: hVal })
      }
    }

    if (found && !stopSignalRef.current) {
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      const pathSteps = path.length - 1
      for (const [r, c] of path) {
        if (stopSignalRef.current) { setRunning(false); return }
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await stepDelay(30)
        }
      }
      setStats(s => ({
        ...s,
        visitedCount,
        pathLength: pathSteps,
        frontierSize: 0,
        currentCell: null,
        hCost: 0,
        status: 'Goal Found!',
        commentary: `Greedy Search (${heuristic.toUpperCase()}) reached goal in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      }))
    } else if (!stopSignalRef.current) {
      setStats(s => ({ ...s, status: 'No Path Found', commentary: 'Target node is completely blocked by walls.' }))
    }
    setRunning(false)
  }

  // 5. A*
  const runAStar = async () => {
    setRunning(true)
    stopSignalRef.current = false
    skipSignalRef.current = false
    clearExecutionState()
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    const gScore  = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity))
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

    const pq = new MinHeap()
    const startH = getHeuristic(startR, startC, endR, endC)
    gScore[startR][startC] = 0

    pq.push({
      id: `${startR},${startC}`,
      priority: startH,
      r: startR,
      c: startC,
      gCost: 0,
      hCost: startH,
      fCost: startH,
    })

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false
    let visitedCount = 0

    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Running A* Search...',
      commentary: `A*: Priority Queue extracting node with min f(n) = g(n) + h(n) [${heuristic.toUpperCase()}].`,
      frontierSize: pq.size,
      currentCell: [startR, startC],
      gCost: 0,
      hCost: startH,
      fCost: startH,
    })

    while (!pq.isEmpty()) {
      if (stopSignalRef.current) {
        setRunning(false)
        setStats(s => ({ ...s, status: 'Simulation Stopped', commentary: 'Simulation stopped by user.' }))
        return
      }

      const top = pq.pop()
      const { r, c, gCost, hCost, fCost } = top

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        visitedCount++
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        const formattedF = Number(fCost).toFixed(2).replace(/\.00$/, '')
        const formattedH = Number(hCost).toFixed(2).replace(/\.00$/, '')
        setStats(s => ({
          ...s,
          visitedCount,
          frontierSize: pq.size,
          currentCell: [r, c],
          gCost,
          hCost,
          fCost,
          commentary: `A* expanding cell [${r}, ${c}] with f(n)=${formattedF} (g=${gCost}, h=${formattedH}). PQ size: ${pq.size}`,
        }))
        await stepDelay(18)
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (g[nr][nc] === CELL_WALL || g[nr][nc] === CELL_START) continue

        const movementCost = 1
        const newGCost = gCost + movementCost

        if (newGCost < gScore[nr][nc]) {
          gScore[nr][nc] = newGCost
          parent[nr][nc] = [r, c]
          const hVal = getHeuristic(nr, nc, endR, endC)
          const fVal = newGCost + hVal
          pq.push({
            id: `${nr},${nc}`,
            priority: fVal,
            r: nr,
            c: nc,
            gCost: newGCost,
            hCost: hVal,
            fCost: fVal,
          })
        }
      }
    }

    if (found && !stopSignalRef.current) {
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      const pathSteps = path.length - 1
      for (const [r, c] of path) {
        if (stopSignalRef.current) { setRunning(false); return }
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await stepDelay(30)
        }
      }
      setStats(s => ({
        ...s,
        visitedCount,
        pathLength: pathSteps,
        frontierSize: 0,
        currentCell: null,
        gCost: pathSteps,
        hCost: 0,
        fCost: pathSteps,
        status: 'Goal Found!',
        commentary: `A* (${heuristic.toUpperCase()}) found optimal path in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      }))
    } else if (!stopSignalRef.current) {
      setStats(s => ({ ...s, status: 'No Path Found', commentary: 'Target node is completely blocked by walls.' }))
    }
    setRunning(false)
  }

  // 6. Hill Climbing (Local Search)
  const runHillClimbing = async () => {
    setRunning(true)
    stopSignalRef.current = false
    skipSignalRef.current = false
    clearExecutionState()
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    let current = [startR, startC]
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    visited[startR][startC] = true
    const path = [current]
    const visitedOrder = []

    const startH = getHeuristic(startR, startC, endR, endC)

    setStats({
      ...createInitialStats('hillclimbing'),
      status: 'Running Hill Climbing...',
      commentary: `Hill Climbing starting at cell [${startR}, ${startC}] with h(n) = ${startH}.`,
      currentCell: current,
      hCost: startH,
      localOptimumStatus: 'Searching Improving Neighbor',
    })

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]

    while (true) {
      if (stopSignalRef.current) {
        setRunning(false)
        setStats(s => ({ ...s, status: 'Simulation Stopped', commentary: 'Simulation stopped by user.' }))
        return
      }

      const [cr, cc] = current
      const currentH = getHeuristic(cr, cc, endR, endC)

      if (cr === endR && cc === endC) {
        for (const [pr, pc] of path) {
          if (stopSignalRef.current) { setRunning(false); return }
          if (g[pr][pc] !== CELL_START && g[pr][pc] !== CELL_END) {
            setGrid(prev => {
              const ng = prev.map(row => [...row])
              ng[pr][pc] = CELL_PATH
              return ng
            })
            await stepDelay(30)
          }
        }
        setStats(s => ({
          ...s,
          visitedCount: visitedOrder.length,
          pathLength: path.length - 1,
          status: 'Goal Found!',
          localOptimumStatus: 'Goal Reached',
          heuristicImproved: true,
          commentary: `Hill Climbing successfully reached goal in ${path.length - 1} steps via local search trajectory.`,
        }))
        setRunning(false)
        return
      }

      let bestNeighbor = null
      let bestH = Infinity
      let candidateCount = 0

      for (const [dr, dc] of dirs) {
        const nr = cr + dr, nc = cc + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (g[nr][nc] === CELL_WALL || visited[nr][nc]) continue

        candidateCount++
        const hVal = getHeuristic(nr, nc, endR, endC)
        if (hVal < bestH) {
          bestH = hVal
          bestNeighbor = [nr, nc]
        }
      }

      const improved = bestNeighbor !== null && bestH < currentH
      const formattedCurH = Number(currentH).toFixed(2).replace(/\.00$/, '')
      const formattedBestH = Number(bestH).toFixed(2).replace(/\.00$/, '')

      if (improved) {
        current = bestNeighbor
        visited[bestNeighbor[0]][bestNeighbor[1]] = true
        visitedOrder.push(bestNeighbor)
        path.push(bestNeighbor)

        if (g[bestNeighbor[0]][bestNeighbor[1]] !== CELL_START && g[bestNeighbor[0]][bestNeighbor[1]] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[bestNeighbor[0]][bestNeighbor[1]] = CELL_VISITED
            return ng
          })
        }

        setStats(s => ({
          ...s,
          visitedCount: visitedOrder.length,
          pathLength: path.length - 1,
          currentCell: current,
          hCost: bestH,
          neighborCandidates: candidateCount,
          neighborH: formattedBestH,
          selectedNeighbor: bestNeighbor,
          heuristicImproved: true,
          localOptimumStatus: 'Moving to Better Neighbor',
          commentary: `Current cell [${cr}, ${cc}] has h=${formattedCurH}. Selected neighbor [${bestNeighbor[0]}, ${bestNeighbor[1]}] improves heuristic to h=${formattedBestH}.`,
        }))
        await stepDelay(150)
      } else {
        setStats(s => ({
          ...s,
          visitedCount: visitedOrder.length,
          pathLength: path.length - 1,
          currentCell: [cr, cc],
          hCost: currentH,
          neighborCandidates: candidateCount,
          neighborH: candidateCount > 0 ? formattedBestH : 'None',
          selectedNeighbor: null,
          heuristicImproved: false,
          status: 'Local Optimum Reached (Stuck)',
          localOptimumStatus: 'Local Optimum Reached',
          commentary: `Current cell [${cr}, ${cc}] has heuristic h=${formattedCurH}. Evaluated ${candidateCount} candidates, but none offer a strictly lower heuristic. Hill Climbing is stuck at a local optimum.`,
        }))
        setRunning(false)
        return
      }
    }
  }

  const handleRun = () => {
    if (algorithm === 'bfs') runBFS()
    else if (algorithm === 'dfs') runDFS()
    else if (algorithm === 'ucs') runUCS()
    else if (algorithm === 'greedy') runGreedy()
    else if (algorithm === 'astar') runAStar()
    else if (algorithm === 'hillclimbing') runHillClimbing()
    else if (algorithm === 'simulatedannealing') {
      setStats(s => ({
        ...s,
        status: 'Not Implemented Yet',
        commentary: `${ALGORITHM_INFO[algorithm].name} logic is not implemented yet. Select BFS, DFS, UCS, Greedy, A*, or Hill Climbing.`,
      }))
    }
  }

  const info = ALGORITHM_INFO[algorithm]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.pill}>
          <Grid3x3 size={13} /> Grid Visualizer
        </div>
        <h1 className={styles.title}>
          Pathfinding on a <span className="gradient-text">Grid</span>
        </h1>
        <p className={styles.sub}>
          Click cells to draw walls, place Start/Goal nodes, select an algorithm & heuristic, and run pathfinding.
        </p>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {[
          { cls: styles.start, label: 'Start' },
          { cls: styles.end, label: 'End' },
          { cls: styles.wall, label: 'Wall' },
          { cls: styles.visited, label: 'Visited' },
          { cls: styles.path, label: 'Path' },
        ].map(({ cls, label }) => (
          <span key={label} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Editing Tool Selector Row */}
      <div className={styles.toolsRow}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>
          Tool Mode:
        </span>
        <button
          className={`${styles.toolBtn} ${editTool === 'wall' ? styles.toolBtnActive : ''}`}
          onClick={() => setEditTool('wall')}
        >
          <Paintbrush size={14} /> Toggle Wall
        </button>
        <button
          className={`${styles.toolBtn} ${editTool === 'start' ? styles.toolBtnActive : ''}`}
          onClick={() => setEditTool('start')}
        >
          <MapPin size={14} style={{ color: '#10b981' }} /> Move Start
        </button>
        <button
          className={`${styles.toolBtn} ${editTool === 'goal' ? styles.toolBtnActive : ''}`}
          onClick={() => setEditTool('goal')}
        >
          <Flag size={14} style={{ color: '#f43f5e' }} /> Move Goal
        </button>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <select
          id="grid-algo-select"
          className={styles.select}
          value={algorithm}
          onChange={e => handleAlgorithmChange(e.target.value)}
        >
          <optgroup label="UNINFORMED SEARCH">
            <option value="bfs">Breadth-First Search (BFS)</option>
            <option value="dfs">Depth-First Search (DFS)</option>
            <option value="ucs">Uniform-Cost Search (UCS / Dijkstra)</option>
          </optgroup>
          <optgroup label="INFORMED SEARCH">
            <option value="greedy">Greedy Best-First Search</option>
            <option value="astar">A* Search</option>
          </optgroup>
          <optgroup label="LOCAL SEARCH / OPTIMIZATION">
            <option value="hillclimbing">Hill Climbing</option>
            <option value="simulatedannealing">Simulated Annealing</option>
          </optgroup>
        </select>

        {algorithm === 'astar' && (
          <select
            id="grid-heuristic-select"
            className={styles.select}
            value={heuristic}
            onChange={e => handleHeuristicChange(e.target.value)}
            title="Select heuristic distance calculation formula"
          >
            <option value="manhattan">Heuristic: Manhattan Distance</option>
            <option value="euclidean">Heuristic: Euclidean Distance</option>
          </select>
        )}

        <select
          id="grid-speed-select"
          className={styles.select}
          value={speed}
          onChange={e => setSpeed(e.target.value)}
          title="Select visualization animation speed"
        >
          <option value="very_slow">Speed: Very Slow (0.15x Educational)</option>
          <option value="slow">Speed: Slow (0.5x)</option>
          <option value="normal">Speed: Normal (1x)</option>
          <option value="fast">Speed: Fast (2.5x)</option>
          <option value="ultra">Speed: Ultra (10x)</option>
        </select>

        {!running ? (
          <>
            <button
              id="grid-run"
              className={`btn btn-primary`}
              onClick={handleRun}
            >
              <Play size={15} /> Run {algorithm.toUpperCase()}
            </button>
            <button
              id="grid-skip"
              className={`btn btn-secondary`}
              onClick={handleInstantResult}
              title="Calculate result instantly without animation delay"
            >
              <FastForward size={15} /> Instant Result
            </button>
          </>
        ) : (
          <>
            <button
              id="grid-stop"
              className={`btn btn-ghost`}
              style={{ border: '1px solid #f43f5e', color: '#f43f5e', background: 'rgba(244,63,94,0.1)' }}
              onClick={stopSimulation}
            >
              <Square size={15} /> Stop
            </button>
            <button
              id="grid-skip-running"
              className={`btn btn-secondary`}
              onClick={handleInstantResult}
              title="Fast-forward current simulation to instant result"
            >
              <FastForward size={15} /> Skip to Result
            </button>
          </>
        )}

        <button
          id="grid-reset"
          className={`btn btn-ghost`}
          onClick={reset}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {/* Grid Canvas */}
      <div
        className={styles.gridWrap}
        onMouseLeave={() => setDrawing(false)}
      >
        <div
          className={styles.grid}
          style={{ '--cols': COLS, '--rows': ROWS }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`${styles.cell} ${CELL_CLASS[cell]}`}
                onMouseDown={() => { setDrawing(true); interactCell(r, c) }}
                onMouseEnter={() => { if (drawing) interactCell(r, c) }}
                onMouseUp={() => setDrawing(false)}
              />
            ))
          )}
        </div>
      </div>

      {/* Live Metrics & Information Panel */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Algorithm</div>
          <div className={styles.metricValue} style={{ fontSize: '0.95rem', color: '#818cf8' }}>
            <Cpu size={14} style={{ marginRight: 6, display: 'inline' }} />
            {info?.name.split(' ')[0]}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Frontier Structure</div>
          <div className={styles.metricValue} style={{ fontSize: '0.9rem' }}>
            {info?.frontierType}
          </div>
        </div>

        {/* Algorithm Specific Metric Display */}
        {algorithm === 'bfs' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Queue</div>
              <div className={styles.metricValue} style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                {stats.frontierSize !== undefined ? `${stats.frontierSize} item${stats.frontierSize === 1 ? '' : 's'}` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Visited Count</div>
              <div className={styles.metricValue}>
                <Activity size={15} style={{ marginRight: 6, display: 'inline', color: '#6366f1' }} />
                {stats.visitedCount}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Path Length</div>
              <div className={styles.metricValue} style={{ color: '#10b981' }}>
                {stats.pathLength ? `${stats.pathLength} steps` : '—'}
              </div>
            </div>
          </>
        )}

        {algorithm === 'dfs' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Stack</div>
              <div className={styles.metricValue} style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                {stats.frontierSize !== undefined ? `${stats.frontierSize} item${stats.frontierSize === 1 ? '' : 's'}` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Visited Count</div>
              <div className={styles.metricValue}>
                <Activity size={15} style={{ marginRight: 6, display: 'inline', color: '#6366f1' }} />
                {stats.visitedCount}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Path Length</div>
              <div className={styles.metricValue} style={{ color: '#10b981' }}>
                {stats.pathLength ? `${stats.pathLength} steps` : '—'}
              </div>
            </div>
          </>
        )}

        {algorithm === 'ucs' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Priority Queue</div>
              <div className={styles.metricValue} style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                {stats.frontierSize !== undefined ? `Min-PQ (${stats.frontierSize})` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Current Cost g(n)</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {stats.gCost !== null && stats.gCost !== undefined ? stats.gCost : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Visited Count</div>
              <div className={styles.metricValue}>
                <Activity size={15} style={{ marginRight: 6, display: 'inline', color: '#6366f1' }} />
                {stats.visitedCount}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Path Cost</div>
              <div className={styles.metricValue} style={{ color: '#10b981' }}>
                {stats.pathLength ? `${stats.pathLength} steps` : '—'}
              </div>
            </div>
          </>
        )}

        {algorithm === 'greedy' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Priority Queue</div>
              <div className={styles.metricValue} style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                {stats.frontierSize !== undefined ? `Min-PQ (${stats.frontierSize})` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Heuristic h(n)</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {stats.hCost !== null && stats.hCost !== undefined ? Number(stats.hCost).toFixed(2).replace(/\.00$/, '') : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Visited Count</div>
              <div className={styles.metricValue}>
                <Activity size={15} style={{ marginRight: 6, display: 'inline', color: '#6366f1' }} />
                {stats.visitedCount}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Path Length</div>
              <div className={styles.metricValue} style={{ color: '#10b981' }}>
                {stats.pathLength ? `${stats.pathLength} steps` : '—'}
              </div>
            </div>
          </>
        )}

        {algorithm === 'astar' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Priority Queue</div>
              <div className={styles.metricValue} style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                {stats.frontierSize !== undefined ? `Min-PQ (${stats.frontierSize})` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Cost g(n)</div>
              <div className={styles.metricValue} style={{ color: '#38bdf8' }}>
                {stats.gCost !== null && stats.gCost !== undefined ? stats.gCost : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Heuristic h(n)</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {stats.hCost !== null && stats.hCost !== undefined ? Number(stats.hCost).toFixed(2).replace(/\.00$/, '') : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Total f(n)</div>
              <div className={styles.metricValue} style={{ color: '#a855f7' }}>
                {stats.fCost !== null && stats.fCost !== undefined ? Number(stats.fCost).toFixed(2).replace(/\.00$/, '') : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Visited Count</div>
              <div className={styles.metricValue}>
                <Activity size={15} style={{ marginRight: 6, display: 'inline', color: '#6366f1' }} />
                {stats.visitedCount}
              </div>
            </div>
          </>
        )}

        {algorithm === 'hillclimbing' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Current Cell</div>
              <div className={styles.metricValue} style={{ color: '#38bdf8' }}>
                {stats.currentCell ? `[${stats.currentCell[0]}, ${stats.currentCell[1]}]` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Neighbor Candidates</div>
              <div className={styles.metricValue}>
                {stats.neighborCandidates !== null && stats.neighborCandidates !== undefined ? stats.neighborCandidates : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Candidates h(n)</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {stats.neighborH !== null && stats.neighborH !== undefined ? stats.neighborH : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Selected Neighbor</div>
              <div className={styles.metricValue} style={{ color: '#818cf8' }}>
                {stats.selectedNeighbor ? `[${stats.selectedNeighbor[0]}, ${stats.selectedNeighbor[1]}]` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Move Improved Heuristic</div>
              <div className={styles.metricValue} style={{ color: stats.heuristicImproved ? '#10b981' : '#f43f5e' }}>
                {stats.heuristicImproved !== null && stats.heuristicImproved !== undefined ? (stats.heuristicImproved ? 'Yes' : 'No') : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Local Optimum Status</div>
              <div className={styles.metricValue} style={{ fontSize: '0.85rem' }}>
                {stats.localOptimumStatus || 'Not Started'}
              </div>
            </div>
          </>
        )}

        {algorithm === 'simulatedannealing' && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Current Cell</div>
              <div className={styles.metricValue} style={{ color: '#38bdf8' }}>
                {stats.currentCell ? `[${stats.currentCell[0]}, ${stats.currentCell[1]}]` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Candidate Cell</div>
              <div className={styles.metricValue} style={{ color: '#818cf8' }}>
                {stats.candidateCell ? `[${stats.candidateCell[0]}, ${stats.candidateCell[1]}]` : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Current h(n)</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {stats.hCost !== null && stats.hCost !== undefined ? stats.hCost : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Candidate h(n)</div>
              <div className={styles.metricValue} style={{ color: '#f59e0b' }}>
                {stats.candidateH !== null && stats.candidateH !== undefined ? stats.candidateH : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Delta (ΔE)</div>
              <div className={styles.metricValue} style={{ color: '#a855f7' }}>
                {stats.deltaH !== null && stats.deltaH !== undefined ? stats.deltaH : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Temperature (T)</div>
              <div className={styles.metricValue} style={{ color: '#f43f5e' }}>
                {stats.temperature !== null && stats.temperature !== undefined ? stats.temperature : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Acceptance Prob</div>
              <div className={styles.metricValue}>
                {stats.acceptanceProb !== null && stats.acceptanceProb !== undefined ? stats.acceptanceProb : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Random Value</div>
              <div className={styles.metricValue}>
                {stats.randomVal !== null && stats.randomVal !== undefined ? stats.randomVal : '—'}
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Decision Status</div>
              <div className={styles.metricValue} style={{ fontSize: '0.85rem' }}>
                {stats.annealingDecision || 'Not Started'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Live Natural Language Explanation Commentary */}
      <div className={styles.commentaryBox}>
        <strong>Live Commentary ({stats.status}):</strong> {stats.commentary}
      </div>
    </div>
  )
}
