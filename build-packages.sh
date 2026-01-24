#!/bin/bash
# Build script for Aksara Framework packages
# Run this from the project root

echo "Building Aksara Framework packages..."

packages=("core" "api" "context" "hooks" "ui" "formatters")

for package in "${packages[@]}"; do
    echo ""
    echo "Building @aksara/$package..."
    cd "packages/$package"
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
    
    if [ $? -eq 0 ]; then
        # Build package
        echo "Building package..."
        npx tsc --project tsconfig.json
        
        if [ $? -eq 0 ]; then
            echo "✓ @aksara/$package built successfully"
        else
            echo "✗ Failed to build @aksara/$package"
            exit 1
        fi
    else
        echo "✗ Failed to install dependencies for @aksara/$package"
        exit 1
    fi
    else
        echo "✗ Failed to install dependencies for @aksara/$package"
    fi
    
    cd ../..
done

echo ""
echo "Build complete!"
