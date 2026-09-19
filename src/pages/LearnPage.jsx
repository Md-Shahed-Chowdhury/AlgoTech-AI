import { BookOpen, Play, Layers, ChevronRight } from 'lucide-react'
import styles from './LearnPage.module.css'

const TOPICS = [
  { name: 'Bubble Sort',    tag: 'Sorting',   complexity: 'O(n²)',      color: '#6366f1' },
  { name: 'Merge Sort',     tag: 'Sorting',   complexity: 'O(n log n)', color: '#6366f1' },
  { name: 'Binary Search',  tag: 'Searching', complexity: 'O(log n)',   color: '#10b981' },
  { name: 'BFS',            tag: 'Graph',     complexity: 'O(V+E)',     color: '#f59e0b' },
  { name: 'DFS',            tag: 'Graph',     complexity: 'O(V+E)',     color: '#f59e0b' },
  { name: 'Quick Sort',     tag: 'Sorting',   complexity: 'O(n log n)', color: '#6366f1' },
]

export default function LearnPage() {
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
        {TOPICS.map(({ name, tag, complexity, color }) => (
          <article key={name} className={`card ${styles.card}`}>
            <div className={styles.cardTop}>
              <span className={styles.tag} style={{ color, background: `${color}18` }}>{tag}</span>
              <span className={styles.complexity}>{complexity}</span>
            </div>
            <h2 className={styles.name}>{name}</h2>
            <div className={styles.cardActions}>
              <button className={`btn btn-primary ${styles.actionBtn}`} style={{ '--c': color }}>
                <Play size={13} /> Visualize
              </button>
              <button className={`btn btn-ghost ${styles.actionBtn}`}>
                <Layers size={13} /> Explain
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
