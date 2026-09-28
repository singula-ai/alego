/** Process-realm lazy access to Koffi's CommonJS entry. */

import type koffi from 'koffi'
import { createLazyRequire } from '@singula-ai/alego-lazy-require'

/** Koffi runtime export type. */
export type Koffi = typeof koffi

/** Load Koffi on the first Win32 native operation. */
export const requireKoffi = createLazyRequire<Koffi>('koffi', import.meta.url)
