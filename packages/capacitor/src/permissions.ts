/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { isNativePlatform } from './platform';

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'limited';

/**
 * Check camera permission
 */
export async function checkCameraPermission(): Promise<PermissionStatus | null> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const status = await Camera.checkPermissions();
    return status.camera as PermissionStatus;
  } catch (error) {
    console.error('Camera permission check failed:', error);
    return null;
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionStatus | null> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const status = await Camera.requestPermissions();
    return status.camera as PermissionStatus;
  } catch (error) {
    console.error('Camera permission request failed:', error);
    return null;
  }
}

/**
 * Check geolocation permission
 */
export async function checkGeolocationPermission(): Promise<PermissionStatus | null> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const status = await Geolocation.checkPermissions();
    return (status.location || status.coarseLocation) as PermissionStatus;
  } catch (error) {
    console.error('Geolocation permission check failed:', error);
    return null;
  }
}

/**
 * Request geolocation permission
 */
export async function requestGeolocationPermission(): Promise<PermissionStatus | null> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const status = await Geolocation.requestPermissions();
    return (status.location || status.coarseLocation) as PermissionStatus;
  } catch (error) {
    console.error('Geolocation permission request failed:', error);
    return null;
  }
}

/**
 * Check notification permission
 */
export async function checkNotificationPermission(): Promise<PermissionStatus | null> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('Notification' in window) {
      return Notification.permission as PermissionStatus;
    }
    return null;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.checkPermissions();
    return status.receive as PermissionStatus;
  } catch (error) {
    console.error('Notification permission check failed:', error);
    // Fallback to web API
    if ('Notification' in window) {
      return Notification.permission as PermissionStatus;
    }
    return null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<PermissionStatus | null> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      return result as PermissionStatus;
    }
    return Notification.permission as PermissionStatus;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.requestPermissions();
    return status.receive as PermissionStatus;
  } catch (error) {
    console.error('Notification permission request failed:', error);
    // Fallback to web API
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      return result as PermissionStatus;
    }
    return Notification.permission as PermissionStatus;
  }
}

/**
 * Check all common permissions
 */
export async function checkAllPermissions(): Promise<{
  camera: PermissionStatus | null;
  geolocation: PermissionStatus | null;
  notifications: PermissionStatus | null;
}> {
  const [camera, geolocation, notifications] = await Promise.all([
    checkCameraPermission(),
    checkGeolocationPermission(),
    checkNotificationPermission()
  ]);

  return { camera, geolocation, notifications };
}

/**
 * Request all common permissions
 */
export async function requestAllPermissions(): Promise<{
  camera: PermissionStatus | null;
  geolocation: PermissionStatus | null;
  notifications: PermissionStatus | null;
}> {
  const [camera, geolocation, notifications] = await Promise.all([
    requestCameraPermission(),
    requestGeolocationPermission(),
    requestNotificationPermission()
  ]);

  return { camera, geolocation, notifications };
}
