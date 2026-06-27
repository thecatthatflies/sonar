#!/usr/bin/env bash
set -euo pipefail

TRIPLE=$(rustc -vV | grep '^host' | cut -d' ' -f2)
BINARIES="../../binaries"

build() {
  local name=$1 pkg=$2
  local out="${BINARIES}/${name}-${TRIPLE}"
  echo "  building ${name} → ${out}"
  go build -ldflags="-s -w" -o "${out}" "./${pkg}"
  echo "    $(du -sh "${out}" | cut -f1)"
}

mkdir -p "${BINARIES}"
build "port-scanner" "cmd/port-scanner"
build "mcp-server"   "cmd/mcp-server"
echo "done"
