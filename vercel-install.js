#!/usr/bin/env node
/**
 * Vercel install script
 * Finds project root and builds packages, then installs frontend dependencies
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find project root (where build-packages.js exists)
function findProjectRoot() {
  // Start from current working directory (Vercel sets this to project root)
  let currentDir = process.cwd();
  
  // Try to find build-packages.js by going up the directory tree
  let lastDir = '';
  while (currentDir !== lastDir) {
    const buildScript = path.join(currentDir, 'build-packages.js');
    if (fs.existsSync(buildScript)) {
      return currentDir;
    }
    lastDir = currentDir;
    currentDir = path.dirname(currentDir);
  }
  
  // If not found, try __dirname (where this script is located)
  try {
    const scriptDir = __dirname;
    const buildScript = path.join(scriptDir, 'build-packages.js');
    if (fs.existsSync(buildScript)) {
      return scriptDir;
    }
  } catch (e) {
    // __dirname might not be available
  }
  
  // Last resort: return current directory
  return process.cwd();
}

const projectRoot = findProjectRoot();
console.log(`Project root: ${projectRoot}`);

// Build packages
console.log('Building packages...');
try {
  process.chdir(projectRoot);
  execSync('node build-packages.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to build packages:', error.message);
  process.exit(1);
}

// Install frontend dependencies
console.log('Installing frontend dependencies...');
try {
  const frontendDir = path.join(projectRoot, 'frontend');
  if (!fs.existsSync(frontendDir)) {
    throw new Error('Frontend directory not found');
  }
  process.chdir(frontendDir);
  execSync('npm install', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to install frontend dependencies:', error.message);
  process.exit(1);
}

console.log('Install complete!');
