#!/bin/bash

echo "🚀 GemAI Pro - Expo Deployment Helper"
echo "======================================"
echo ""
echo "Choose your deployment method:"
echo ""
echo "1. Share via Expo Go (Fastest - 30 seconds)"
echo "2. Build Android APK (Preview - Shareable)"
echo "3. Build iOS (Preview - Shareable)"
echo "4. Build Production (App Stores)"
echo "5. Publish Over-the-Air Update"
echo "6. Login to Expo"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
  1)
    echo "Starting Expo development server..."
    echo "Scan the QR code with Expo Go app!"
    npm start
    ;;
  2)
    echo "Building Android APK (this takes 10-15 minutes)..."
    npm run build:android:preview
    ;;
  3)
    echo "Building iOS (this takes 10-15 minutes)..."
    npm run build:ios:preview
    ;;
  4)
    echo "Building for production (both platforms)..."
    npm run build:all
    ;;
  5)
    read -p "Enter update message: " message
    npx eas-cli update --branch production --message "$message"
    ;;
  6)
    echo "Logging in to Expo..."
    npm run eas:login
    ;;
  *)
    echo "Invalid choice"
    ;;
esac


