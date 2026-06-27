#!/usr/bin/env bash
set -euo pipefail

TRIPLE=$(rustc -vV | grep '^host' | cut -d' ' -f2)
OUT="../../binaries/port-scanner-${TRIPLE}"

echo "building port-scanner → ${OUT}"
go build -ldflags="-s -w" -o "${OUT}" .
echo "done ($(du -sh "${OUT}" | cut -f1))"
