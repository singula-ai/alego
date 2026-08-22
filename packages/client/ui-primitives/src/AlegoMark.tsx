// Alego mark: a studded building block, the product's "everything is a plugin"
// premise as one glyph. One path (three studs plus the body, unioned by
// overlap) so the silhouette stays crisp down to 16px. Native 24x18, rendered
// 24x18 by default; hero usage scales to 34x25.5. Color rides currentColor
// (wordmark ink).

import type { IconProps } from './icons/props.ts'

/**
 * The mark geometry in a 24x18 box. Shared with the wordmark so the two
 * surfaces cannot drift apart.
 */
export const ALEGO_MARK_PATH
  = 'M2.4 6.4V2.4Q2.4 1.2 3.6 1.2H5.2Q6.4 1.2 6.4 2.4V6.4ZM9.6 6.4V2.4Q9.6 1.2 10.8 1.2H12.4'
  + 'Q13.6 1.2 13.6 2.4V6.4ZM16.8 6.4V2.4Q16.8 1.2 18 1.2H19.6Q20.8 1.2 20.8 2.4V6.4Z'
  + 'M2.6 5.2H21.4Q23 5.2 23 6.8V15.2Q23 16.8 21.4 16.8H2.6Q1 16.8 1 15.2V6.8Q1 5.2 2.6 5.2Z'

/**
 * Render the Alego block mark.
 * @param props.size - width in px (default 24; height keeps the 24:18 ratio).
 * @param props.className - extra class for layout placement.
 * @returns the mark svg (aria-hidden; pair with the wordmark for accessibility).
 */
export function AlegoMark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={(size * 18) / 24}
      className={className}
      viewBox="0 0 24 18"
      fill="none"
      aria-hidden="true"
    >
      <path d={ALEGO_MARK_PATH} fill="currentColor" />
    </svg>
  )
}
