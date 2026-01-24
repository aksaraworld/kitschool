# @aksara/capacitor

Capacitor integration utilities for Aksara Framework - Making mobile app creation easier.

## Features

- ✅ Capacitor configuration generators
- ✅ Platform detection utilities
- ✅ Permission management helpers
- ✅ Production/Development config presets
- ✅ Bundled vs Server URL modes
- ✅ Default plugin configurations

## Installation

```bash
npm install @aksara/capacitor @capacitor/cli @capacitor/core
```

## Usage

### Generate Capacitor Configuration

```typescript
import { generateCapacitorConfig } from '@aksara/capacitor';

// Basic configuration
const config = generateCapacitorConfig({
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist',
  productionUrl: 'https://example.com'
});

// Export for capacitor.config.ts
export default config;
```

### Production Configuration

```typescript
import { generateProductionConfig } from '@aksara/capacitor';

const config = generateProductionConfig({
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist',
  productionUrl: 'https://example.com',
  android: {
    webContentsDebuggingEnabled: false
  }
});
```

### Development Configuration

```typescript
import { generateDevelopmentConfig } from '@aksara/capacitor';

const config = generateDevelopmentConfig({
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist',
  devUrl: 'http://localhost:3000'
});
```

### Bundled Configuration (Code in APK)

```typescript
import { generateBundledConfig } from '@aksara/capacitor';

const config = generateBundledConfig({
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist'
});
```

### Platform Detection

```typescript
import { 
  isNativePlatform, 
  getPlatformInfo, 
  isIOS, 
  isAndroid, 
  isWeb 
} from '@aksara/capacitor';

// Check if running on native platform
if (isNativePlatform()) {
  console.log('Running on mobile app');
}

// Get detailed platform info
const platformInfo = getPlatformInfo();
console.log(platformInfo.platform); // 'ios' | 'android' | 'web'

// Platform-specific checks
if (isIOS()) {
  // iOS-specific code
}

if (isAndroid()) {
  // Android-specific code
}

if (isWeb()) {
  // Web-specific code
}
```

### Permission Management

```typescript
import {
  checkCameraPermission,
  requestCameraPermission,
  checkGeolocationPermission,
  requestGeolocationPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  checkAllPermissions,
  requestAllPermissions
} from '@aksara/capacitor';

// Check single permission
const cameraStatus = await checkCameraPermission();
if (cameraStatus !== 'granted') {
  await requestCameraPermission();
}

// Check all permissions
const permissions = await checkAllPermissions();
console.log(permissions);
// { camera: 'granted', geolocation: 'denied', notifications: 'prompt' }

// Request all permissions
const requested = await requestAllPermissions();
```

### Default Plugins

```typescript
import { getDefaultPlugins } from '@aksara/capacitor';

const plugins = getDefaultPlugins();
// Returns:
// {
//   Camera: { presentationStyle: 'fullscreen' },
//   Geolocation: { requestPermissions: true },
//   App: { handleUrlOpen: true }
// }
```

## Configuration Modes

### 1. Server URL Mode (Recommended for Production)
Loads app from production server. API routes work, no static export needed.

```typescript
const config = generateProductionConfig({
  appId: 'com.example.app',
  appName: 'My App',
  productionUrl: 'https://example.com'
});
```

### 2. Bundled Mode
Bundles code in APK/IPA. Use for testing local changes or offline apps.

```typescript
const config = generateBundledConfig({
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist'
});
```

### 3. Development Mode
Uses local development server for faster iteration.

```typescript
const config = generateDevelopmentConfig({
  appId: 'com.example.app',
  appName: 'My App',
  devUrl: 'http://localhost:3000'
});
```

## Example: Complete Setup

```typescript
// capacitor.config.ts
import { generateCapacitorConfig } from '@aksara/capacitor';

const isDevelopment = process.env.NODE_ENV === 'development';

const config = generateCapacitorConfig({
  appId: 'com.example.app',
  appName: 'My App',
  webDir: 'dist',
  server: {
    url: isDevelopment 
      ? 'http://localhost:3000'
      : 'https://example.com',
    cleartext: isDevelopment,
    androidScheme: isDevelopment ? 'http' : 'https'
  },
  android: {
    webContentsDebuggingEnabled: isDevelopment
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    },
    Geolocation: {
      requestPermissions: true
    }
  }
});

export default config;
```

## Types

```typescript
interface CapacitorConfigOptions {
  appId: string;
  appName: string;
  webDir?: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: 'http' | 'https';
  };
  android?: {
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
    backgroundColor?: string;
    splashScreenEnabled?: boolean;
    splashScreenImmersive?: boolean;
  };
  ios?: {
    contentInset?: 'automatic' | 'always' | 'never';
    scrollEnabled?: boolean;
    backgroundColor?: string;
    splashScreenEnabled?: boolean;
  };
  plugins?: Record<string, any>;
}
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
