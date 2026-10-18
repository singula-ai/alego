/** Animated Alego block mask and static SVG fallback for the running Chat status. */
import css from './ChatView.module.css'

const REST_PATH = 'M1.5 12V7.5Q1.5 6.5 2.5 6.5H2.8V4.7Q2.8 4.1 3.4 4.1H4.6Q5.2 4.1 5.2 4.7V6.5H6.8V4.7Q6.8 4.1 7.4 4.1H8.6'
  + 'Q9.2 4.1 9.2 4.7V6.5H10.8V4.7Q10.8 4.1 11.4 4.1H12.6Q13.2 4.1 13.2 4.7V6.5H13.5Q14.5 6.5 14.5 7.5V12Q14.5 13 13.5 13'
  + 'H2.5Q1.5 13 1.5 12Z'

/**
 * Render the decorative running icon; the APNG asset owns its animation timing.
 * @returns mask and static SVG selected by browser capabilities and accessibility preferences.
 */
export function RunningBlockStuds() {
  return (
    <span className={css.runningIcon} aria-hidden="true">
      <span className={css.runningBlockAnimated} />
      <svg className={css.runningBlockStill} width="100%" height="100%" viewBox="0 0 16 16" fill="none">
        <path d={REST_PATH} stroke="currentColor" strokeWidth={1} />
      </svg>
    </span>
  )
}
