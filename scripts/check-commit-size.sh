#!/bin/bash
MAX_FILES=15
MAX_LINES=3000

STATS=$(git diff --cached --numstat)

# Handle empty staging area
if [ -z "$STATS" ]; then
  exit 0
fi

FILE_COUNT=$(echo "$STATS" | grep -c .)
LINE_COUNT=$(echo "$STATS" | awk '{sum += $1 + $2} END {print sum+0}')

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
