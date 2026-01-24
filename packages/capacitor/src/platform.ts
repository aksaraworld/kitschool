/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { PlatformInfo } from './types';

/**
 * Detect if running on native platform
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const Capacitor = (window as any).Capacitor;
  return Capacitor?.isNativePlatform?.() ?? false;
}

/**
 * Get platform information
 */
export function getPlatformInfo(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isNative: false,
      platform: 'unknown',
      isIOS: false,
      isAndroid: false,
      isWeb: false
    };
  }

  const Capacitor = (window as any).Capacitor;
  const isNative = Capacitor?.isNativePlatform?.() ?? false;

  if (!isNative) {
    return {
      isNative: false,
      platform: 'web',
      isIOS: false,
      isAndroid: false,
      isWeb: true
    };
  }

  const platform = Capacitor?.getPlatform?.() || 'unknown';
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';

  return {
    isNative: true,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'web',
    isIOS,
    isAndroid,
    isWeb: false
  };
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return getPlatformInfo().isIOS;
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return getPlatformInfo().isAndroid;
}

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  return getPlatformInfo().isWeb;
}
