# AlgoTeach

**Team name: Team Infyra**

An interactive educational platform designed to teach, visualize, evaluate, and compare graph search algorithms and optimization heuristics, alongside 2D grid matrix pathfinding simulations.

---

## Table of Contents
- [Problem Description](#problem-description)
- [Methodology](#methodology)
- [Implementation Details](#implementation-details)
- [Results and Analysis](#results-and-analysis)
- [Team Information](#team-information)
- [Getting Started](#getting-started)

---

## Problem Description

Understanding computer science graph search algorithms (Breadth-First Search, Depth-First Search, Uniform Cost Search, Greedy Best-First Search, A* Search) and local search optimization heuristics (Hill Climbing, Simulated Annealing) is a core requirement in computer science and artificial intelligence education. However, traditional learning methods suffer from several critical shortcomings:

1. **Static Pseudo-code & Abstract Diagrams:** Standard textbooks fail to convey dynamic queue/stack/priority-queue state changes, active step transitions, and step-by-step node expansions.
2. **Opaque Heuristic Mechanics:** Students struggle to intuitively grasp heuristic estimations ($h(n)$ vs true cost $h^*(n)$), admissibility violations ($h(n) > h^*(n)$), and how heuristic functions dictate traversal order.
3. **Local Maxima & Stochastic Traps:** Concepts like Hill Climbing getting trapped in local maxima or Simulated Annealing accepting sub-optimal moves probabilistically are difficult to internalize without multi-trial empirical comparisons.
4. **Lack of Integrated Learning & Testing:** Learners lack a unified application that seamlessly combines *interactive step-by-step visual search*, *AI voice explanations*, *side-by-side multi-algorithm race comparisons*, *interactive exam testing*, and *2D spatial grid maze navigation*.

---

## Methodology

**AlgoTeach** addresses these educational challenges through a modular, domain-driven architecture:

### 1. Feature-Driven Domain Architecture
The application codebase is partitioned into distinct domain modules under `src/features`:
- `src/features/graph`: Powers single-algorithm search visualization, Learn Mode, Exam Mode, Web Speech API voice explanations, and interactive graph editing.
- `src/features/compare`: Powers multi-algorithm execution, running side-by-side (Split View) or overlaid (Overlay View) algorithm races.
- `src/features/grid`: Powers 2D spatial grid pathfinding and maze navigation.

### 2. Multi-Granularity Algorithm Engine Architecture
All algorithms (BFS, DFS, UCS, Greedy, A*, Hill Climbing, Simulated Annealing) are built as pure generator functions. Each algorithm provides 3 execution granularities:
- **Standard Engine:** Generates high-level step-by-step node visits and frontier expansions.
- **Micro Engine:** Generates variable-level micro-steps showing exact data structure operations (pushing to FIFO queue, popping LIFO stack, updating Min-Heap priorities).
- **Two-Phase Engine:** Separates Phase 1 (Frontier Search) from Phase 2 (Backtracking Path Reconstruction).

### 3. AI Explanation & Voice Synthesis Engine
Step traces are processed by natural language explanation generators (`explanationGenerator.js`, `annealingExplanation.js`) that produce beginner, advanced, math calculation, decision reason, and Web Speech API spoken audio narration (`useVoiceExplanation.js`).

### 4. Comparative & Stochastic Evaluation Methodology
- **Deterministic Search Algorithms** are evaluated on Path Cost, Visited Nodes, Total Steps, and Execution Time.
- **Stochastic Local Search Algorithms** (Hill Climbing, Simulated Annealing) are evaluated using 100 randomized trials (`ROBUSTNESS_TRIALS`) to calculate statistical success/convergence rates and average path costs.

### 5. Interactive Examination & Assessment System
Features timed quizzes (`useExamStore.js`), interactive node/edge selection tasks, real-time scoring, mistake timeline generation, and targeted study recommendations (`examExplanation.js`).

---

## Implementation Details

### Tech Stack
- **Frontend Core:** React 18, Vite, JavaScript (ES6+), Vanilla CSS Modules
- **State Management:** Zustand lightweight stores (`useGraphStore`, `useAlgorithmStore`, `useExamStore`, `useCompareStore`)
- **Audio & Speech:** Web Audio API sound synthesizer (`soundEffects.js`), Web Speech API Text-to-Speech (`useVoiceExplanation.js`)

### Module Breakdown (`src/features`)

| Module / Layer | File Location | Key Functionality & Exported Actions |
| :--- | :--- | :--- |
| **Compare Store** | `src/features/compare/store/useCompareStore.js` | Manages algorithm selection, animation playback timer, speed, and local search parameters.<br/>*Actions:* `setSelected()`, `toggleAlgorithm()`, `runComparison()`, `setStepIndex()`, `play()`, `pause()`, `setSpeed()`, `setLocalSearch()`. |
| **Compare Engine** | `src/features/compare/engine/compareRunner.js`<br/>`src/features/compare/engine/metrics.js` | Runs search algorithms, 100 stochastic trials, reverse Dijkstra optimal cost calculation, and admissibility check.<br/>*Functions:* `runComparison()`, `summarize()`, `buildVerdict()`, `findInadmissibleNodes()`, `pathCost()`, `costToGoal()`. |
| **Graph Stores** | `src/features/graph/store/useGraphStore.js`<br/>`src/features/graph/store/useAlgorithmStore.js`<br/>`src/features/graph/store/useExamStore.js` | Manages graph topology, animation playback, and exam quizzes.<br/>*Actions:* `addNode()`, `addEdge()`, `resetGraph()`, `setAlgorithm()`, `stepForward()`, `startExam()`, `submitAnswer()`. |
| **Graph Engines** | `src/features/graph/engine/` | Algorithm step generators (BFS, DFS, UCS, Greedy, A*, Hill Climbing, Simulated Annealing) & AI explanation generator.<br/>*Functions:* `runAlgorithm()`, `runBFS()`, `runDFS()`, `runUCS()`, `runGreedy()`, `runAStar()`, `runHillClimbing()`, `runSimulatedAnnealing()`, `explainStep()`. |
| **Graph Canvas & UI** | `src/features/graph/components/` | Interactive SVG canvas, node/edge edit popovers, glowing traversal particles, builder toolbars, state tables.<br/>*Components:* `GraphCanvas`, `NodeComponent`, `EdgeComponent`, `InlineEditor`, `GraphBuilder`, `AlgorithmStatePanel`, `ExplanationPanel`, `ExamModePage`. |
| **Grid Engine** | `src/features/grid/engine/gridEngines.js` | 2D matrix spatial grid pathfinding & maze navigation.<br/>*Functions:* `runGridBFS()`, `runGridDFS()`, `runGridUCS()`, `runGridGreedy()`, `runGridAStar()`, `runGridHillClimbing()`, `runGridSimulatedAnnealing()`. |

---

## Results and Analysis

Empirical evaluation across test graphs and grid environments provides the following key insights:

### 1. A* Search Optimality & Admissibility
- **Result:** A* guarantees the optimal path when heuristic $h(n)$ is admissible ($h(n) \le h^*(n)$). If $h(n)$ overestimates true cost ($h(n) > h^*(n)$), the engine flags the heuristic as inadmissible and A* may produce sub-optimal paths.
- **Efficiency:** A* expands significantly fewer nodes than Uniform Cost Search (UCS) because the evaluation function $f(n) = g(n) + h(n)$ directs the search towards the target.

### 2. BFS vs DFS Trade-offs
- **BFS (Breadth-First Search):** Guarantees the unweighted shortest path by expanding nodes level-by-level using a FIFO queue. Requires $O(b^d)$ memory.
- **DFS (Depth-First Search):** Uses a LIFO stack ($O(bm)$ memory complexity), but does not guarantee shortest paths and can get trapped exploring deep unpromising branches.

### 3. Greedy Best-First Search Mechanics
- Evaluates nodes solely based on heuristic estimation $h(n)$. Highly efficient on monotonic heuristic landscapes, but easily led astray by dead-ends or deceptive heuristics where $h(n)$ misleads the algorithm away from the true shortest path.

### 4. Hill Climbing vs Simulated Annealing
- **Hill Climbing:** Rapidly converges on local search problems but frequently gets stuck in *local maxima* or *plateaus* where all adjacent neighbors have higher heuristic values.
- **Simulated Annealing:** Overcomes local maxima by accepting worse moves probabilistically based on the Boltzmann probability equation $P = e^{-\Delta E / T}$. As temperature $T$ cools over time, it transitions from global exploration to local exploitation, achieving a significantly higher success rate over 100 trials.

### 5. Educational Impact & Examination Evaluation
- Real-time data structure visualizers (Open List / Closed Visited Set) combined with AI voice narration allow learners to mentally connect code execution with visual state changes. Interactive exam testing provides instantaneous mistake timelines and study recommendations, reinforcing core algorithm concepts.

---

## Team Information

**Team Name:** Team Infyra

| Student ID | Team Member Name |
| :--- | :--- |
| `0112330004` | Tazim Hossain Ohi |
| `0112330386` | Md Shahed Chowdhury |
| `0112330387` | Arfan Hamza |
| `0112330883` | Shoikot sazzad |

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation & Running Locally

1. Install project dependencies:
```bash
npm install
```

2. Start the local development server:
```bash
npm run dev
```

3. Open your browser and navigate to the local URL (typically `http://localhost:5173`).
