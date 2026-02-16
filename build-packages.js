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

    // Run tsc from repo root so root's node_modules/typescript is used (fixes "tsc: command not found" on Vercel)
    console.log('  Building package...');
    execSync(`npx tsc --project "${tsconfigPath}"`, {
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
