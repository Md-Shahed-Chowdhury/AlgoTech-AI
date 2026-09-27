/**
 * MinHeap.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A lightweight min-heap (priority queue) used by UCS, Greedy, and A*.
 * Kept in its own file so the algorithm files stay readable.
 *
 * Usage:
 *   const pq = new MinHeap()
 *   pq.push({ id: 'A', priority: 0 })
 *   const { id, priority } = pq.pop()
 *   pq.isEmpty()
 *   pq.size()
 *   pq.toArray()   // non-destructive snapshot (for panel display)
 */
export class MinHeap {
  constructor() {
    /** @type {Array<{id: string, priority: number, [key: string]: any}>} */
    this._heap = []
  }

  get size() { return this._heap.length }

  isEmpty() { return this._heap.length === 0 }

  /**
   * Insert an item. Item must have a numeric `priority` field.
   * @param {{ id: string, priority: number }} item
   */
  push(item) {
    this._heap.push(item)
    this._bubbleUp(this._heap.length - 1)
  }

  /**
   * Remove and return the item with the lowest priority.
   * @returns {{ id: string, priority: number } | undefined}
   */
  pop() {
    if (this.isEmpty()) return undefined
    const top = this._heap[0]
    const last = this._heap.pop()
    if (this._heap.length > 0) {
      this._heap[0] = last
      this._siftDown(0)
    }
    return top
  }

  /** Peek without removing. */
  peek() { return this._heap[0] ?? null }

  /** Return a sorted copy of all items (does not mutate the heap). */
  toArray() {
    return [...this._heap].sort((a, b) => a.priority - b.priority)
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      if (this._heap[parent].priority <= this._heap[i].priority) break
      ;[this._heap[parent], this._heap[i]] = [this._heap[i], this._heap[parent]]
      i = parent
    }
  }

  _siftDown(i) {
    const n = this._heap.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this._heap[l].priority < this._heap[smallest].priority) smallest = l
      if (r < n && this._heap[r].priority < this._heap[smallest].priority) smallest = r
      if (smallest === i) break
      ;[this._heap[smallest], this._heap[i]] = [this._heap[i], this._heap[smallest]]
      i = smallest
    }
  }
}
