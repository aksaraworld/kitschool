# Build script for Aksara Framework packages
# Run this from the project root

Write-Host "Building Aksara Framework packages..." -ForegroundColor Green

$packages = @("core", "api", "context", "hooks", "ui", "formatters")

foreach ($package in $packages) {
    Write-Host "`nBuilding @aksara/$package..." -ForegroundColor Yellow
    Set-Location "packages\$package"
    
    # Install dependencies
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
    
    if ($LASTEXITCODE -eq 0) {
        # Build package
        Write-Host "Building package..." -ForegroundColor Cyan
        npx tsc
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ @aksara/$package built successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to build @aksara/$package" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Failed to install dependencies for @aksara/$package" -ForegroundColor Red
    }
    
    Set-Location ..\..
}

Write-Host "`nBuild complete!" -ForegroundColor Green
