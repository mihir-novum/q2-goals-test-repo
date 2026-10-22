#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=".bypass-audit.log"
USER=$(git config user.name || printf 'unknown')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "⚠️  INITIATING HOOK BYPASS"
read -r -p "Enter reason for bypassing Git hooks: " REASON

if [ -z "$REASON" ]; then
    echo "❌ Reason cannot be empty. Aborting."
    exit 1
fi

printf '[%s] %s bypassed commit hooks.\nReason: %s\n\n' \
    "$TIMESTAMP" "$USER" "$REASON" >> "$LOG_FILE"
git add -- "$LOG_FILE"

echo "📝 Bypass logged to $LOG_FILE. Proceeding with commit..."

git -c core.hooksPath=/dev/null commit --no-verify "$@"