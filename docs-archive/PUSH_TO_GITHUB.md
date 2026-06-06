# 🚀 Quick Guide: Push to GitHub

## Step 1: Configure Git (One-time setup)

Run these commands with your information:

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## Step 2: Create Commit

```bash
git commit -m "Initial commit: Aksara School Management School Management System with Aksara Framework

Features:
- Complete school management system with multi-tenant SaaS support
- Integrated Aksara Framework (API client, context, hooks, UI components)
- Light blue/dark blue theme
- Full CRUD operations for users, classes, attendance, payments, schedules
- Role-based access control (8 roles: SaaS Admin, Principal, Staff, Finance, Teacher, Homeroom Teacher, Student, Parent)
- Demo accounts included
- CORS configured for multiple ports
- TypeScript throughout"
```

## Step 3: Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `cognifa` (or your choice)
3. Description: "School Management System SaaS - Next.js + Express.js + Aksara Framework"
4. Choose Public or Private
5. **DO NOT** check "Initialize with README" (we already have files)
6. Click "Create repository"

## Step 4: Push to GitHub

After creating the repo, run:

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/cognifa.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using GitHub CLI

If you have `gh` installed:

```bash
gh repo create cognifa --public --source=. --remote=origin --push
```

## ✅ Done!

Your code is now on GitHub! 🎉
