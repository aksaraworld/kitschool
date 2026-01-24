# ⚡ Quick Push to GitHub

## 1. Configure Git (First time only)

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## 2. Commit

```bash
git commit -m "Initial commit: Cognifa School Management System with Aksara Framework"
```

## 3. Create GitHub Repo & Push

**Option A: Using GitHub Website**
1. Go to https://github.com/new
2. Name: `cognifa`
3. **Don't** initialize with README
4. Click "Create repository"
5. Then run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/cognifa.git
git branch -M main
git push -u origin main
```

**Option B: Using GitHub CLI**
```bash
gh repo create cognifa --public --source=. --remote=origin --push
```

## ✅ Done!

Your code is now on GitHub! 🎉
