import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, Layers, ChevronRight } from 'lucide-react'
import styles from './LearnPage.module.css'

const TOPICS = [
  { id: 'bfs',    name: 'Breadth-First Search (BFS)', tag: 'Graph Search', complexity: 'O(V+E)',     color: '#6366f1', route: '/graph/learn/bfs' },
  { id: 'dfs',    name: 'Depth-First Search (DFS)',   tag: 'Graph Search', complexity: 'O(V+E)',     color: '#8b5cf6', route: '/graph/learn/dfs' },
  { id: 'ucs',    name: 'Uniform Cost Search (UCS)',  tag: 'Graph Search', complexity: 'O(V log V)', color: '#10b981', route: '/graph/learn/ucs' },
  { id: 'greedy', name: 'Greedy Best-First Search',   tag: 'Graph Search', complexity: 'O(V log V)', color: '#f59e0b', route: '/graph/learn/greedy' },
  { id: 'astar',  name: 'A* Search Algorithm',        tag: 'Graph Search', complexity: 'O(V log V)', color: '#f43f5e', route: '/graph/learn/astar' },
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
          Pick any algorithm below to study it with interactive animations and step-by-step explanations.
        </p>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {TOPICS.map(({ id, name, tag, complexity, color, route }) => (
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
                onClick={() => route ? navigate(route) : navigate('/graph/learn')}
              >
                <Play size={13} /> Visualize
              </button>
              <button
                className={`btn btn-ghost ${styles.actionBtn}`}
                onClick={() => route ? navigate(route) : navigate('/graph/learn')}
              >
                <Layers size={13} /> Explain
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
