#!/usr/bin/env bash
set -euo pipefail

# Read current version from Cargo.toml
CURRENT=$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "//;s/"//')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Get last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ -z "$LAST_TAG" ]]; then
  RANGE="HEAD"
else
  RANGE="${LAST_TAG}..HEAD"
fi

# Commits since last tag, excluding release/readme automation commits
COMMITS=$(git log "$RANGE" --pretty=format:"%s" 2>/dev/null \
  | grep -v "^chore: release" \
  | grep -v "^docs: update README for v" \
  || true)

if [[ -z "$COMMITS" ]]; then
  echo "No releasable commits found. Skipping."
  echo "should_release=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

BUMP_TYPE="${BUMP_TYPE:-auto}"

if [[ "$BUMP_TYPE" == "auto" ]]; then
  BUMP="none"
  while IFS= read -r line; do
    if [[ "$line" == *"BREAKING CHANGE"* ]] || echo "$line" | grep -qE '^[a-z]+!:'; then
      BUMP="major"
      break
    elif echo "$line" | grep -qE '^feat(\([^)]+\))?:'; then
      [[ "$BUMP" != "major" ]] && BUMP="minor"
    elif echo "$line" | grep -qE '^(fix|perf|refactor)(\([^)]+\))?:'; then
      [[ "$BUMP" == "none" ]] && BUMP="patch"
    elif echo "$line" | grep -qE '^(chore|docs|ci|style|test|build)(\([^)]+\))?:'; then
      [[ "$BUMP" == "none" ]] && BUMP="patch"
    fi
  done <<< "$COMMITS"
else
  BUMP="$BUMP_TYPE"
fi

if [[ "$BUMP" == "none" ]]; then
  echo "No version bump triggered by commits. Skipping."
  echo "should_release=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "Bumping ${CURRENT} -> ${NEW_VERSION} (${BUMP})"

# Update Cargo.toml
sed -i "s/^version = \"${CURRENT}\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i "s/\"version\": \"${CURRENT}\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json

# Update Cargo.lock (package version entry only)
python3 - <<PYEOF
content = open('src-tauri/Cargo.lock').read()
old = 'name = "sonar"\nversion = "${CURRENT}"'
new = 'name = "sonar"\nversion = "${NEW_VERSION}"'
open('src-tauri/Cargo.lock', 'w').write(content.replace(old, new, 1))
PYEOF

echo "should_release=true" >> "$GITHUB_OUTPUT"
echo "version=${NEW_VERSION}" >> "$GITHUB_OUTPUT"
echo "tag=v${NEW_VERSION}" >> "$GITHUB_OUTPUT"
echo "bump=${BUMP}" >> "$GITHUB_OUTPUT"
