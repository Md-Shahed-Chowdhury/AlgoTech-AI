import { MinHeap } from '../../graph/utils/MinHeap.js'

export const CELL_EMPTY = 0
export const CELL_WALL = 1
export const CELL_START = 2
export const CELL_END = 3

export const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]] // Right, Down, Left, Up

export function getGridCoordinates(grid) {
  let start = null, end = null
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === CELL_START) start = [r, c]
      if (grid[r][c] === CELL_END) end = [r, c]
    }
  }
  return { start, end }
}

export function getManhattanDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

export function getEuclideanDistance(r1, c1, r2, c2) {
  return Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2)
}

export function getHeuristicDistance(r1, c1, r2, c2, heuristic = 'manhattan') {
  if (heuristic === 'euclidean') {
    return getEuclideanDistance(r1, c1, r2, c2)
  }
  return getManhattanDistance(r1, c1, r2, c2)
}

export function reconstructPath(parent, endR, endC) {
  let cur = [endR, endC]
  const path = []
  while (cur) {
    path.push(cur)
    cur = parent[cur[0]][cur[1]]
  }
  path.reverse()
  return path
}

// 1. Grid BFS
export function runGridBFS(grid, startCoords, endCoords) {
  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const parent = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const queue = [[startR, startC]]
  const visitedOrder = []
  visited[startR][startC] = true
  let found = false

  while (queue.length) {
    const [r, c] = queue.shift()
    visitedOrder.push([r, c])
    if (r === endR && c === endC) { found = true; break }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (visited[nr][nc] || grid[nr][nc] === CELL_WALL) continue
      if (grid[nr][nc] === CELL_START) continue
      visited[nr][nc] = true
      parent[nr][nc] = [r, c]
      queue.push([nr, nc])
    }
  }

  const path = found ? reconstructPath(parent, endR, endC) : []
  return { found, path, visitedOrder, parent, visited }
}

// 2. Grid DFS
export function runGridDFS(grid, startCoords, endCoords) {
  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const parent = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const stack = [[startR, startC]]
  const visitedOrder = []
  let found = false

  while (stack.length) {
    const [r, c] = stack.pop()
    if (visited[r][c]) continue
    visited[r][c] = true
    visitedOrder.push([r, c])

    if (r === endR && c === endC) { found = true; break }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (visited[nr][nc] || grid[nr][nc] === CELL_WALL) continue
      if (grid[nr][nc] === CELL_START) continue
      if (!parent[nr][nc]) {
        parent[nr][nc] = [r, c]
      }
      stack.push([nr, nc])
    }
  }

  const path = found ? reconstructPath(parent, endR, endC) : []
  return { found, path, visitedOrder, parent, visited }
}

// 3. Grid UCS
export function runGridUCS(grid, startCoords, endCoords) {
  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const gScore = Array.from({ length: rows }, () => new Array(cols).fill(Infinity))
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const parent = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const visitedOrder = []

  const pq = new MinHeap()
  gScore[startR][startC] = 0
  pq.push({ id: `${startR},${startC}`, priority: 0, r: startR, c: startC, gCost: 0 })

  let found = false

  while (!pq.isEmpty()) {
    const top = pq.pop()
    const { r, c, gCost } = top

    if (visited[r][c]) continue
    visited[r][c] = true
    visitedOrder.push([r, c])

    if (r === endR && c === endC) { found = true; break }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === CELL_WALL || grid[nr][nc] === CELL_START) continue

      const newCost = gCost + 1
      if (newCost < gScore[nr][nc]) {
        gScore[nr][nc] = newCost
        parent[nr][nc] = [r, c]
        pq.push({ id: `${nr},${nc}`, priority: newCost, r: nr, c: nc, gCost: newCost })
      }
    }
  }

  const path = found ? reconstructPath(parent, endR, endC) : []
  return { found, path, visitedOrder, parent, visited, gScore }
}

