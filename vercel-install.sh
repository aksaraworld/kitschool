#!/bin/bash
set -e

echo "Building packages first..."
cd "$(dirname "$0")"
node build-packages.js

echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Install complete!"
