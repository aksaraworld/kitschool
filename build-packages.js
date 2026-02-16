/**
 * Cross-platform build script for Aksara Framework packages
 * Runs from repo root so root's typescript is used (works in Vercel/npm workspaces)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const packages = ['core', 'api', 'context', 'hooks', 'ui', 'formatters', 'firebase'];

console.log('Building Aksara Framework packages...\n');

let hasError = false;

for (const pkg of packages) {
  console.log(`Building @aksara/${pkg}...`);
  const packagePath = path.join(rootDir, 'packages', pkg);
  const tsconfigPath = path.join(packagePath, 'tsconfig.json');

  if (!fs.existsSync(packagePath)) {
    console.error(`✗ Package directory not found: ${packagePath}`);
    hasError = true;
    continue;
  }
  if (!fs.existsSync(tsconfigPath)) {
    console.error(`✗ tsconfig.json not found in ${packagePath}`);
    hasError = true;
    continue;
  }

  try {
    // Install dependencies (for workspace deps / peer deps)
    console.log('  Installing dependencies...');
    execSync('npm install --legacy-peer-deps', {
      cwd: packagePath,
      stdio: 'inherit'
    });

    // Use root's typescript/bin/tsc directly (avoids npx resolving to wrong "tsc" package on Vercel)
    const tscBin = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');
    if (!fs.existsSync(tscBin)) {
      throw new Error('TypeScript not found at root. Run: npm install (with devDependencies) from repo root.');
    }
    console.log('  Building package...');
    execSync(`node "${tscBin}" --project "${tsconfigPath}"`, {
      cwd: rootDir,
      stdio: 'inherit'
    });

    console.log(`✓ @aksara/${pkg} built successfully\n`);
  } catch (error) {
    console.error(`✗ Failed to build @aksara/${pkg}`);
    console.error(error.message);
    hasError = true;
  }
}

if (hasError) {
  console.error('\nBuild failed with errors!');
  process.exit(1);
}

console.log('Build complete!');
