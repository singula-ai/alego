/** Native SVG contour animation for the Alego block Chat shows while the Session runs. */
import css from './ChatView.module.css'

const STUD_WIDTH = 2.4
const STUD_RADIUS = 0.6
const BODY_TOP = 6.5
const STUD_REST_TOP = 4.1
const STUD_RAISED_TOP = 2.6

/**
 * Format one coordinate without binary floating-point residue.
 * @param value - Coordinate in viewBox units.
 * @returns the value rounded to hundredths.
 */
function coordinate(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/**
 * Trace one stud from the body's top edge up to its rounded top and back down.
 * @param left - Left edge of the stud.
 * @param top - Top edge of the stud.
 * @returns path commands continuing along the body's top edge.
 */
function studOutline(left: number, top: number): string {
  const x0 = coordinate(left)
  const x1 = coordinate(left + STUD_RADIUS)
  const x2 = coordinate(left + STUD_WIDTH - STUD_RADIUS)
  const x3 = coordinate(left + STUD_WIDTH)
  const y0 = coordinate(top)
  const y1 = coordinate(top + STUD_RADIUS)
  return `H${x0}V${y1}Q${x0} ${y0} ${x1} ${y0}H${x2}Q${x3} ${y0} ${x3} ${y1}V${BODY_TOP}`
}

/**
 * Trace the block outline with each stud top at its own height.
 * @param tops - Stud top edges from left to right.
 * @returns one closed contour; every pose uses the same commands so SMIL can interpolate `d`.
 */
function blockOutline([left, middle, right]: readonly [number, number, number]): string {
  const studs = studOutline(2.8, left) + studOutline(6.8, middle) + studOutline(10.8, right)
  return `M1.5 12V7.5Q1.5 ${BODY_TOP} 2.5 ${BODY_TOP}${studs}H13.5Q14.5 ${BODY_TOP} 14.5 7.5V12Q14.5 13 13.5 13H2.5Q1.5 13 1.5 12Z`
}

const REST_PATH = blockOutline([STUD_REST_TOP, STUD_REST_TOP, STUD_REST_TOP])

/** Each stud rises in turn from the left, then the block rests for the remainder of the loop. */
const MOTION_PATHS = [
  REST_PATH,
  blockOutline([STUD_RAISED_TOP, STUD_REST_TOP, STUD_REST_TOP]),
  blockOutline([STUD_REST_TOP, STUD_RAISED_TOP, STUD_REST_TOP]),
  blockOutline([STUD_REST_TOP, STUD_REST_TOP, STUD_RAISED_TOP]),
  REST_PATH,
  REST_PATH,
].join(';')
const MOTION_TIMES = '0;0.08;0.16;0.24;0.32;1'

/**
 * Loop the stud wave every three seconds after a 0.3s delay.
 * @returns animated and resting contours switched by the reduced-motion stylesheet.
 */
export function RunningBlockStuds() {
  return (
    <span className={css.runningIcon} aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none">
        <path className={css.runningBlockAnimated} d={REST_PATH} stroke="currentColor" strokeWidth={1}>
          <animate attributeName="d" values={MOTION_PATHS} keyTimes={MOTION_TIMES}
            calcMode="linear" begin="0.3s" dur="3s" repeatCount="indefinite" />
        </path>
        <path className={css.runningBlockStill} d={REST_PATH} stroke="currentColor" strokeWidth={1} />
      </svg>
    </span>
  )
}
