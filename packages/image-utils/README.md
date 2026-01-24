# @aksara/image-utils

Image compression and manipulation utilities for Aksara Framework.

## Features

- ✅ Image compression with quality control
- ✅ Automatic resizing with aspect ratio preservation
- ✅ Thumbnail generation
- ✅ Image validation
- ✅ Dimension detection
- ✅ Compression presets

## Installation

```bash
npm install @aksara/image-utils
```

## Usage

### Compress Image

```typescript
import { ImageCompressor } from '@aksara/image-utils';

const file = // ... File object

// Basic compression
const result = await ImageCompressor.compressImage(file);

// Custom options
const result = await ImageCompressor.compressImage(file, {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  maxSizeKB: 500,
  format: 'jpeg'
});

console.log(result.compressedSize); // Compressed file size
console.log(result.compressionRatio); // Compression ratio
```

### Using Presets

```typescript
import { ImageCompressor, compressionPresets } from '@aksara/image-utils';

// Use preset
const result = await ImageCompressor.compressImage(file, compressionPresets.thumbnail);

// Available presets:
// - announcement: 1200x1200, 500KB max
// - thumbnail: 300x300, 100KB max
// - highQuality: 1920x1920, 1000KB max
// - mobile: 800x800, 300KB max
```

### Validate Image

```typescript
import { ImageCompressor } from '@aksara/image-utils';

const validation = ImageCompressor.validateImage(file);
if (!validation.valid) {
  console.error(validation.error);
}
```

### Get Dimensions

```typescript
import { ImageCompressor } from '@aksara/image-utils';

const dimensions = await ImageCompressor.getImageDimensions(file);
console.log(dimensions.width, dimensions.height);
```

### Create Thumbnail

```typescript
import { ImageCompressor } from '@aksara/image-utils';

const thumbnail = await ImageCompressor.createThumbnail(file, 300);
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
