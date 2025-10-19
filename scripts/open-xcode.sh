#!/bin/bash
# Script pour ouvrir le projet dans Xcode avec Node 20

export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

echo "✅ Using Node $(node --version)"

cd ios

echo "📦 Installing CocoaPods dependencies..."
pod install

if [ $? -eq 0 ]; then
    echo "✅ Pods installed successfully"
    echo "🚀 Opening Xcode..."
    open mobileapp.xcworkspace
else
    echo "❌ pod install failed"
    exit 1
fi
