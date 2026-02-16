# Vercel Deployment Guide

## Issue
Vercel couldn't find `@aksara` packages because they need to be built before the frontend build.

## Solution

### 1. Configuration Files

**`vercel.json`** - Root configuration:
```json
{
  "buildCommand": "npm run build:packages && cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

**`package.json`** - Updated build script:
- `build:packages` now uses `bash ./build-packages.sh` (Linux-compatible for Vercel)
- `build:packages:win` for Windows local development

**`frontend/package.json`** - Added prebuild script:
- `prebuild` automatically runs before `build` to compile packages

### 2. Build Process

Vercel will now:
1. Run `npm install` (installs all dependencies including workspace packages)
2. Run `npm run build:packages` (builds all @aksara packages)
3. Run `cd frontend && npm run build` (builds Next.js app)

### 3. Alternative: Manual Build Command

If you prefer to set the build command in Vercel dashboard:
```
npm run build:packages && cd frontend && npm run build
```

### 4. Environment Variables

Make sure to set these in Vercel:
- `NEXT_PUBLIC_API_URL` - Your backend API URL
- Any other environment variables your app needs

### 5. Root Directory

**Important:** In Vercel dashboard:
- **Root Directory:** Leave empty (project root)
- **Framework Preset:** Next.js
- **Build Command:** (uses vercel.json or set manually)
- **Output Directory:** `frontend/.next`

### 6. Troubleshooting

If build still fails:
1. Check that `build-packages.sh` is executable (should be fine on Vercel)
2. Verify all package `tsconfig.json` files are correct
3. Check that all packages have their dependencies installed
4. Look at Vercel build logs for specific errors

### 7. Local Testing

Test the build locally:
```bash
# From project root
npm run build:packages
cd frontend
npm run build
```

This should match what Vercel does.
