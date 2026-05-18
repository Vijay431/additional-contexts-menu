#!/bin/bash
MAX_FILES=10
MAX_LINES=400

# Default excludes file (relative to repo root). Override with --excludes <path>.
EXCLUDES_FILE="scripts/commit-size-excludes.txt"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --excludes)
      if [[ -n "$2" && "$2" != -* ]]; then
        EXCLUDES_FILE="$2"
        shift 2
      else
        echo "Error: --excludes requires a file path"
        exit 1
      fi
      ;;
    *)
      shift
      ;;
  esac
done

STATS=$(git diff --cached --numstat)

# Handle empty staging area
if [ -z "$STATS" ]; then
  exit 0
fi

# Build exclusion pattern from file (skip blank lines and # comments)
if [ -f "$EXCLUDES_FILE" ]; then
  PATTERN=$(grep -v -E '^\s*(#|$)' "$EXCLUDES_FILE" | paste -sd '|' -)
  if [ -n "$PATTERN" ]; then
    FILTERED=$(printf '%s\n' "$STATS" | grep -v -E "$PATTERN")
  else
    FILTERED="$STATS"
  fi
else
  FILTERED="$STATS"
fi

FILE_COUNT=$(printf '%s\n' "$FILTERED" | grep -c . 2>/dev/null || true)
LINE_COUNT=$(printf '%s\n' "$FILTERED" | awk '{sum += $1 + $2} END {print sum+0}')

FAILED=0
if [ "$FILE_COUNT" -gt "$MAX_FILES" ]; then
  echo "✗ Too many files staged ($FILE_COUNT > $MAX_FILES max). Split into smaller commits."
  FAILED=1
fi
if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
  echo "✗ Too many lines changed ($LINE_COUNT > $MAX_LINES max). Split into smaller commits."
  FAILED=1
fi
exit $FAILED
