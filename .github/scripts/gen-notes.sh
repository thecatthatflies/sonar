#!/usr/bin/env bash
set -euo pipefail

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ -z "$LAST_TAG" ]]; then
  RANGE="HEAD"
else
  RANGE="${LAST_TAG}..HEAD"
fi

# Commits since last tag, stripped of automation commits
COMMITS=$(git log "$RANGE" --pretty=format:"- %s" 2>/dev/null \
  | grep -v "^- chore: release" \
  | grep -v "^- docs: update README for v" \
  || true)

if [[ -z "$COMMITS" ]]; then
  echo "No commits to summarize." > /tmp/release-notes.md
  exit 0
fi

PROMPT="You are writing release notes for Sonar, a cross-platform desktop developer tool (Tauri/Rust) that monitors local ports, runs an embedded browser, terminal, MCP server, and AI integrations. Write concise user-facing release notes from the git commits below. Group into Features, Bug Fixes, and Other (skip empty sections). Use bullet points. Short sentences. Developer tone. No em dashes. Output markdown only, no preamble.

Commits:
${COMMITS}"

# Escape for JSON using jq
PAYLOAD=$(jq -n \
  --arg model "gpt-4.1-nano" \
  --arg prompt "$PROMPT" \
  '{
    model: $model,
    messages: [{ role: "user", content: $prompt }],
    max_tokens: 600,
    temperature: 0.3
  }')

RESPONSE=$(curl -sf -X POST "https://api.navy/v1/chat/completions" \
  -H "Authorization: Bearer ${NAVY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" || echo "")

NOTES=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null || echo "")

if [[ -z "$NOTES" ]]; then
  # Fallback: plain commit list grouped by prefix
  NOTES=$(echo "$COMMITS" | sort)
fi

echo "$NOTES" > /tmp/release-notes.md
echo "Release notes written to /tmp/release-notes.md"
cat /tmp/release-notes.md
