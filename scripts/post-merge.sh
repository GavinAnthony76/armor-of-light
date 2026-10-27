#!/usr/bin/env bash
# Run from the project root with stdin closed by Replit's merge reconciliation.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Match the merged lockfile, including TypeScript/Vite build dependencies.
npm ci --include=dev --no-audit --no-fund

# Rebuild tracked web/host entrypoints and the downloadable offline edition
# together so no merge leaves stale asset hashes or reference bundles.
npm run build
npm run build:single
npm run test:bundles
