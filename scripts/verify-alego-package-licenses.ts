/**
 * Enforce the MIT license declaration for repository-owned ALEGO npm packages.
 * @module scripts/verify-alego-package-licenses
 */

import { globSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
/** npm scope of every package in this workspace. */
const ALEGO_SCOPE = '@alego/'
/**
 * Workspaces holding the MIT product itself. The scope alone cannot select
 * them: `vendor/` holds rescoped upstream sources, `native/` carries the
 * Landlock addon's own BSD-3-Clause terms, and `website/` is unpublished —
 * all three share the scope while keeping their own licensing.
 */
const PRODUCT_MANIFESTS = /^(?:package\.json|apps\/[^/]+\/package\.json|packages\/[^/]+\/[^/]+\/package\.json)$/

/** Result of checking every ALEGO package reachable through the root workspace list. */
export interface AlegoPackageLicenseReport {
  /** Number of ALEGO package manifests checked. */
  packageCount: number
  /** Repository-relative diagnostics for non-MIT declarations. */
  failures: string[]
}

function readManifest(root: string, file: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(resolve(root, file), 'utf8'))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`verify-alego-package-licenses: ${file} must contain a JSON object.`)
  }
  return parsed as Record<string, unknown>
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string')
}

function workspaceManifestPaths(root: string): string[] {
  const rootManifest = readManifest(root, 'package.json')
  const workspaces = rootManifest.workspaces
  if (!isStringArray(workspaces)) {
    throw new Error('verify-alego-package-licenses: package.json workspaces must be a string array.')
  }

  const files = new Set(['package.json'])
  for (const pattern of workspaces) {
    for (const file of globSync(`${pattern}/package.json`, { cwd: root })) {
      files.add(file)
    }
  }
  return [...files].sort()
}

function printable(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value)
}

/**
 * Check every ALEGO npm package declared by the repository workspace.
 * @param root - absolute repository root containing the workspace package.json.
 * @returns the checked package count and every non-MIT declaration.
 */
export function inspectAlegoPackageLicenses(root: string): AlegoPackageLicenseReport {
  let packageCount = 0
  const failures: string[] = []

  for (const file of workspaceManifestPaths(root)) {
    const manifest = readManifest(root, file)
    const name = manifest.name
    const normalizedFile = file.split(sep).join('/')
    if (typeof name !== 'string' || !name.startsWith(ALEGO_SCOPE)) continue
    if (!PRODUCT_MANIFESTS.test(normalizedFile)) continue

    packageCount++
    if (manifest.license !== 'MIT') {
      failures.push(
        `${normalizedFile}: ${name} must declare "license": "MIT"; found ${printable(manifest.license)}.`,
      )
    }
  }

  return { packageCount, failures }
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const report = inspectAlegoPackageLicenses(ROOT)
  if (report.failures.length > 0) {
    process.stderr.write('verify-alego-package-licenses: non-MIT ALEGO package declarations found:\n')
    for (const failure of report.failures) process.stderr.write(`  ${failure}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(
      `verify-alego-package-licenses: ${String(report.packageCount)} ALEGO package(s) checked; all declare MIT.\n`,
    )
  }
}
