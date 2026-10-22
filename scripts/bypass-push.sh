#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=".bypass-audit.log"
USER=$(git config user.name || printf 'unknown')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "⚠️  INITIATING PRE-PUSH HOOK BYPASS"
read -r -p "Enter reason for bypassing Git hooks: " REASON

if [ -z "$REASON" ]; then
    echo "❌ Reason cannot be empty. Aborting."
    exit 1
fi

if ! git diff --cached --quiet; then
    echo "❌ Commit or unstage existing staged changes before recording a push bypass."
    exit 1
fi

printf '[%s] %s bypassed push hooks.\nReason: %s\n\n' \
    "$TIMESTAMP" "$USER" "$REASON" >> "$LOG_FILE"
git add -- "$LOG_FILE"
git -c core.hooksPath=/dev/null commit --no-verify \
    -m "chore(audit): record pre-push hook bypass"
git push --no-verify "$@"
