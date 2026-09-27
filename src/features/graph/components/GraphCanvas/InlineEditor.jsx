/**
 * InlineEditor.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Popover floating input for inline editing of Node labels or Edge weights
 * directly on top of the GraphCanvas.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import styles from './GraphCanvas.module.css'

export default function InlineEditor({
  target,          // { type: 'node' | 'edge', id, x, y, initialValue }
  onSave,          // (newValue) => void
  onCancel,        // () => void
}) {
  const [value, setValue] = useState(target ? String(target.initialValue) : '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (target) {
      setValue(String(target.initialValue))
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [target])

  if (!target) return null

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!value.trim()) return
    onSave(target.type === 'edge' ? Math.max(1, Number(value) || 1) : value.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e)
    if (e.key === 'Escape') onCancel()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 10 }}
        className={styles.inlineEditorPopover}
        style={{ left: target.x, top: target.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className={styles.inlineEditorForm}>
          <div className={styles.inlineEditorHeader}>
            <span>{target.type === 'node' ? 'Edit Node Name' : 'Edit Edge Weight'}</span>
          </div>

          <div className={styles.inlineEditorInputGroup}>
            <input
              ref={inputRef}
              type={target.type === 'edge' ? 'number' : 'text'}
              min={target.type === 'edge' ? 1 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.inlineInput}
              placeholder={target.type === 'node' ? 'Label (e.g. A)' : 'Weight (e.g. 5)'}
              maxLength={target.type === 'node' ? 12 : 5}
            />

            <button type="submit" className={styles.inlineSaveBtn} title="Save (Enter)">
              <Check size={14} />
            </button>
            <button type="button" onClick={onCancel} className={styles.inlineCancelBtn} title="Cancel (Esc)">
              <X size={14} />
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  )
}
