/** Shared names for the desktop Platform bridge. */
/** Private desktop channels; the Platform renderer receives bootstrap and locale updates. */
export const PLATFORM_IPC = {
  bootstrap: 'alego-platform:bootstrap',
  localeChanged: 'alego-platform:locale-changed',
  open: 'alego-platform:open',
  bounds: 'alego-platform:bounds',
  close: 'alego-platform:close',
} as const

/** Resolved Platform language; Desktop resolves the system preference before sending it. */
export type PlatformLocale = 'en_US' | 'zh_CN'
