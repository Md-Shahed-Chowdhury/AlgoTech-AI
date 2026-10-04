/**
 * InlineEditor.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Popover floating input for inline editing of:
 *   - Node label + H(n) heuristic (double-click a node)
 *   - Edge weight (double-click an edge)
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Sigma } from 'lucide-react'
import styles from './GraphCanvas.module.css'

export default function InlineEditor({
  target,     // { type: 'node' | 'edge', id, x, y, initialValue, initialHValue, isGoal }
  onSave,     // (newValue, newHValue?) => void
  onCancel,   // () => void
}) {
  const [value, setValue] = useState('')
  const [hValue, setHValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!target) return
    setValue(String(target.initialValue ?? ''))
    setHValue(target.initialHValue !== null && target.initialHValue !== undefined
      ? String(target.initialHValue)
      : '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [target])

  if (!target) return null

  const isNode = target.type === 'node'
  const isEdge = target.type === 'edge'

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (isEdge) {
      const weight = Math.max(1, Number(value) || 1)
      onSave(weight)
    } else {
      // Node: save label + h value
      const label = value.trim() || target.initialValue
      const hNum = hValue.trim() === '' ? null : Math.max(0, Number(hValue) || 0)
      onSave(label, hNum)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e)
    if (e.key === 'Escape') onCancel()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={styles.inlineEditorPopover}
        style={{ left: target.x, top: target.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className={styles.inlineEditorForm}>
          {/* Header */}
          <div className={styles.inlineEditorHeader}>
            <span>{isNode ? `Edit Node  ${target.id}` : 'Edit Edge Weight'}</span>
          </div>

          {/* Node Name field */}
          <div className={styles.inlineEditorInputGroup}>
            <input
              ref={inputRef}
              type={isEdge ? 'number' : 'text'}
              min={isEdge ? 1 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.inlineInput}
              placeholder={isNode ? 'Name (e.g. A)' : 'Weight (e.g. 5)'}
              maxLength={isNode ? 12 : 5}
            />
          </div>

          {/* H(n) field — only for nodes */}
          {isNode && (
            <div className={styles.inlineHField}>
              <span className={styles.inlineHLabel}>
                <Sigma size={11} /> h(n):
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={target.isGoal ? '0' : hValue}
                onChange={(e) => setHValue(e.target.value)}
                disabled={target.isGoal}
                title={target.isGoal ? 'The goal node always has h = 0' : undefined}
                onKeyDown={handleKeyDown}
                className={`${styles.inlineInput} ${styles.inlineHInput}`}
                placeholder="e.g. 5"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.inlineEditorActions}>
            <button type="submit" className={styles.inlineSaveBtn} title="Save (Enter)">
              <Check size={13} /> Save
            </button>
            <button type="button" onClick={onCancel} className={styles.inlineCancelBtn} title="Cancel (Esc)">
              <X size={13} />
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  )
}
