/**
 * Virtual root of the worker host's in-memory filesystem. Kept
 * in one module so the process shim, the path/os shims, and the VFS image
 * collector cannot drift apart.
 */

/** Virtual filesystem root; `process.cwd()` and every absolute path start here. */
export const ALEGO_ROOT = '/alego'

/** `$ALEGO_HOME`: durable-state directory inside the image. */
export const ALEGO_HOME = `${ALEGO_ROOT}/home`

/** Flat, symlink-free package tree resolved by the worker module loader. */
export const ALEGO_NODE_MODULES = `${ALEGO_ROOT}/node_modules`

/** Directory holding the composed cordis.yml and the agent-preset tree. */
export const ALEGO_CONFIG = `${ALEGO_ROOT}/config`

/** Default (empty) workspace directory. */
export const ALEGO_WORKSPACE = `${ALEGO_ROOT}/workspace`

/** Temporary directory reported by `os.tmpdir()`. */
export const ALEGO_TMP = `${ALEGO_ROOT}/tmp`
