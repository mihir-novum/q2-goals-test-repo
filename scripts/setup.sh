#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting Project Setup..."

echo "📦 1. Installing dependencies with pnpm..."
if ! command -v pnpm >/dev/null 2>&1; then
    echo "❌ pnpm is not installed. Please install it globally first."
    exit 1
fi
pnpm install --frozen-lockfile

echo "🔒 2. Installing Betterleaks locally..."
if [ -x ".bin/betterleaks" ]; then
    echo "✅ Betterleaks is already installed."
else
    ./scripts/install-betterleaks.sh
fi

echo "🪝 3. Checking Git hooks..."
pnpm exec husky
chmod +x .husky/pre-commit .husky/pre-push

echo "✅ Setup complete! You are ready to develop in a secure environment."