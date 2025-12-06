# GitHub Setup Guide

## Quick Steps to Push to GitHub

### 1. Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Fill in:
   - **Repository name**: `GemAI-Pro` (or your preferred name)
   - **Description**: "Professional gemstone identification and business management app"
   - **Visibility**: Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

### 2. Copy Your Repository URL

After creating, GitHub will show you the repository URL. It will look like:
```
https://github.com/yourusername/GemAI-Pro.git
```

### 3. Push Your Code

Run these commands in your terminal:

```bash
# Navigate to project directory
cd /Users/arpitverma/Downloads/GemstoneIdentifier

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: Complete GemAI Pro app with Supabase integration"

# Add GitHub remote (replace with your actual GitHub URL)
git remote add origin https://github.com/yourusername/GemAI-Pro.git

# Or if you want to replace existing remote:
# git remote set-url origin https://github.com/yourusername/GemAI-Pro.git

# Push to GitHub
git push -u origin main
```

## Security Note

✅ **Safe to commit:**
- Supabase anon key in `app.json` (it's meant to be public)
- All source code
- Configuration files

❌ **Already excluded by .gitignore:**
- `node_modules/`
- `.env` files
- Build artifacts
- API keys and secrets

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
gh repo create GemAI-Pro --public --source=. --remote=origin --push
```

## Troubleshooting

### If you get "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/yourusername/GemAI-Pro.git
```

### If you get authentication errors
- Use Personal Access Token instead of password
- Or use SSH: `git@github.com:yourusername/GemAI-Pro.git`

### If branch is named "master" instead of "main"
```bash
git branch -M main
git push -u origin main
```


