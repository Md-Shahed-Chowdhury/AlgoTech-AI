/**
 * LocalSearchSettings.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Popover with Simulated Annealing (seed, T₀, α) and Hill Climbing (sideways
 * moves) settings. Sliders edit a draft and commit on release, because every
 * commit re-runs the race including 100 seeded annealing trials.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Dices, RotateCcw } from 'lucide-react'
import { useCompareStore, LOCAL_SEARCH_DEFAULTS } from '../../store/useCompareStore.js'
import { LOCAL_SEARCH } from '../../engine/runAny.js'
import styles from './LocalSearchSettings.module.css'

export default function LocalSearchSettings() {
  const selected = useCompareStore(s => s.selected)
  const localSearch = useCompareStore(s => s.localSearch)
  const setLocalSearch = useCompareStore(s => s.setLocalSearch)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(localSearch)
  const rootRef = useRef(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const hasHill = selected.includes(LOCAL_SEARCH.HILL)
  const hasAnnealing = selected.includes(LOCAL_SEARCH.ANNEALING)
  if (!hasHill && !hasAnnealing) return null

  const edit = (key) => (e) => setDraft(d => ({ ...d, [key]: Number(e.target.value) }))
  const commit = (key) => () => { if (draft[key] !== localSearch[key]) setLocalSearch({ [key]: draft[key] }) }
  const commitProps = (key) => ({ onPointerUp: commit(key), onKeyUp: commit(key), onBlur: commit(key) })
  // Update draft and store together so the visible values never go stale
  const apply = (patch) => { setDraft(d => ({ ...d, ...patch })); setLocalSearch(patch) }
  const rerollSeed = () => apply({ seed: Math.floor(Math.random() * 9000) + 1 })

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        id="compare-local-settings"
        className={`btn btn-ghost ${open ? styles.triggerOpen : ''}`}
        onClick={() => { setDraft(localSearch); setOpen(o => !o) }}
        aria-expanded={open}
      >
        <SlidersHorizontal size={14} /> Local search
        {hasAnnealing && <span className={styles.seedBadge}>seed {localSearch.seed}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Local search settings"
          >
            {hasAnnealing && (
              <section className={styles.section}>
                <h4 className={styles.heading}><span className={styles.dot} style={{ background: '#e879f9' }} /> Simulated Annealing</h4>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Random seed</span>
                  <span className={styles.seedRow}>
                    <input
                      type="number"
                      min={1}
                      max={99999}
                      value={draft.seed}
                      onChange={edit('seed')}
                      onBlur={commit('seed')}
                      onKeyDown={(e) => e.key === 'Enter' && commit('seed')()}
                      className={styles.number}
                    />
                    <button className={styles.dice} onClick={rerollSeed} title="Random seed">
                      <Dices size={15} /> Reroll
                    </button>
                  </span>
                  <span className={styles.help}>Same seed = same run. Share the URL to replay it.</span>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Start temperature T₀ <strong>{draft.t0}</strong>
                  </span>
                  <input type="range" min={1} max={30} step={1} value={draft.t0} onChange={edit('t0')} {...commitProps('t0')} className={styles.range} />
                  <span className={styles.help}>Higher = more willing to accept worse moves early on.</span>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Cooling rate α <strong>{draft.alpha.toFixed(2)}</strong>
                  </span>
                  <input type="range" min={0.7} max={0.99} step={0.01} value={draft.alpha} onChange={edit('alpha')} {...commitProps('alpha')} className={styles.range} />
                  <span className={styles.help}>T ← T × α each iteration. Closer to 1 = slower cooling, more exploration.</span>
                </label>
              </section>
            )}

            {hasHill && (
              <section className={styles.section}>
                <h4 className={styles.heading}><span className={styles.dot} style={{ background: '#a3e635' }} /> Hill Climbing</h4>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Sideways moves allowed <strong>{draft.sideways}</strong>
                  </span>
                  <input type="range" min={0} max={5} step={1} value={draft.sideways} onChange={edit('sideways')} {...commitProps('sideways')} className={styles.range} />
                  <span className={styles.help}>Moves to an equal-h neighbor to cross plateaus. 0 = textbook steepest descent.</span>
                </label>
              </section>
            )}

            <button className={styles.reset} onClick={() => apply({ ...LOCAL_SEARCH_DEFAULTS })}>
              <RotateCcw size={13} /> Reset to defaults
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
