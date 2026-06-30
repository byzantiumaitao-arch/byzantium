#!/usr/bin/env bash
# One-command quickstart for the Byzantium AI Agent Kit.
#   bash quickstart.sh
# Checks prerequisites, installs deps, then runs the guided setup.
set -e

cd "$(dirname "$0")"

echo "== Byzantium AI Agent Kit quickstart =="

# Node 24+ required by ElizaOS.
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js not found. Install Node v24+ from https://nodejs.org and re-run."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "✗ Node $(node -v) found, but ElizaOS needs v24+. Please upgrade and re-run."
  exit 1
fi
echo "✓ Node $(node -v)"

# bun is ElizaOS's package manager/runtime.
if ! command -v bun >/dev/null 2>&1; then
  echo "• bun not found — installing (https://bun.sh)..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
echo "✓ bun $(bun -v)"

echo "• Installing dependencies (this can take a minute)..."
bun install

echo ""
echo "Now let's configure your agent."
bun run setup

echo ""
echo "Verifying your setup..."
bun run check || true

echo ""
echo "Done. When you're ready to go live, set \"dryRun\": false in byzantium.config.json and run: npm start"
