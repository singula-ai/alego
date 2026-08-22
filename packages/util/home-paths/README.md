# alego-home-paths

English | [中文](README.zh.md)

Shared filesystem path helpers for Alego user data.

## ALEGO home

`resolveAlegoHome()` resolves the single-root Alego home. Precedence, highest first: an explicit configured path, `$ALEGO_HOME`, then `~/.alego`. The harness keeps all user data under one root.

`alegoHomePath(...segments)` joins child segments onto that resolved home with Node's platform path rules. With no segments it returns the home itself.

`alegoHomeDisplay()` names an active root symbolically for user-facing paths: `~/.alego` for the default home, `$ALEGO_HOME` for any configured home. It never leaks an absolute machine path.

`ALEGO_HOME_DIR_NAME` owns the default user-data directory name: `.alego`.

`defaultAlegoHome()` returns the default Alego home by joining the operating-system home directory with `.alego`, using Node's platform path rules.

`expandHomePath()` expands `~`, `~/...`, and Windows-style `~\...` prefixes against the operating-system home directory. It leaves non-tilde paths and `~user/...` untouched.

## Watch paths

`canonicalizeWatchPath()` gives a native filesystem watcher one stable spelling of its target. It resolves the deepest existing ancestor through `fs.realpath()` and restores any missing suffix, so a file or directory may still be watched before it is created. In particular, Windows 8.3 aliases cannot be mixed with the long paths emitted by the native watcher backend.

This package is intentionally small and harness-dep-free so product packages can share user-data path conventions without depending on one another.

## Known Limitations and Deferred Work

- **Expansion is deliberately narrow** — only bare `~`, `~/...`, and `~\...` use the current operating-system home; named-user forms such as `~alice/...`, environment variables, and shell expressions remain unchanged.
- **Canonicalization reads but never mutates** — `canonicalizeWatchPath()` performs `realpath` probes and propagates errors other than absence; callers still own directory creation, permissions, and trust policy for the resulting path.
