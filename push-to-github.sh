#!/bin/bash

# Script: Push GemstoneIdentifier to GitHub on main branch
# This script initializes git, sets the remote to the provided URL, commits changes, and pushes to main.

GITHUB_USER="arpittheverma69-ai"
REPO_NAME="GemstoneIdentifier"
GITHUB_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "Pushing ${REPO_NAME} to GitHub..."
echo "Remote: ${GITHUB_URL}"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
fi

# Ensure we are on main branch
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ -z "$current_branch" ]; then
  echo "Creating and switching to 'main' branch..."
  git checkout -b main
elif [ "$current_branch" != "main" ]; then
  echo "Switching to 'main' branch..."
  git checkout -B main
fi

# Configure remote
if git remote get-url origin > /dev/null 2>&1; then
  echo "Updating existing 'origin' remote URL..."
  git remote set-url origin "${GITHUB_URL}"
else
  echo "Adding 'origin' remote..."
  git remote add origin "${GITHUB_URL}"
fi

# Stage and commit
echo ""
echo "Staging files..."
git add -A

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  commit_msg="chore: initial push to GitHub"
  echo "Committing changes: ${commit_msg}"
  git commit -m "${commit_msg}"
fi

# Push
echo ""
echo "Pushing to GitHub (branch: main)..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "Successfully pushed to GitHub!"
  echo "View your repo at: ${GITHUB_URL}"
else
  echo ""
  echo "Push failed. Make sure:"
  echo "  1. The repository exists on GitHub"
  echo "  2. You have push access"
  echo "  3. You're authenticated (use Personal Access Token or SSH)"
fi


