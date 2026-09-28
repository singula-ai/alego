/** Native SVG contour animation for the Alego block Chat shows while the Session runs. */
import css from './ChatView.module.css'

/** The block outline with all three studs at rest; every pose uses the same commands so SMIL can interpolate `d`. */
const REST_PATH = 'M1.5 12V7.5Q1.5 6.5 2.5 6.5H2.8V4.7Q2.8 4.1 3.4 4.1H4.6Q5.2 4.1 5.2 4.7V6.5H6.8V4.7Q6.8 4.1 7.4 4.1H8.6'
  + 'Q9.2 4.1 9.2 4.7V6.5H10.8V4.7Q10.8 4.1 11.4 4.1H12.6Q13.2 4.1 13.2 4.7V6.5H13.5Q14.5 6.5 14.5 7.5V12Q14.5 13 13.5 13'
  + 'H2.5Q1.5 13 1.5 12Z'

/** Each stud rises in turn from the left, then the block rests for the remainder of the loop. */
const MOTION_PATHS = [
  REST_PATH,
  'M1.5 12V7.5Q1.5 6.5 2.5 6.5H2.8V3.2Q2.8 2.6 3.4 2.6H4.6Q5.2 2.6 5.2 3.2V6.5H6.8V4.7Q6.8 4.1 7.4 4.1H8.6'
  + 'Q9.2 4.1 9.2 4.7V6.5H10.8V4.7Q10.8 4.1 11.4 4.1H12.6Q13.2 4.1 13.2 4.7V6.5H13.5Q14.5 6.5 14.5 7.5V12Q14.5 13 13.5 13'
  + 'H2.5Q1.5 13 1.5 12Z',
  'M1.5 12V7.5Q1.5 6.5 2.5 6.5H2.8V4.7Q2.8 4.1 3.4 4.1H4.6Q5.2 4.1 5.2 4.7V6.5H6.8V3.2Q6.8 2.6 7.4 2.6H8.6'
  + 'Q9.2 2.6 9.2 3.2V6.5H10.8V4.7Q10.8 4.1 11.4 4.1H12.6Q13.2 4.1 13.2 4.7V6.5H13.5Q14.5 6.5 14.5 7.5V12Q14.5 13 13.5 13'
  + 'H2.5Q1.5 13 1.5 12Z',
  'M1.5 12V7.5Q1.5 6.5 2.5 6.5H2.8V4.7Q2.8 4.1 3.4 4.1H4.6Q5.2 4.1 5.2 4.7V6.5H6.8V4.7Q6.8 4.1 7.4 4.1H8.6'
  + 'Q9.2 4.1 9.2 4.7V6.5H10.8V3.2Q10.8 2.6 11.4 2.6H12.6Q13.2 2.6 13.2 3.2V6.5H13.5Q14.5 6.5 14.5 7.5V12Q14.5 13 13.5 13'
  + 'H2.5Q1.5 13 1.5 12Z',
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
