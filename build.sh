#!/bin/bash

# Build script for Loops Chrome Extension
# Creates a production-ready zip file for Chrome Web Store submission

VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
OUTPUT_FILE="dist/loops-extension-v${VERSION}.zip"

echo "🚀 Building Loops Extension v${VERSION}"

# Create dist directory if it doesn't exist
mkdir -p dist

# Remove old zip if it exists
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo "📦 Removed old build"
fi

# Create the zip file, excluding development files
zip -r "$OUTPUT_FILE" . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "dist/*" \
    -x "scripts/*" \
    -x "*.sh" \
    -x "*.md" \
    -x "package*.json" \
    -x "eslint.config.js" \
    -x ".prettierrc" \
    -x ".husky/*" \
    -x "test-*.js" \
    -x ".github/*" \
    -x "IDEAS.md" \
    -x "TEST.md" \
    -x "spec.md" \
    -x "*.log" \
    -x ".DS_Store" \
    -x "Thumbs.db"

echo "✅ Build complete: $OUTPUT_FILE"
echo "📊 File size: $(du -h "$OUTPUT_FILE" | cut -f1)"

# List what's included
echo ""
echo "📋 Package contents:"
unzip -l "$OUTPUT_FILE" | head -20
echo "..."
echo ""
echo "Ready for Chrome Web Store submission! 🎉"