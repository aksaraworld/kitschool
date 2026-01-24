# @aksara/qr-scanner

QR code scanner module for Aksara Framework.

## Installation

```bash
npm install @aksara/qr-scanner html5-qrcode
```

## Usage

### useQRScanner Hook

```typescript
import { useQRScanner } from '@aksara/qr-scanner';

function MyComponent() {
  const {
    isScanning,
    cameras,
    selectedCamera,
    error,
    startScanning,
    stopScanning,
    getCameras,
    setCamera,
  } = useQRScanner({
    elementId: 'qr-scanner',
    onScanSuccess: (decodedText, result) => {
      console.log('QR Code scanned:', decodedText);
      // Handle scan result
    },
    onScanError: (errorMessage) => {
      console.error('Scan error:', errorMessage);
    },
    autoStart: false,
  });

  return (
    <div>
      <div id="qr-scanner"></div>
      <button onClick={() => startScanning()}>Start Scanning</button>
      <button onClick={() => stopScanning()}>Stop Scanning</button>
    </div>
  );
}
```

## Features

- Web-based QR scanning using `html5-qrcode`
- Camera selection support
- Automatic camera detection
- Error handling
- React hook interface

## Copyright

Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.


