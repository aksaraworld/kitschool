# Vercel Build Fix

## Problem
Vercel was trying to run `build:packages` from the `frontend` directory, but this script is in the root `package.json`.

## Solution

### Option 1: Use Root Directory (Recommended)

In Vercel dashboard, set:
- **Root Directory:** `.` (project root, not `frontend`)
- **Build Command:** `npm run build:packages && cd frontend && npm run build`
- **Output Directory:** `frontend/.next`
- **Install Command:** `npm install`

This way, Vercel will:
1. Run from project root
2. Install all dependencies (including workspace packages)
3. Build packages
4. Build frontend

### Option 2: Update vercel.json

The `vercel.json` has been updated to handle the directory change, but Vercel might still need the root directory set in the dashboard.

### Option 3: Use Frontend Prebuild Hook

The `frontend/package.json` now has a `prebuild` script that will automatically build packages before building Next.js. However, this requires the packages to be accessible from the frontend directory.

## Recommended Vercel Settings

**Project Settings:**
- Framework Preset: Next.js
- Root Directory: `.` (project root)
- Build Command: `npm run build:packages && cd frontend && npm run build`
- Output Directory: `frontend/.next`
- Install Command: `npm install`

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Your backend API URL
- `NEXT_PUBLIC_FIREBASE_*` - Firebase config (if using Firebase)

## Alternative: Simpler Build Command

If the above doesn't work, you can simplify by building packages in the prebuild hook:

**Build Command:** `cd frontend && npm run build`

The `prebuild` script in `frontend/package.json` will automatically run `build:packages` first.

## Testing Locally

Test the exact build process:
```bash
# From project root
npm install
npm run build:packages
cd frontend
npm install
npm run build
```

If this works locally, it should work on Vercel with the correct root directory setting.
