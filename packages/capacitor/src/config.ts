/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { CapacitorConfigOptions, CapacitorPluginConfig } from './types';

/**
 * Generate Capacitor configuration
 */
export function generateCapacitorConfig(options: CapacitorConfigOptions): any {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  const config: any = {
    appId: options.appId,
    appName: options.appName,
    webDir: options.webDir || 'dist'
  };

  // Server configuration (for hybrid approach)
  if (options.server) {
    config.server = {
      url: options.server.url || (
        isDevelopment
          ? (process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000')
          : undefined
      ),
      cleartext: options.server.cleartext !== undefined 
        ? options.server.cleartext 
        : isDevelopment,
      androidScheme: options.server.androidScheme || (isDevelopment ? 'http' : 'https')
    };
  }

  // Android configuration
  if (options.android) {
    config.android = {
      allowMixedContent: options.android.allowMixedContent ?? false,
      captureInput: options.android.captureInput ?? true,
      webContentsDebuggingEnabled: options.android.webContentsDebuggingEnabled ?? isDevelopment,
      backgroundColor: options.android.backgroundColor || '#ffffff',
      splashScreenEnabled: options.android.splashScreenEnabled ?? true,
      splashScreenImmersive: options.android.splashScreenImmersive ?? false
    };
  }

  // iOS configuration
  if (options.ios) {
    config.ios = {
      contentInset: options.ios.contentInset || 'automatic',
      scrollEnabled: options.ios.scrollEnabled ?? true,
      backgroundColor: options.ios.backgroundColor || '#ffffff',
      splashScreenEnabled: options.ios.splashScreenEnabled ?? true
    };
  }

  // Plugins configuration
  if (options.plugins) {
    config.plugins = options.plugins;
  } else {
    // Default plugins
    config.plugins = getDefaultPlugins();
  }

  return config;
}

/**
 * Get default plugin configuration
 */
export function getDefaultPlugins(): CapacitorPluginConfig {
  return {
    Camera: {
      presentationStyle: 'fullscreen'
    },
    Geolocation: {
      requestPermissions: true
    },
    App: {
      handleUrlOpen: true
    }
  };
}

/**
 * Generate production-ready configuration
 */
export function generateProductionConfig(options: Omit<CapacitorConfigOptions, 'server'> & {
  productionUrl: string;
}): any {
  return generateCapacitorConfig({
    ...options,
    server: {
      url: options.productionUrl,
      cleartext: false,
      androidScheme: 'https'
    },
    android: {
      ...options.android,
      webContentsDebuggingEnabled: false
    }
  });
}

/**
 * Generate development configuration
 */
export function generateDevelopmentConfig(options: Omit<CapacitorConfigOptions, 'server'> & {
  devUrl?: string;
}): any {
  return generateCapacitorConfig({
    ...options,
    server: {
      url: options.devUrl || 'http://localhost:3000',
      cleartext: true,
      androidScheme: 'http'
    },
    android: {
      ...options.android,
      webContentsDebuggingEnabled: true
    }
  });
}

/**
 * Generate bundled configuration (no server URL - code bundled in app)
 */
export function generateBundledConfig(options: Omit<CapacitorConfigOptions, 'server'>): any {
  return generateCapacitorConfig({
    ...options,
    server: undefined
  });
}
