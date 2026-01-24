#!/bin/bash
set -e

# Find project root (where build-packages.js is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Build packages
echo "Building packages..."
node build-packages.js

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Install complete!"
