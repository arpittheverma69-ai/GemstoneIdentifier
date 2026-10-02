#!/bin/bash

echo "🔧 Fixing theme error - Full reset..."

# Stop any running Metro bundler
pkill -f "expo start" || true
pkill -f "metro" || true

# Clear all caches
echo "Clearing caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true

echo "✅ Caches cleared!"
echo ""
echo "Now restart with: npm start -- --clear"



