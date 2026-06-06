# GitHub Repository Setup

## Repository
**URL:** https://github.com/aksaraworld/cognifa.git

## Next Steps

### 1. Configure Git (if not already done)
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. Create Initial Commit
```bash
git commit -m "Initial commit: Aksara School Management School Management System with Aksara Framework

Features:
- Complete school management system with multi-tenant SaaS support
- Integrated Aksara Framework (API client, context, hooks, UI components)
- Light blue/dark blue theme
- Full CRUD operations for users, classes, attendance, payments, schedules
- Role-based access control (8 roles)
- Demo accounts included
- CORS configured for multiple ports
- TypeScript throughout
- Fixed infinite loop in useAuth hook"
```

### 3. Push to GitHub
```bash
git push -u origin main
```

If the repository already exists and has content, you may need to:
```bash
# Pull first (if repo has content)
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

Or force push (if you want to overwrite):
```bash
git push -u origin main --force
```

## Repository Information
- **Owner:** aksaraworld
- **Name:** cognifa
- **URL:** https://github.com/aksaraworld/cognifa.git
