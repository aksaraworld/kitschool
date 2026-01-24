# Aksara Framework Setup Guide

## Quick Start

### 1. Build Aksara Packages

**Option A: Using PowerShell Script (Windows)**
```powershell
.\build-packages.ps1
```

**Option B: Using Bash Script (Linux/Mac)**
```bash
chmod +x build-packages.sh
./build-packages.sh
```

**Option C: Manual Build**
```bash
# Build each package individually
cd packages/core && npm install --legacy-peer-deps && npx tsc && cd ../..
cd packages/api && npm install --legacy-peer-deps && npx tsc && cd ../..
cd packages/context && npm install --legacy-peer-deps && npx tsc && cd ../..
cd packages/hooks && npm install --legacy-peer-deps && npx tsc && cd ../..
cd packages/ui && npm install --legacy-peer-deps && npx tsc && cd ../..
cd packages/formatters && npm install --legacy-peer-deps && npx tsc && cd ../..
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Run Development Server

```bash
# From project root
npm run dev
```

Or separately:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Troubleshooting

### Issue: "Cannot find module '@aksara/...'"

**Solution:**
1. Ensure packages are built (run `build-packages.ps1` or `build-packages.sh`)
2. Check that `dist/` folders exist in each package
3. Reinstall frontend dependencies: `cd frontend && rm -rf node_modules && npm install`

### Issue: "TypeScript not found"

**Solution:**
- The build script uses `npx tsc` which will use the local TypeScript if installed, or download it temporarily
- Alternatively, install TypeScript globally: `npm install -g typescript`
- Or install in each package: `cd packages/[package] && npm install typescript --save-dev`

### Issue: "Unsupported URL Type workspace:*"

**Solution:**
- This happens if npm workspaces aren't properly configured
- The packages now use `file:../` paths instead of `workspace:*`
- If you still see this, check `package.json` files in packages directory

### Issue: Build fails with type errors

**Solution:**
1. Ensure all dependencies are installed in each package
2. Check that peer dependencies (like React) are available
3. Try building packages in order: core → api/context/hooks → ui/formatters

## Package Build Order

Build packages in this order for best results:

1. **@aksara/core** - Base utilities (no dependencies)
2. **@aksara/api** - API client (depends on core)
3. **@aksara/context** - Context utilities (depends on core)
4. **@aksara/hooks** - React hooks (depends on core)
5. **@aksara/ui** - UI components (depends on core)
6. **@aksara/formatters** - Formatting utilities (depends on core)

## Verification

After building, verify the packages:

```bash
# Check if dist folders exist
ls packages/*/dist

# Should show:
# packages/api/dist
# packages/core/dist
# packages/context/dist
# packages/hooks/dist
# packages/ui/dist
# packages/formatters/dist
```

## Development Workflow

### Making Changes to Aksara Packages

1. Edit source files in `packages/[package]/src/`
2. Rebuild the package: `cd packages/[package] && npx tsc`
3. Changes will be reflected in frontend (no need to reinstall)

### Watch Mode (Optional)

For active development on packages, you can use watch mode:

```bash
cd packages/[package]
npm run dev  # Runs tsc --watch
```

## Production Build

For production:

```bash
# Build all packages
npm run build:packages

# Build frontend
cd frontend
npm run build
```

## Notes

- The packages use TypeScript and need to be compiled before use
- The frontend uses the compiled `dist/` folders from packages
- Changes to package source require rebuilding
- All packages are linked via `file:../` paths in `package.json`
