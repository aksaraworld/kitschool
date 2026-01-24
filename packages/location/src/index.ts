/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

export interface LocationValidationResult {
  distance: number;
  isValid: boolean;
  message: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if location is within allowed radius
 * @param propertyLat Property latitude
 * @param propertyLng Property longitude
 * @param checkLat Check-in latitude
 * @param checkLng Check-in longitude
 * @param maxRadius Maximum allowed radius in meters (default: 500)
 * @returns Object with distance and validity
 */
export function checkLocationValidity(
  propertyLat: number,
  propertyLng: number,
  checkLat: number,
  checkLng: number,
  maxRadius: number = 500
): LocationValidationResult {
  const distance = calculateDistance(propertyLat, propertyLng, checkLat, checkLng);
  const isValid = distance <= maxRadius;

  return {
    distance: Math.round(distance),
    isValid,
    message: isValid
      ? `Lokasi valid (${Math.round(distance)}m dari properti)`
      : `Lokasi terlalu jauh (${Math.round(distance)}m dari properti, maksimal ${maxRadius}m)`
  };
}

/**
 * Format distance in readable format
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}
