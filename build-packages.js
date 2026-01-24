/**
 * Cross-platform build script for Aksara Framework packages
 * Works on Windows, Linux, and Mac
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const packages = ['core', 'api', 'context', 'hooks', 'ui', 'formatters', 'firebase'];

console.log('Building Aksara Framework packages...\n');

let hasError = false;

for (const pkg of packages) {
  console.log(`Building @aksara/${pkg}...`);
  const packagePath = path.join(__dirname, 'packages', pkg);
  
  if (!fs.existsSync(packagePath)) {
    console.error(`✗ Package directory not found: ${packagePath}`);
    hasError = true;
    continue;
  }

  try {
    // Install dependencies
    console.log('  Installing dependencies...');
    execSync('npm install --legacy-peer-deps', {
      cwd: packagePath,
      stdio: 'inherit'
    });

    // Build package
    console.log('  Building package...');
    execSync('npx tsc --project tsconfig.json', {
      cwd: packagePath,
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
