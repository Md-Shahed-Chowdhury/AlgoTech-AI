/**
 * graphTypes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared constants for the Graph Search feature.
 * UI components and the algorithm engine both import from here — nothing else
 * should own these definitions.
 */

// ── Node visual states (drives SVG fill / glow in GraphCanvas) ───────────────
export const NODE_STATE = {
  UNEXPLORED: 'unexplored',
  FRONTIER:   'frontier',   // in the open set / queue / priority queue
  CURRENT:    'current',    // the node being expanded right now
  VISITED:    'visited',    // already expanded / closed
  SELECTED:   'selected',   // user-selected (hover / click) for inspection
  PATH:       'path',       // on the final found path
  START:      'start',
  GOAL:       'goal',
}

// ── Edge visual states ────────────────────────────────────────────────────────
export const EDGE_STATE = {
  DEFAULT:    'default',
  TRAVERSED:  'traversed',  // already used in expansion
  ACTIVE:     'active',     // being evaluated right now
  PATH:       'path',       // on the final found path
}

// ── Supported algorithm identifiers ──────────────────────────────────────────
export const ALGORITHM = {
  BFS:                 'bfs',
  DFS:                 'dfs',
  UCS:                 'ucs',
  GREEDY:              'greedy',
  ASTAR:               'astar',
  HILL_CLIMBING:       'hillclimbing',
  SIMULATED_ANNEALING: 'simulatedannealing',
}

// ── Application modes ─────────────────────────────────────────────────────────
export const APP_MODE = {
  LEARN: 'learn',
  EXAM:  'exam',
}

// ── Graph builder interaction modes ──────────────────────────────────────────
export const BUILDER_MODE = {
  SELECT:      'select',   // click to select node / edge
  ADD_NODE:    'add_node',
  ADD_EDGE:    'add_edge',
  DELETE:      'delete',
  SET_START:   'set_start',
  SET_GOAL:    'set_goal',
  MOVE_NODE:   'move_node',
}

// ── Playback states for the step-replayer ────────────────────────────────────
export const PLAYBACK = {
  IDLE:    'idle',
  PLAYING: 'playing',
  PAUSED:  'paused',
  DONE:    'done',
}

// ── Micro-step action types ───────────────────────────────────────────────────
// Each simulation step now represents exactly ONE educational action.
export const ACTION_TYPE = {
  INITIALIZE:               'INITIALIZE',
  INITIALIZE_GOAL:          'INITIALIZE_GOAL',   // start === goal
  VISIT_NODE:               'VISIT_NODE',         // Phase A: node popped / selected from frontier
  EXPLORE_NEIGHBORS:        'EXPLORE_NEIGHBORS',  // Phase B: evaluate all neighbors of current node
  SELECT_NODE:              'SELECT_NODE',        // legacy alias
  EVALUATE_NEIGHBOR:        'EVALUATE_NEIGHBOR',
  DISCOVER_NODE:            'DISCOVER_NODE',
  SKIP_ALREADY_DISCOVERED:  'SKIP_ALREADY_DISCOVERED',
  UPDATE_FRONTIER:          'UPDATE_FRONTIER',
  SKIP_HIGHER_COST:         'SKIP_HIGHER_COST',
  GOAL_REACHED:             'GOAL_REACHED',
  NO_PATH:                  'NO_PATH',
  SKIP_VISITED:             'SKIP_VISITED',
}

// ── Neighbor evaluation decision tags ────────────────────────────────────────
export const NEIGHBOR_DECISION = {
  DISCOVERED:           'discovered',
  ALREADY_DISCOVERED:   'already_discovered',
  ALREADY_VISITED:      'already_visited',
  UPDATE_COST:          'update_cost',
  SKIP_HIGHER_COST:     'skip_higher_cost',
  GOAL:                 'goal',
}

// ── Algorithm metadata (used by LearnPage cards + ExamPage selectors) ────────
export const ALGORITHM_META = {
  [ALGORITHM.BFS]: {
    id:          ALGORITHM.BFS,
    name:        'Breadth-First Search',
    shortName:   'BFS',
    tag:         'Graph Search',
    color:       '#6366f1',
    complexity:  { time: 'O(V+E)', space: 'O(V)' },
    weighted:    false,  // BFS ignores weights
    heuristic:   false,
    description: 'Explores all neighbors level-by-level. Guarantees shortest path in unweighted graphs.',
  },
  [ALGORITHM.DFS]: {
    id:          ALGORITHM.DFS,
    name:        'Depth-First Search',
    shortName:   'DFS',
    tag:         'Graph Search',
    color:       '#8b5cf6',
    complexity:  { time: 'O(V+E)', space: 'O(V)' },
    weighted:    false,
    heuristic:   false,
    description: 'Dives as deep as possible before backtracking. Does not guarantee shortest path.',
  },
  [ALGORITHM.UCS]: {
    id:          ALGORITHM.UCS,
    name:        'Uniform Cost Search',
    shortName:   'UCS',
    tag:         'Graph Search',
    color:       '#10b981',
    complexity:  { time: 'O(V log V + E)', space: 'O(V)' },
    weighted:    true,
    heuristic:   false,
    description: 'Expands the lowest cumulative-cost node first. Optimal for weighted graphs.',
  },
  [ALGORITHM.GREEDY]: {
    id:          ALGORITHM.GREEDY,
    name:        'Greedy Best-First Search',
    shortName:   'Greedy',
    tag:         'Graph Search',
    color:       '#f59e0b',
    complexity:  { time: 'O(V log V + E)', space: 'O(V)' },
    weighted:    false,
    heuristic:   true,
    description: 'Always expands the node closest to the goal by heuristic. Fast but not optimal.',
  },
  [ALGORITHM.ASTAR]: {
    id:          ALGORITHM.ASTAR,
    name:        'A* Search',
    shortName:   'A*',
    tag:         'Graph Search',
    color:       '#f43f5e',
    complexity:  { time: 'O(V log V + E)', space: 'O(V)' },
    weighted:    true,
    heuristic:   true,
    description: 'Combines cost-so-far (g) and heuristic (h). Optimal and complete with admissible heuristic.',
  },
  [ALGORITHM.HILL_CLIMBING]: {
    id:                ALGORITHM.HILL_CLIMBING,
    name:              'Hill Climbing',
    shortName:         'Hill Climbing',
    tag:               'Local Search / Optimization',
    color:             '#38bdf8',
    complexity:        { time: 'O(V)', space: 'O(1)' },
    weighted:          false,
    heuristic:         true,
    searchType:        'Local Search',
    requiresHeuristic: true,
    description:       'Iteratively moves to neighboring node with lower heuristic value h(n). Can get stuck at local optima.',
  },
  [ALGORITHM.SIMULATED_ANNEALING]: {
    id:                ALGORITHM.SIMULATED_ANNEALING,
    name:              'Simulated Annealing',
    shortName:         'Simulated Annealing',
    tag:               'Local Search / Optimization',
    color:             '#a855f7',
    complexity:        { time: 'O(K)', space: 'O(1)' },
    weighted:          false,
    heuristic:         true,
    searchType:        'Local Search / Optimization',
    requiresHeuristic: true,
    stochastic:        true,
    description:       'Stochastic search accepting worse moves with probability decaying over Temperature T.',
  },
}
