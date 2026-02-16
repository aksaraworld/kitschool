# 🔧 Vercel Build Troubleshooting Guide

## Current Status

✅ **Packages Building Successfully** - The install command is working!
- `cd /vercel/path0 && node build-packages.js` ✅
- All packages are being built

❌ **Next.js Build Failing** - The build command is failing
- `cd frontend && npm run build` ❌

## How to Find the Exact Error

1. **In Vercel Dashboard:**
   - Go to your deployment
   - Click on the failed build
   - Scroll down to see the full build logs
   - Look for error messages after "Building @aksara/core..." completes

2. **Common Error Patterns:**
   - TypeScript errors: Look for `error TS...`
   - Module not found: Look for `Cannot find module`
   - Environment variable errors: Look for `NEXT_PUBLIC_*` warnings
   - Import errors: Look for import/export issues

## Common Fixes

### 1. Missing Environment Variables

If you see errors about Firebase or API URLs:

**Add these in Vercel Dashboard → Settings → Environment Variables:**

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWzyPLXe9w9QEjtPoB293WRJe9ty2o6z8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cognifa-16209.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cognifa-16209
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cognifa-16209.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=760299044391
NEXT_PUBLIC_FIREBASE_APP_ID=1:760299044391:web:adf809d8c2563f8444d802
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

**Important:** 
- Check "Production", "Preview", and "Development"
- Redeploy after adding variables

### 2. TypeScript Errors

If you see TypeScript compilation errors:

```bash
# Test locally first
cd frontend
npm run build
```

Fix any TypeScript errors locally, then commit and push.

### 3. Missing Dependencies

If packages aren't found:

```bash
# Ensure packages are built
node build-packages.js

# Then test frontend build
cd frontend
npm install
npm run build
```

### 4. Import Errors

If you see module resolution errors, check:
- `tsconfig.json` paths are correct
- Package exports in `package.json` files
- File paths are correct

## Quick Debug Steps

1. **Check Build Logs:**
   - Look for the exact error message
   - Note which file/line is failing
   - Check if it's a TypeScript, import, or runtime error

2. **Test Locally:**
   ```bash
   # Build packages
   node build-packages.js
   
   # Build frontend
   cd frontend
   npm install
   npm run build
   ```

3. **Check Environment Variables:**
   - Verify all `NEXT_PUBLIC_*` variables are set in Vercel
   - Check they're enabled for Production/Preview/Development

4. **Verify Package Builds:**
   - Check `packages/*/dist/` directories exist
   - Verify TypeScript compiled successfully

## Next Steps

1. **Get the Full Error:**
   - Copy the complete error message from Vercel logs
   - Share it so we can fix the specific issue

2. **Check Common Issues:**
   - Missing environment variables
   - TypeScript errors in frontend code
   - Import path issues
   - Missing dependencies

3. **Test Locally:**
   - Reproduce the error locally
   - Fix it
   - Commit and push

## Current Configuration

**vercel.json:**
```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd /vercel/path0 && node build-packages.js && cd frontend && npm install",
  "framework": "nextjs"
}
```

**Root Directory:** `.` (project root)

This configuration is correct. The issue is likely:
- Missing environment variables
- TypeScript/build errors in frontend code
- Import/module resolution issues

## Need Help?

Share the complete error message from Vercel build logs, and I can help fix the specific issue!
