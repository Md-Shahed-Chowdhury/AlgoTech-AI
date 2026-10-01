import { useState, useCallback, useRef } from 'react'
import { Grid3x3, Play, RotateCcw, Paintbrush, Flag, MapPin, Activity, Cpu, Square, FastForward } from 'lucide-react'
import { MinHeap } from '../features/graph/utils/MinHeap.js'
import {
  runGridBFS,
  runGridDFS,
  runGridUCS,
  runGridGreedy,
  runGridAStar,
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

  const [stats, setStats] = useState({
    visitedCount: 0,
    pathLength: 0,
    status: 'Ready',
    commentary: 'Select an algorithm, edit walls or start/goal nodes, and click Run Algorithm to begin search.',
  })

  // Clear visual animation overlay (CELL_VISITED & CELL_PATH)
  const clearExecutionState = useCallback(() => {
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell))
      )
    )
    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Ready',
      commentary: `${ALGORITHM_INFO[algorithm].name}: ${ALGORITHM_INFO[algorithm].desc}`,
    })
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
      visitedCount: 0,
      pathLength: 0,
      status: 'Reset Complete',
      commentary: 'Grid reset to default layout.',
    })
  }

  const handleAlgorithmChange = (newAlgo) => {
    if (running) stopSimulation()
    setAlgorithm(newAlgo)
    setGrid(prev =>
      prev.map(row =>
        row.map(cell => (cell === CELL_VISITED || cell === CELL_PATH ? CELL_EMPTY : cell))
      )
    )
    setStats({
      visitedCount: 0,
      pathLength: 0,
      status: 'Ready',
      commentary: `${ALGORITHM_INFO[newAlgo].name}: ${ALGORITHM_INFO[newAlgo].desc}`,
    })
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
    }
    const engine = engineMap[algorithm] || runGridBFS
    const res = engine(cleanGrid, null, null, heuristic)

    setGrid(() => {
      const ng = cleanGrid.map(row => [...row])
      if (res.found) {
        for (const [r, c] of res.visitedOrder) {
          if (ng[r][c] !== CELL_START && ng[r][c] !== CELL_END) ng[r][c] = CELL_VISITED
        }
        for (const [r, c] of res.path) {
          if (ng[r][c] !== CELL_START && ng[r][c] !== CELL_END) ng[r][c] = CELL_PATH
        }
      } else {
        for (const [r, c] of res.visitedOrder) {
          if (ng[r][c] !== CELL_START && ng[r][c] !== CELL_END) ng[r][c] = CELL_VISITED
        }
      }
      return ng
    })

    // Exact count of visited intermediate cells excluding Start & Goal nodes
    const visitedNum = res.visitedOrder.filter(
      ([r, c]) => cleanGrid[r][c] !== CELL_START && cleanGrid[r][c] !== CELL_END
    ).length
    const pathSteps = res.path.length > 0 ? res.path.length - 1 : 0

    setStats({
      visitedCount: visitedNum,
      pathLength: pathSteps,
      status: res.found ? 'Goal Found (Instant)' : 'No Path Found',
      commentary: res.found
        ? `${ALGORITHM_INFO[algorithm].name} (${algorithm === 'astar' || algorithm === 'greedy' ? heuristic.toUpperCase() : 'Standard'}) completed instantly. Path length: ${pathSteps} steps. Visited cells: ${visitedNum}.`
        : 'Target is unreachable.',
    })
  }

  // Helper delay function respecting skip and stop signals
  const stepDelay = (ms) => {
    if (skipSignalRef.current) return Promise.resolve()
    return new Promise(r => setTimeout(r, ms))
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
      setStats({
        visitedCount,
        pathLength: pathSteps,
        status: 'Goal Found!',
        commentary: `BFS found optimal unweighted path in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      })
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
      setStats({
        visitedCount,
        pathLength: pathSteps,
        status: 'Goal Found!',
        commentary: `DFS reached goal in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      })
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
      setStats({
        visitedCount,
        pathLength: pathSteps,
        status: 'Goal Found!',
        commentary: `UCS found optimal path with cost g = ${pathSteps} after visiting ${visitedCount} cells.`,
      })
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
      setStats({
        visitedCount,
        pathLength: pathSteps,
        status: 'Goal Found!',
        commentary: `Greedy Search (${heuristic.toUpperCase()}) reached goal in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      })
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
      setStats({
        visitedCount,
        pathLength: pathSteps,
        status: 'Goal Found!',
        commentary: `A* (${heuristic.toUpperCase()}) found optimal path in ${pathSteps} steps after visiting ${visitedCount} cells.`,
      })
    } else if (!stopSignalRef.current) {
      setStats(s => ({ ...s, status: 'No Path Found', commentary: 'Target node is completely blocked by walls.' }))
    }
    setRunning(false)
  }

  const handleRun = () => {
    if (algorithm === 'bfs') runBFS()
    else if (algorithm === 'dfs') runDFS()
    else if (algorithm === 'ucs') runUCS()
    else if (algorithm === 'greedy') runGreedy()
    else if (algorithm === 'astar') runAStar()
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
          <option value="bfs">Breadth-First Search (BFS)</option>
          <option value="dfs">Depth-First Search (DFS)</option>
          <option value="ucs">Uniform-Cost Search (UCS / Dijkstra)</option>
          <option value="greedy">Greedy Best-First Search</option>
          <option value="astar">A* Search</option>
        </select>

        {(algorithm === 'astar' || algorithm === 'greedy') && (
          <select
            id="grid-heuristic-select"
            className={styles.select}
            value={heuristic}
            onChange={e => handleHeuristicChange(e.target.value)}
            title="Select heuristic distance calculation formula"
          >
            <option value="manhattan">Heuristic: Manhattan</option>
            <option value="euclidean">Heuristic: Euclidean</option>
          </select>
        )}

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
          <div className={styles.metricValue} style={{ fontSize: '1rem', color: '#818cf8' }}>
            <Cpu size={14} style={{ marginRight: 6, display: 'inline' }} />
            {info.name.split(' ')[0]}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Frontier Structure</div>
          <div className={styles.metricValue} style={{ fontSize: '0.9rem' }}>
            {info.frontierType}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Evaluation Metric</div>
          <div className={styles.metricValue} style={{ fontSize: '0.9rem', color: '#f59e0b' }}>
            {algorithm === 'astar' || algorithm === 'greedy'
              ? `${info.formula} [${heuristic.toUpperCase()}]`
              : info.formula}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Nodes Visited</div>
          <div className={styles.metricValue}>
            <Activity size={15} style={{ marginRight: 6, display: 'inline', color: '#6366f1' }} />
            {stats.visitedCount}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Path Length / Cost</div>
          <div className={styles.metricValue} style={{ color: '#10b981' }}>
            {stats.pathLength ? `${stats.pathLength} steps` : '—'}
          </div>
        </div>
      </div>

      {/* Live Natural Language Explanation Commentary */}
      <div className={styles.commentaryBox}>
        <strong>Live Commentary ({stats.status}):</strong> {stats.commentary}
      </div>
    </div>
  )
}
