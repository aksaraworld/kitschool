# GitHub Setup Guide

## Step 1: Configure Git (Required)

Before committing, you need to set your Git identity:

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

Or set globally for all repositories:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 2: Create Initial Commit

After configuring Git, create the initial commit:

```bash
git add .
git commit -m "Initial commit: Cognifa School Management System with Aksara Framework integration

- Complete school management system with multi-tenant SaaS support
- Integrated Aksara Framework (API client, context, hooks, UI components)
- Light blue/dark blue theme
- Full CRUD operations for users, classes, attendance, payments, schedules
- Role-based access control (8 roles)
- Demo accounts included"
```

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `cognifa` (or your preferred name)
3. Description: "School Management System SaaS built with Next.js, Express.js, and Aksara Framework"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 4: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/cognifa.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/cognifa.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
gh repo create cognifa --public --source=. --remote=origin --push
```

## What's Included

✅ Complete source code
✅ Aksara Framework packages
✅ Documentation
✅ Build scripts
✅ Demo accounts information

## What's Excluded (via .gitignore)

❌ node_modules/
❌ .env files
❌ dist/ and build folders
❌ .next/ folder
❌ Temporary files
❌ aksara-framework-temp/ (temporary clone)

## Next Steps After Push

1. Add a README.md if needed
2. Set up GitHub Actions for CI/CD (optional)
3. Add repository description and topics
4. Create releases for versions
