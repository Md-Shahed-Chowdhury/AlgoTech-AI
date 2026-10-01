import { useState, useCallback } from 'react'
import { Grid3x3, Play, RotateCcw, Paintbrush } from 'lucide-react'
import { MinHeap } from '../features/graph/utils/MinHeap.js'
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

export default function GridPage() {
  const [grid, setGrid] = useState(makeGrid)
  const [drawing, setDrawing] = useState(false)
  const [running, setRunning] = useState(false)
  const [algorithm, setAlgorithm] = useState('bfs')

  const toggleCell = useCallback((r, c) => {
    setGrid(prev => {
      const g = prev.map(row => [...row])
      if (g[r][c] === CELL_EMPTY) g[r][c] = CELL_WALL
      else if (g[r][c] === CELL_WALL) g[r][c] = CELL_EMPTY
      return g
    })
  }, [])

  const reset = () => { setGrid(makeGrid()); setRunning(false) }

  // Simple BFS visualizer
  const runBFS = async () => {
    setRunning(true)
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END) { endR = r; endC = c }
      }

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
    const queue = [[startR, startC]]
    visited[startR][startC] = true
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false

    const delay = ms => new Promise(r => setTimeout(r, ms))

    while (queue.length) {
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
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[nr][nc] = CELL_VISITED
            return ng
          })
          await delay(18)
        }
      }
    }

    if (found) {
      // Trace back path
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      for (const [r, c] of path) {
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await delay(30)
        }
      }
    }
    setRunning(false)
  }

  // Stack-based Grid DFS visualizer
  const runDFS = async () => {
    setRunning(true)
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END) { endR = r; endC = c }
      }

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
    const stack = [[startR, startC]]
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false

    const delay = ms => new Promise(r => setTimeout(r, ms))

    while (stack.length) {
      const [r, c] = stack.pop()

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        await delay(18)
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

    if (found) {
      // Trace back path
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      for (const [r, c] of path) {
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await delay(30)
        }
      }
    }
    setRunning(false)
  }

  // Min-Heap Uniform-Cost Search (UCS / Dijkstra) visualizer
  const runUCS = async () => {
    setRunning(true)
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END) { endR = r; endC = c }
      }

    const gScore = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity))
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

    const pq = new MinHeap()
    gScore[startR][startC] = 0
    pq.push({ id: `${startR},${startC}`, priority: 0, r: startR, c: startC, gCost: 0 })

    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    let found = false

    const delay = ms => new Promise(r => setTimeout(r, ms))

    while (!pq.isEmpty()) {
      const top = pq.pop()
      const { r, c, gCost } = top

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        await delay(18)
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

    if (found) {
      // Trace back path
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      for (const [r, c] of path) {
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await delay(30)
        }
      }
    }
    setRunning(false)
  }

  // Min-Heap Greedy Best-First Search visualizer (Priority key = h(n))
  const runGreedy = async () => {
    setRunning(true)
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    // Manhattan Distance Heuristic: h(r, c) = |r - endR| + |c - endC|
    const getHeuristic = (r, c) => Math.abs(r - endR) + Math.abs(c - endC)

    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

    const pq = new MinHeap()
    const startH = getHeuristic(startR, startC)
    pq.push({ id: `${startR},${startC}`, priority: startH, r: startR, c: startC, hCost: startH })

    const dirs = [[0,1],[1,0],[0,-1],[-1,0]]
    let found = false

    const delay = ms => new Promise(r => setTimeout(r, ms))

    while (!pq.isEmpty()) {
      const top = pq.pop()
      const { r, c } = top

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        await delay(18)
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (visited[nr][nc] || g[nr][nc] === CELL_WALL || g[nr][nc] === CELL_START) continue

        if (!parent[nr][nc]) {
          parent[nr][nc] = [r, c]
        }
        const hVal = getHeuristic(nr, nc)
        pq.push({ id: `${nr},${nc}`, priority: hVal, r: nr, c: nc, hCost: hVal })
      }
    }

    if (found) {
      // Trace back path
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      for (const [r, c] of path) {
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await delay(30)
        }
      }
    }
    setRunning(false)
  }

  // Min-Heap A* Search visualizer (Priority key f(n) = g(n) + h(n))
  const runAStar = async () => {
    setRunning(true)
    const g = grid.map(row => [...row])

    let startR, startC, endR, endC
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === CELL_START) { startR = r; startC = c }
        if (g[r][c] === CELL_END)   { endR   = r; endC   = c }
      }

    // Manhattan Distance Heuristic
    const getHeuristic = (r, c) => Math.abs(r - endR) + Math.abs(c - endC)

    const gScore  = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity))
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false))
    const parent  = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))

    const pq = new MinHeap()
    const startH = getHeuristic(startR, startC)
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

    const dirs = [[0,1],[1,0],[0,-1],[-1,0]]
    let found = false

    const delay = ms => new Promise(r => setTimeout(r, ms))

    while (!pq.isEmpty()) {
      const top = pq.pop()
      const { r, c, gCost } = top

      if (visited[r][c]) continue
      visited[r][c] = true

      if (r === endR && c === endC) { found = true; break }

      if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
        setGrid(prev => {
          const ng = prev.map(row => [...row])
          ng[r][c] = CELL_VISITED
          return ng
        })
        await delay(18)
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
          const hVal = getHeuristic(nr, nc)
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

    if (found) {
      // Trace back path
      let cur = [endR, endC]
      const path = []
      while (cur) { path.push(cur); cur = parent[cur[0]][cur[1]] }
      path.reverse()
      for (const [r, c] of path) {
        if (g[r][c] !== CELL_START && g[r][c] !== CELL_END) {
          setGrid(prev => {
            const ng = prev.map(row => [...row])
            ng[r][c] = CELL_PATH
            return ng
          })
          await delay(30)
        }
      }
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
          Click cells to draw walls, select an algorithm, then hit <strong>Run Algorithm</strong> to watch it search.
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

      {/* Controls */}
      <div className={styles.controls}>
        <select
          id="grid-algo-select"
          className={styles.select}
          value={algorithm}
          onChange={e => setAlgorithm(e.target.value)}
          disabled={running}
        >
          <option value="bfs">Breadth-First Search (BFS)</option>
          <option value="dfs">Depth-First Search (DFS)</option>
          <option value="ucs">Uniform-Cost Search (UCS / Dijkstra)</option>
          <option value="greedy">Greedy Best-First Search</option>
          <option value="astar">A* Search</option>
        </select>
        <button
          id="grid-run"
          className={`btn btn-primary`}
          onClick={handleRun}
          disabled={running}
        >
          <Play size={15} /> {running ? 'Running…' : `Run ${algorithm.toUpperCase()}`}
        </button>
        <button
          id="grid-reset"
          className={`btn btn-ghost`}
          onClick={reset}
          disabled={running}
        >
          <RotateCcw size={15} /> Reset
        </button>
        <span className={styles.hint}>
          <Paintbrush size={13} /> Click cells to toggle walls
        </span>
      </div>

      {/* Grid */}
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
                onMouseDown={() => { if (!running) { setDrawing(true); toggleCell(r, c) } }}
                onMouseEnter={() => { if (drawing && !running) toggleCell(r, c) }}
                onMouseUp={() => setDrawing(false)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
