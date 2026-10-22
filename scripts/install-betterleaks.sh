#!/usr/bin/env bash
set -e

VERSION="v1.6.1" # Target betterleaks version
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Normalize architecture mapping for Go binaries
if [ "$ARCH" = "x86_64" ]; then ARCH="x64"; fi
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then ARCH="arm64"; fi
if [ "$ARCH" = "amd64" ]; then ARCH="x64"; fi

echo "🔍 Detected OS: $OS | Arch: $ARCH"
echo "📥 Downloading Betterleaks $VERSION..."

URL="https://github.com/betterleaks/betterleaks/releases/download/${VERSION}/betterleaks_${VERSION#v}_${OS}_${ARCH}.tar.gz"

mkdir -p .bin
HTTP_STATUS=$(curl -sL -w "%{http_code}" "$URL" -o .bin/betterleaks.tar.gz)

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "302" ]; then
    echo "❌ Failed to download Betterleaks! HTTP Status: $HTTP_STATUS"
    exit 1
fi

tar -xzf .bin/betterleaks.tar.gz -C .bin/ betterleaks
rm .bin/betterleaks.tar.gz
chmod +x .bin/betterleaks

echo "✅ Betterleaks installed locally to ./.bin/betterleaks"