// 4. Grid Greedy
export function runGridGreedy(grid, startCoords, endCoords, heuristic = 'manhattan') {
  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const parent = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const visitedOrder = []

  const pq = new MinHeap()
  const startH = getHeuristicDistance(startR, startC, endR, endC, heuristic)
  pq.push({ id: `${startR},${startC}`, priority: startH, r: startR, c: startC, hCost: startH })

  let found = false

  while (!pq.isEmpty()) {
    const top = pq.pop()
    const { r, c } = top

    if (visited[r][c]) continue
    visited[r][c] = true
    visitedOrder.push([r, c])

    if (r === endR && c === endC) { found = true; break }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (visited[nr][nc] || grid[nr][nc] === CELL_WALL || grid[nr][nc] === CELL_START) continue

      if (!parent[nr][nc]) {
        parent[nr][nc] = [r, c]
      }
      const hVal = getHeuristicDistance(nr, nc, endR, endC, heuristic)
      pq.push({ id: `${nr},${nc}`, priority: hVal, r: nr, c: nc, hCost: hVal })
    }
  }

  const path = found ? reconstructPath(parent, endR, endC) : []
  return { found, path, visitedOrder, parent, visited }
}

// 5. Grid A*
export function runGridAStar(grid, startCoords, endCoords, heuristic = 'manhattan') {
  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const gScore = Array.from({ length: rows }, () => new Array(cols).fill(Infinity))
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  const parent = Array.from({ length: rows }, () => new Array(cols).fill(null))
  const visitedOrder = []

  const pq = new MinHeap()
  const startH = getHeuristicDistance(startR, startC, endR, endC, heuristic)
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

  let found = false

  while (!pq.isEmpty()) {
    const top = pq.pop()
    const { r, c, gCost } = top

    if (visited[r][c]) continue
    visited[r][c] = true
    visitedOrder.push([r, c])

    if (r === endR && c === endC) { found = true; break }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === CELL_WALL || grid[nr][nc] === CELL_START) continue

      const newGCost = gCost + 1
      if (newGCost < gScore[nr][nc]) {
        gScore[nr][nc] = newGCost
        parent[nr][nc] = [r, c]
        const hVal = getHeuristicDistance(nr, nc, endR, endC, heuristic)
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

  const path = found ? reconstructPath(parent, endR, endC) : []
  return { found, path, visitedOrder, parent, visited, gScore }
}

// 6. Grid Hill Climbing (Local Search)
export function runGridHillClimbing(grid, startCoords, endCoords, heuristic = 'manhattan') {
  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const visitedOrder = []
  const path = []
  const steps = []

  let current = [startR, startC]
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
  visited[startR][startC] = true
  path.push(current)

  let found = false
  let stuck = false
  let stepCount = 0

  while (true) {
    const [cr, cc] = current
    const currentH = getHeuristicDistance(cr, cc, endR, endC, heuristic)

    if (cr === endR && cc === endC) {
      found = true
      break
    }

    const candidateNeighbors = []
    let bestNeighbor = null
    let bestH = Infinity

    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === CELL_WALL || visited[nr][nc]) continue

      const hVal = getHeuristicDistance(nr, nc, endR, endC, heuristic)
      candidateNeighbors.push({ cell: [nr, nc], h: hVal })

      if (hVal < bestH) {
        bestH = hVal
        bestNeighbor = [nr, nc]
      }
    }

    // Strict local improvement criterion: best neighbor h(n) must be strictly less than current cell h(n)
    const improved = bestNeighbor !== null && bestH < currentH

    steps.push({
      step: stepCount++,
      currentCell: [cr, cc],
      currentH,
      candidateNeighbors,
      selectedNeighbor: improved ? bestNeighbor : null,
      selectedH: improved ? bestH : null,
      improved,
      visitedCount: visitedOrder.length,
      path: [...path],
    })

    if (improved) {
      current = bestNeighbor
      visited[bestNeighbor[0]][bestNeighbor[1]] = true
      visitedOrder.push(bestNeighbor)
      path.push(bestNeighbor)
    } else {
      stuck = true
      break
    }
  }

  return {
    found,
    stuck,
    path,
    visitedOrder,
    steps,
  }
}

