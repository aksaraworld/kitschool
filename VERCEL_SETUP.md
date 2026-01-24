# Vercel Deployment Setup

## Configuration

### 1. vercel.json
Located in the project root. Configures:
- Build command to compile packages first
- Output directory for Next.js
- Framework preset

### 2. Project Settings in Vercel Dashboard

When setting up the project in Vercel:

**General Settings:**
- **Framework Preset:** Next.js
- **Root Directory:** Leave empty (project root) OR set to `.`
- **Build Command:** (uses vercel.json) OR manually: `npm run build:packages && cd frontend && npm run build`
- **Output Directory:** `frontend/.next`
- **Install Command:** `npm install`

**Environment Variables:**
Add these in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://your-api.vercel.app` or `http://localhost:5000` for development)

### 3. Build Process

Vercel will:
1. Install dependencies: `npm install` (installs all workspace packages)
2. Build packages: `npm run build:packages` (compiles TypeScript packages)
3. Build frontend: `cd frontend && npm run build` (builds Next.js)

### 4. Troubleshooting

**Error: Module not found '@aksara/...'**
- Ensure `build:packages` runs before frontend build
- Check that packages have `dist/` folders after build
- Verify `package.json` has correct `file:../packages/...` paths

**Error: TypeScript not found**
- Packages have TypeScript in devDependencies
- `npx tsc` should work after `npm install`

**Error: Build script fails**
- Check `build-packages.sh` is executable
- Verify all package `tsconfig.json` files are valid
- Check build logs in Vercel dashboard

### 5. Alternative: Manual Build Command

If vercel.json doesn't work, set in Vercel dashboard:
```
npm run build:packages && cd frontend && npm run build
```

### 6. Local Testing

Test the exact build process locally:
```bash
# From project root
npm install
npm run build:packages
cd frontend
npm run build
```

If this works locally, it should work on Vercel.
