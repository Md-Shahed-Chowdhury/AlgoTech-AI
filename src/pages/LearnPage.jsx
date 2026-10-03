import { useNavigate } from 'react-router-dom'
import { BookOpen, ClipboardList } from 'lucide-react'
import styles from './LearnPage.module.css'

const TOPICS = [
  { id: 'bfs',                 name: 'Breadth-First Search (BFS)', tag: 'Graph Search',               complexity: 'O(V+E)',     color: '#6366f1' },
  { id: 'dfs',                 name: 'Depth-First Search (DFS)',   tag: 'Graph Search',               complexity: 'O(V+E)',     color: '#8b5cf6' },
  { id: 'ucs',                 name: 'Uniform Cost Search (UCS)',  tag: 'Graph Search',               complexity: 'O(V log V)', color: '#10b981' },
  { id: 'greedy',              name: 'Greedy Best-First Search',   tag: 'Graph Search',               complexity: 'O(V log V)', color: '#f59e0b' },
  { id: 'astar',               name: 'A* Search Algorithm',        tag: 'Graph Search',               complexity: 'O(V log V)', color: '#f43f5e' },
  { id: 'hillclimbing',       name: 'Hill Climbing Algorithm',    tag: 'Local Search / Optimization', complexity: 'O(V)',       color: '#38bdf8' },
  { id: 'simulatedannealing', name: 'Simulated Annealing',        tag: 'Local Search / Optimization', complexity: 'O(K)',       color: '#a855f7' },
]

export default function LearnPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.pill}>
          <BookOpen size={13} /> Learn Mode
        </div>
        <h1 className={styles.title}>
          Master <span className="gradient-text">Algorithms</span>
        </h1>
        <p className={styles.sub}>
          Pick any algorithm below to study it with interactive animations, step-by-step explanations, or test your knowledge in Exam mode.
        </p>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {TOPICS.map(({ id, name, tag, complexity, color }) => (
          <article key={id} className={`card ${styles.card}`}>
            <div className={styles.cardTop}>
              <span className={styles.tag} style={{ color, background: `${color}18` }}>{tag}</span>
              <span className={styles.complexity}>{complexity}</span>
            </div>
            <h2 className={styles.name}>{name}</h2>
            <div className={styles.cardActions}>
              <button
                className={`btn btn-primary ${styles.actionBtn}`}
                style={{ '--c': color }}
                onClick={() => navigate(`/graph/learn/${id}`)}
              >
                <BookOpen size={13} /> Learn
              </button>
              <button
                className={`btn btn-ghost ${styles.actionBtn}`}
                onClick={() => navigate(`/graph/exam/${id}`)}
              >
                <ClipboardList size={13} /> Give Test
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
