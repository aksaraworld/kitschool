/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    original: { width: number; height: number };
    compressed: { width: number; height: number };
  };
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}
