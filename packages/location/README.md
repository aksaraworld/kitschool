# @aksara/location

Location and distance calculation utilities for Aksara Framework.

## Features

- ✅ Distance calculation using Haversine formula
- ✅ Location validity checking (within radius)
- ✅ Distance formatting

## Installation

```bash
npm install @aksara/location
```

## Usage

```typescript
import { calculateDistance, checkLocationValidity, formatDistance } from '@aksara/location';

// Calculate distance between two coordinates
const distance = calculateDistance(
  -6.2088,  // Jakarta latitude
  106.8456, // Jakarta longitude
  -6.2146,  // Bandung latitude
  107.1418  // Bandung longitude
); // Returns distance in meters

// Check if location is within allowed radius
const result = checkLocationValidity(
  propertyLat,
  propertyLng,
  checkInLat,
  checkInLng,
  500 // max radius in meters (default: 500)
);

if (result.isValid) {
  console.log(result.message); // "Lokasi valid (250m dari properti)"
}

// Format distance
formatDistance(1250); // "1.25km"
formatDistance(500);  // "500m"
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
