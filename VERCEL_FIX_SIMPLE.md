# Vercel Build Fix - Simple Solution

## Problem
Vercel was trying to run `build:packages` from the `frontend` directory, but this script is in the root `package.json`.

## Solution

The `frontend/package.json` has a `prebuild` hook that automatically runs before `npm run build`. This hook will:
1. Go to the parent directory (project root)
2. Run `npm run build:packages`
3. Then Next.js build runs automatically

## Vercel Settings

**In Vercel Dashboard:**

1. Go to Project Settings > General
2. Set **Root Directory:** `frontend`
3. **Build Command:** (leave empty or use `npm run build`)
4. **Output Directory:** `.next`
5. **Install Command:** `cd .. && npm install && npm install`

The `prebuild` script will handle building packages automatically.

## Alternative: Use Project Root

If you prefer to set root directory to project root:

1. Set **Root Directory:** `.` (project root)
2. **Build Command:** `cd frontend && npm run build`
3. **Output Directory:** `frontend/.next`
4. **Install Command:** `npm install`

## How It Works

The `prebuild` script in `frontend/package.json`:
```json
"prebuild": "cd .. && npm run build:packages"
```

This automatically runs before `npm run build`, so:
1. Vercel runs `npm run build` in frontend directory
2. npm automatically runs `prebuild` first
3. `prebuild` goes to root and builds packages
4. Then `build` runs and builds Next.js

## Testing

Test locally:
```bash
cd frontend
npm run build
```

This should:
1. Run `prebuild` (builds packages)
2. Run `build` (builds Next.js)
