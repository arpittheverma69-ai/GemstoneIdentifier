#!/bin/bash

# Script to push GemAI Pro to GitHub
# Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME REPO_NAME

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME REPO_NAME"
  echo "Example: ./push-to-github.sh arpitverma GemAI-Pro"
  exit 1
fi

GITHUB_USER=$1
REPO_NAME=$2
GITHUB_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "🚀 Pushing GemAI Pro to GitHub..."
echo "Repository: ${GITHUB_URL}"
echo ""

# Check if remote already exists
if git remote get-url origin > /dev/null 2>&1; then
  echo "⚠️  Remote 'origin' already exists"
  read -p "Do you want to replace it? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git remote set-url origin ${GITHUB_URL}
    echo "✅ Updated remote URL"
  else
    echo "Using existing remote. To add GitHub as a different remote, use:"
    echo "  git remote add github ${GITHUB_URL}"
    exit 0
  fi
else
  git remote add origin ${GITHUB_URL}
  echo "✅ Added GitHub remote"
fi

# Ensure repository is initialized and on main branch
if [ ! -d ".git" ]; then
  echo "📦 Initializing git repository..."
  git init
fi

current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ -z "$current_branch" ]; then
  echo "🔀 Creating and switching to 'main' branch..."
  git checkout -b main
elif [ "$current_branch" != "main" ]; then
  echo "🔀 Switching to 'main' branch..."
  git checkout -B main
fi

# Stage and commit any changes
echo ""
echo "📝 Staging files..."
git add -A

if git diff --cached --quiet; then
  echo "ℹ️ No changes to commit."
else
  commit_msg="chore: initial push to GitHub"
  echo "✅ Committing changes: ${commit_msg}"
  git commit -m "${commit_msg}"
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully pushed to GitHub!"
  echo "🌐 View your repo at: ${GITHUB_URL}"
else
  echo ""
  echo "❌ Push failed. Make sure:"
  echo "   1. The repository exists on GitHub"
  echo "   2. You have push access"
  echo "   3. You're authenticated (use Personal Access Token or SSH)"
fi

