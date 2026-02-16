/**
 * Cross-platform build script for Aksara Framework packages.
 * Uses TypeScript from root or from the package's node_modules (each package has typescript in devDependencies).
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const packages = ['core', 'api', 'context', 'hooks', 'ui', 'formatters', 'firebase'];

function findTscBin() {
  const atRoot = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');
  if (fs.existsSync(atRoot)) return atRoot;
  for (const pkg of packages) {
    const inPackage = path.join(rootDir, 'packages', pkg, 'node_modules', 'typescript', 'bin', 'tsc');
    if (fs.existsSync(inPackage)) return inPackage;
  }
  return null;
}

console.log('Building Aksara Framework packages...\n');

let hasError = false;
let cachedTscBin = null;

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
    console.log('  Installing dependencies...');
    execSync('npm install --legacy-peer-deps', {
      cwd: packagePath,
      stdio: 'inherit'
    });

    const tscBin = cachedTscBin || findTscBin();
    if (!tscBin) {
      throw new Error('TypeScript not found. Each package has typescript in devDependencies; npm install should install it.');
    }
    if (!cachedTscBin) cachedTscBin = tscBin;

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
