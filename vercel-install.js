#!/usr/bin/env node
/**
 * Vercel install script - Simple and reliable
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Vercel sets root directory to project root, so process.cwd() should be correct
const rootDir = process.cwd();
console.log(`Working directory: ${rootDir}`);

// Check for build-packages.js
const buildScript = path.join(rootDir, 'build-packages.js');
if (!fs.existsSync(buildScript)) {
  console.error(`ERROR: build-packages.js not found at ${buildScript}`);
  console.log('Current directory contents:', fs.readdirSync(rootDir).join(', '));
  process.exit(1);
}

console.log('Found build-packages.js, building packages...');
try {
  execSync('node build-packages.js', { 
    stdio: 'inherit', 
    cwd: rootDir,
    env: process.env
  });
  console.log('✓ Packages built successfully');
} catch (error) {
  console.error('✗ Failed to build packages');
  process.exit(1);
}

// Install frontend dependencies
const frontendDir = path.join(rootDir, 'frontend');
if (!fs.existsSync(frontendDir)) {
  console.error(`ERROR: Frontend directory not found at ${frontendDir}`);
  process.exit(1);
}

console.log('Installing frontend dependencies...');
try {
  execSync('npm install', { 
    stdio: 'inherit', 
    cwd: frontendDir,
    env: process.env
  });
  console.log('✓ Frontend dependencies installed');
} catch (error) {
  console.error('✗ Failed to install frontend dependencies');
  process.exit(1);
}

console.log('✓ Install complete!');
