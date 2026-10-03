/**
 * EditGraphDrawer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Side drawer reusing the Learn-mode GraphBuilder + editable GraphCanvas on the
 * shared useGraphStore graph.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, Check } from 'lucide-react'
import GraphBuilder from '../../../graph/components/GraphBuilder/GraphBuilder.jsx'
import GraphCanvas from '../../../graph/components/GraphCanvas/GraphCanvas.jsx'
import styles from './EditGraphDrawer.module.css'

export default function EditGraphDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      // Let the inline node/edge editor handle its own Escape first
      if (e.key === 'Escape' && !e.target.closest?.('input')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.backdrop}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Edit graph"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <header className={styles.head}>
              <div>
                <h2 className={styles.title}>Edit Graph</h2>
                <p className={styles.sub}>Changes apply to every algorithm in the race.</p>
              </div>
              <button className={styles.close} onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </header>

            <div className={styles.body}>
              <GraphBuilder showStatsPanel={false} />
              <p className={styles.tip}>
                <Info size={13} /> Double-click a node to rename it or set its heuristic <strong>h(n)</strong>; double-click an edge to change its weight.
              </p>
              <GraphCanvas viewBox="0 0 850 550" width={850} height={550} />
            </div>

            <footer className={styles.foot}>
              <button className="btn btn-primary" onClick={onClose}>
                <Check size={15} /> Done: update race
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
