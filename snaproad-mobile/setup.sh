#!/bin/bash

# SnapRoad Mobile - Auto Setup Script
# Run this after cloning from GitHub: bash setup.sh

# 1. Fix permissions for the current user
echo "Fixing folder permissions..."
sudo chown -R $(whoami) . ~/.npm 2>/dev/null

# 2. Clean old artifacts
echo "Cleaning old build files..."
rm -rf node_modules package-lock.json .expo

# 3. Remove the problematic Expo.fx line from index.js automatically
if [ -f "index.js" ]; then
  echo "Cleaning index.js..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "/import 'expo\/build\/Expo.fx';/d" index.js
  else
    sed -i "/import 'expo\/build\/Expo.fx';/d" index.js
  fi
fi

# 4. Install dependencies with the legacy-peer-deps flag
echo "Installing dependencies..."
npm install --legacy-peer-deps

# 5. Force align Expo SDK 54 components
echo "Aligning Expo SDK 54 components..."
npx expo install --fix -- --force

echo ""
echo "Setup complete! Run 'npx expo start --go' to begin."
