#!/usr/bin/env bash
# One-command source install for the alego CLI (Linux/macOS):
#
#   curl -fsSL https://raw.githubusercontent.com/singula-ai/alego/main/install.sh | bash
#
# Clones the repository, installs dependencies with the pinned pnpm, builds the
# runtime and Web UI, and writes an `alego` launcher into a bin directory.
# Re-running updates the checkout and rebuilds; local changes inside the
# managed checkout are discarded on update.
#
# Environment overrides:
#   ALEGO_SRC_DIR  checkout directory       (default: ~/.alego-src)
#   ALEGO_BIN_DIR  launcher directory       (default: ~/.local/bin)
#   ALEGO_REPO     git URL                  (default: https://github.com/singula-ai/alego.git)
#   ALEGO_REF      branch or tag to install (default: main)
#
# Uninstall: remove "$ALEGO_BIN_DIR/alego" and "$ALEGO_SRC_DIR".
set -euo pipefail

SRC_DIR="${ALEGO_SRC_DIR:-$HOME/.alego-src}"
BIN_DIR="${ALEGO_BIN_DIR:-$HOME/.local/bin}"
REPO="${ALEGO_REPO:-https://github.com/singula-ai/alego.git}"
REF="${ALEGO_REF:-main}"

info() { printf 'alego install: %s\n' "$*"; }
fail() { printf 'alego install: error: %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "git is required"
command -v node >/dev/null 2>&1 || fail "Node.js is required (^22.19.0 || >=24)"

# The repository's engines range: ^22.19.0 || >=24.
node_version="$(node --version)"
node_version="${node_version#v}"
node_major="${node_version%%.*}"
node_rest="${node_version#*.}"
node_minor="${node_rest%%.*}"
if [ "$node_major" -lt 22 ] || [ "$node_major" -eq 23 ] \
  || { [ "$node_major" -eq 22 ] && [ "$node_minor" -lt 19 ]; }; then
  fail "Node.js $node_version is unsupported; alego needs ^22.19.0 || >=24"
fi

# pnpm, through corepack when absent: corepack ships with Node and provides the
# pnpm version pinned by the repository's packageManager field.
if ! command -v pnpm >/dev/null 2>&1; then
  command -v corepack >/dev/null 2>&1 \
    || fail "pnpm is required; install it (https://pnpm.io/installation) or provide corepack"
  info "pnpm not found; enabling it through corepack"
  corepack enable >/dev/null 2>&1 \
    || fail "corepack enable failed; install pnpm manually (https://pnpm.io/installation)"
  hash -r
  command -v pnpm >/dev/null 2>&1 \
    || fail "pnpm is still unavailable after corepack enable; install it manually"
fi

if [ -e "$SRC_DIR" ] && [ ! -d "$SRC_DIR/.git" ]; then
  fail "$SRC_DIR exists but is not a git checkout; move it aside or set ALEGO_SRC_DIR"
fi
if [ -d "$SRC_DIR/.git" ]; then
  info "updating existing checkout in $SRC_DIR (local changes there are discarded)"
  git -C "$SRC_DIR" fetch --depth 1 origin "$REF"
  git -C "$SRC_DIR" reset --hard FETCH_HEAD --
else
  info "cloning $REPO ($REF) into $SRC_DIR"
  git clone --depth 1 --branch "$REF" "$REPO" "$SRC_DIR"
fi

info "installing dependencies (pnpm install --frozen-lockfile)"
pnpm -C "$SRC_DIR" install --frozen-lockfile
info "building the runtime and Web UI (pnpm run build) — this takes a few minutes"
pnpm -C "$SRC_DIR" run build

mkdir -p "$BIN_DIR"
launcher="$BIN_DIR/alego"
printf '#!/usr/bin/env bash\nexec node "%s/apps/cli/lib/bin.js" "$@"\n' "$SRC_DIR" > "$launcher"
chmod +x "$launcher"

info "installed $("$launcher" --version 2>/dev/null || echo "launcher") at $launcher"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) info "note: $BIN_DIR is not on your PATH; add it, e.g.: export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac
info "run: alego web"
