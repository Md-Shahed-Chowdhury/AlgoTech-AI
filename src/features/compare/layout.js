/**
 * layout.js — geometry helpers shared by the comparison canvases.
 */

/**
 * A viewBox that tightly frames every node, so small mini-canvases are not
 * mostly empty space. Padding leaves room for node radius + start/goal badges.
 *
 * @returns {string} "x y w h"
 */
export function fitViewBox(graph, pad = 56) {
  const nodes = Object.values(graph?.nodes ?? {})
  if (nodes.length === 0) return '0 0 720 480'
  const xs = nodes.map(n => n.x)
  const ys = nodes.map(n => n.y)
  let minX = Math.min(...xs) - pad
  let minY = Math.min(...ys) - pad
  let w = Math.max(...xs) - Math.min(...xs) + pad * 2
  let h = Math.max(...ys) - Math.min(...ys) + pad * 2

  // Keep a pleasant aspect ratio between 4:3 and 2:1
  const MIN_RATIO = 4 / 3
  const MAX_RATIO = 2
  if (w / h < MIN_RATIO) { const nw = h * MIN_RATIO; minX -= (nw - w) / 2; w = nw }
  if (w / h > MAX_RATIO) { const nh = w / MAX_RATIO; minY -= (nh - h) / 2; h = nh }

  return [minX, minY, w, h].map(v => Math.round(v)).join(' ')
}
