# 🔧 Fix Module Not Found Error

## Problem
```
Error: Cannot find module '@aksara/firebase'
```

## Solution

The packages need to be built before running the backend. Run this in your terminal:

```powershell
# From project root
node build-packages.js
```

This will build all packages including `@aksara/firebase`.

## After Building

Then run the backend:
```powershell
cd backend
npm run dev
```

## For Vercel

Vercel will automatically build packages during deployment because:
- `vercel.json` has: `"installCommand": "node build-packages.js && cd frontend && npm install"`
- This builds packages before installing frontend dependencies

## Quick Fix Commands

```powershell
# Build all packages
node build-packages.js

# Then start backend
cd backend
npm run dev
```

---

**Note:** If you see network errors when building, make sure you have internet access. The build script needs to download npm packages.
