/** Typed preload operations exposed only by the Electron shell. */

import type { DesktopPluginRecord } from './project-manager.ts'
import type { DesktopLocale } from './locale.ts'
import type { DesktopBackendState } from './backend-controller.ts'

/** IPC channel names kept private to the desktop application bundle. */
export const DESKTOP_IPC = {
  localeGet: 'alego-desktop:locale-get',
  pluginsList: 'alego-desktop:plugins-list',
  pluginsAdd: 'alego-desktop:plugins-add',
  pluginsRemove: 'alego-desktop:plugins-remove',
  pluginsUpdate: 'alego-desktop:plugins-update',
  pluginsToggle: 'alego-desktop:plugins-toggle',
  pluginsDisableAll: 'alego-desktop:plugins-disable-all',
  backendStatus: 'alego-desktop:backend-status',
  backendRetry: 'alego-desktop:backend-retry',
  applicationRestart: 'alego-desktop:application-restart',
  configurationReset: 'alego-desktop:configuration-reset',
  backendState: 'alego-desktop:backend-state',
  updatesCheck: 'alego-desktop:updates-check',
  updatesInstall: 'alego-desktop:updates-install',
  updatesState: 'alego-desktop:updates-state',
} as const

/** Desktop release update state rendered by desktop-owned UI. */
export interface DesktopUpdateState {
  readonly phase: 'idle' | 'checking' | 'available' | 'installing' | 'ready' | 'error'
  readonly version?: string
  readonly message?: string
}

/** Narrow bridge exposed through context isolation. */
export interface AlegoDesktopApi {
  readonly protocolVersion: 1
  locale(): Promise<DesktopLocale>
  readonly plugins: {
    list(): Promise<readonly DesktopPluginRecord[]>
    add(spec: string): Promise<void>
    remove(name: string): Promise<void>
    update(name: string, version: string): Promise<void>
    toggle(name: string, enabled: boolean): Promise<void>
    disableAll(): Promise<void>
  }
  readonly backend: {
    status(): Promise<DesktopBackendState>
    retry(): Promise<void>
    subscribe(listener: (state: DesktopBackendState) => void): () => void
  }
  readonly updates: {
    check(): Promise<DesktopUpdateState>
    install(): Promise<void>
    subscribe(listener: (state: DesktopUpdateState) => void): () => void
  }
}

/** Startup-page controls, unavailable to backend-provided application documents. */
export interface AlegoDesktopStartupApi extends Pick<AlegoDesktopApi, 'protocolVersion' | 'locale'> {
  readonly backend: Omit<AlegoDesktopApi['backend'], 'retry'>
  disablePlugins(): Promise<void>
  restart(): Promise<void>
  resetConfiguration(): Promise<void>
}