// 7. Grid Simulated Annealing (Local Search / Optimization)
export function runGridSimulatedAnnealing(
  grid,
  startCoords,
  endCoords,
  heuristic = 'manhattan',
  config = {}
) {
  const {
    initialTemp = 100,
    coolingRate = 0.95,
    minTemp = 0.1,
    maxIterations = 200,
    rng = Math.random,
  } = config

  const rows = grid.length
  const cols = grid[0].length
  const coords = getGridCoordinates(grid)
  const [startR, startC] = startCoords || coords.start
  const [endR, endC] = endCoords || coords.end

  const visitedOrder = []
  const path = []
  const steps = []

  let current = [startR, startC]
  path.push(current)

  let temp = initialTemp
  let found = false
  let stuck = false
  let iteration = 0

  while (iteration < maxIterations && temp > minTemp) {
    const [cr, cc] = current
    const currentH = getHeuristicDistance(cr, cc, endR, endC, heuristic)

    if (cr === endR && cc === endC) {
      found = true
      break
    }

    // Identify valid neighboring cells (in bounds, not wall)
    const validNeighbors = []
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === CELL_WALL) continue
      validNeighbors.push([nr, nc])
    }

    if (validNeighbors.length === 0) {
      stuck = true
      break
    }

    // Select candidate neighbor using rng
    const randVal = rng()
    const candIndex = Math.floor(randVal * validNeighbors.length)
    const candidate = validNeighbors[candIndex]
    const candH = getHeuristicDistance(candidate[0], candidate[1], endR, endC, heuristic)

    // Calculate delta = h(candidate) - h(current)
    const delta = candH - currentH

    let accepted = false
    let prob = 1.0
    let randomVal = null
    let reason = ''

    if (delta <= 0) {
      accepted = true
      prob = 1.0
      reason = `Better or equal candidate move (ΔE = ${delta} <= 0). Accepted automatically.`
    } else {
      prob = Math.exp(-delta / temp)
      randomVal = rng()
      if (randomVal < prob) {
        accepted = true
        reason = `Worse candidate move (ΔE = +${delta}), accepted probabilistically (r = ${randomVal.toFixed(2)} < P = ${prob.toFixed(2)} at T = ${temp.toFixed(2)}).`
      } else {
        accepted = false
        reason = `Worse candidate move (ΔE = +${delta}), rejected (r = ${randomVal.toFixed(2)} >= P = ${prob.toFixed(2)} at T = ${temp.toFixed(2)}).`
      }
    }

    steps.push({
      iteration: iteration++,
      current: [cr, cc],
      currentCell: [cr, cc],
      currentH,
      candidate,
      candidateCell: candidate,
      candidateH: candH,
      delta,
      temperature: temp,
      acceptanceProb: prob,
      randomVal,
      accepted,
      reason,
      visitedOrder: [...visitedOrder],
      visitedCount: visitedOrder.length,
      trajectory: [...path],
      path: [...path],
      goalReached: found,
    })

    if (accepted) {
      current = candidate
      visitedOrder.push(candidate)
      path.push(candidate)
    }

    // Cooling: T_next = alpha * T
    temp = Math.max(0, temp * coolingRate)
  }

  if (!found && (temp <= minTemp || iteration >= maxIterations)) {
    stuck = true
  }

  let terminationReason = ''
  if (found) {
    terminationReason = 'Goal Reached'
  } else if (temp <= minTemp) {
    terminationReason = 'Temperature Below Minimum'
  } else if (iteration >= maxIterations) {
    terminationReason = 'Maximum Iterations Reached'
  } else if (stuck) {
    terminationReason = 'No Valid Neighboring Cells'
  }

  return {
    found,
    stuck,
    path,
    visitedOrder,
    steps,
    finalTemp: temp,
    terminationReason,
  }
}
