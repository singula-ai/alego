/** Typed preload operations exposed only by the Electron shell. */

import type { DesktopKeyboardApi, DesktopShortcutsApi } from '@singula-ai/alego-client-shortcuts/protocol'
import type { IpcMainInvokeEvent } from 'electron'
import type { DesktopBrowserBridge } from '@singula-ai/alego-client-ui-sidebar-browser/types'

/** IPC channel names kept private to the desktop application bundle. */
export const DESKTOP_IPC = {
  shortcutsInput: 'alego-desktop:shortcuts-input',
  shortcutsCloseWindow: 'alego-desktop:shortcuts-close-window',
  shortcutsGet: 'alego-desktop:shortcuts-get',
  shortcutsEdit: 'alego-desktop:shortcuts-edit',
  shortcutsChanged: 'alego-desktop:shortcuts-changed',
  shortcutsRecording: 'alego-desktop:shortcuts-recording',
  boot: 'alego-desktop:boot',
  enterWorkspace: 'alego-desktop:enter-workspace',
  onboardingActive: 'alego-desktop:onboarding-active',
  onboardingApiKey: 'alego-desktop:onboarding-api-key',
  bootFailed: 'alego-desktop:boot-failed',
  browserAcquire: 'alego-desktop:browser-acquire',
  browserRelease: 'alego-desktop:browser-release',
  browserOpenRequested: 'alego-desktop:browser-open-requested',
  directoryPick: 'alego-desktop:directory-pick',
  localeBootstrap: 'alego-desktop:locale-bootstrap',
  localeChanged: 'alego-desktop:locale-changed',
  updatesStatus: 'alego-desktop:updates-status',
  updatesOpen: 'alego-desktop:updates-open',
  updatesPresentation: 'alego-desktop:updates-presentation',
  nativeThemeSet: 'alego-desktop:native-theme-set',
  windowFullscreen: 'alego-desktop:window-fullscreen',
  windowsAppearance: 'alego-desktop:windows-appearance',
  windowsMenu: 'alego-desktop:windows-menu',
} as const

/** Desktop release update state rendered by desktop-owned UI. */
export type DesktopUpdatePreparationFailureKind = 'stop-failed' | 'tasks-changed' | 'tasks-unavailable'

export interface DesktopUpdateState {
  readonly phase: 'idle' | 'checking' | 'available' | 'downloading' | 'verifying' | 'installing' | 'ready' | 'error'
  readonly version?: string
  readonly message?: string
  /** Main-owned diagnostics without subprocess output or credentials; hidden until expanded. */
  readonly technicalDetails?: string
  readonly percent?: number
  readonly failedOperation?: 'check' | 'download' | 'install'
  /** Main-owned preparation cause; UI wording is selected by the active locale. */
  readonly preparationFailure?: DesktopUpdatePreparationFailureKind
}

/** Classified failure copy selected by the Web locale without exposing raw updater diagnostics. */
export type DesktopUpdateFailureKind =
  | 'check'
  | 'check-network'
  | 'download'
  | 'download-network'
  | 'install'
  | 'install-network'
  | 'stop-failed'
  | 'tasks-changed'
  | 'tasks-unavailable'

/** Semantic status content; actions open main-process confirmation dialogs only. */
export interface DesktopUpdatePresentation {
  readonly phase: DesktopUpdateState['phase']
  readonly version?: string
  readonly percent?: number
  readonly failure?: DesktopUpdateFailureKind
}

/** Product documents cannot supply update versions, package URLs, or installation authorization. */
export interface AlegoDesktopProductApi {
  readonly protocolVersion: 1
  readonly browser: DesktopBrowserBridge
  readonly keyboard: DesktopKeyboardApi
  readonly shortcuts: DesktopShortcutsApi
  readonly updates: {
    status(): Promise<DesktopUpdatePresentation>
    open(): Promise<void>
    subscribe(listener: (state: DesktopUpdatePresentation) => void): () => void
  }
}

/** Scheme of Desktop-owned application documents. */
export const SCHEME = 'alego-app'

/**
 * Reject IPC outside the allowed Desktop document origins.
 * @param event - IPC caller whose frame URL supplies the origin.
 * @param hostnames - Desktop document hosts allowed for this operation.
 */
export function assertDesktopSender(event: IpcMainInvokeEvent, hostnames: readonly string[]): void {
  const senderFrame = event.senderFrame
  if (senderFrame === null) throw new Error('alego desktop: rejected IPC without a sender frame')
  const url = new URL(senderFrame.url)
  if (url.protocol !== `${SCHEME}:` || !hostnames.includes(url.hostname)) {
    throw new Error('alego desktop: rejected IPC from an unowned renderer')
  }
}
