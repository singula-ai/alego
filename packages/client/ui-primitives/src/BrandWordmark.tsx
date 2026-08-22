// Alego brand wordmark: the block mark plus the "alego" name in one svg.
// Native 84x24 with the mark, 54x24 without. The mark path is the same
// geometry AlegoMark draws, translated into the wordmark's 24-tall band. The
// name is set as live text in the app font stack rather than baked letterform
// paths, so it inherits the product's typography. Ink rides currentColor.

import type { IconProps } from './icons/props.ts'
import { ALEGO_MARK_PATH } from './AlegoMark.tsx'

/** Display options for the official brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading block mark; defaults to true. */
  includeMark?: boolean | undefined
}

/** Left edge of the name, leaving the mark its 24px column plus a 6px gap. */
const NAME_X = 30

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width follows the selected artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading block mark.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 84 : 54
  return (
    <svg
      width={(size * width) / 24}
      height={size}
      className={className}
      viewBox={includeMark ? '0 0 84 24' : '30 0 54 24'}
      fill="none"
      aria-hidden="true"
    >
      {includeMark && <path d={ALEGO_MARK_PATH} transform="translate(0 3)" fill="currentColor" />}
      <text
        x={NAME_X}
        y="17.5"
        fill="currentColor"
        fontFamily="var(--dsw-font-family, system-ui, -apple-system, 'Segoe UI', sans-serif)"
        fontSize="18"
        fontWeight="600"
        letterSpacing="-0.4"
      >
        alego
      </text>
    </svg>
  )
}
