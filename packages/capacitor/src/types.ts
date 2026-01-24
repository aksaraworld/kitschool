/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Capacitor configuration options
 */
export interface CapacitorConfigOptions {
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

/**
 * Capacitor plugin configuration
 */
export interface CapacitorPluginConfig {
  Camera?: {
    presentationStyle?: 'fullscreen' | 'popover';
  };
  Geolocation?: {
    requestPermissions?: boolean;
  };
  App?: {
    handleUrlOpen?: boolean;
  };
  PushNotifications?: {
    presentationOptions?: ('badge' | 'sound' | 'alert')[];
  };
  [key: string]: any;
}

/**
 * Platform detection result
 */
export interface PlatformInfo {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
}
