/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { CompressionOptions, CompressionResult, ImageValidationResult } from './types';

export class ImageCompressor {
  private static readonly DEFAULT_OPTIONS: Required<CompressionOptions> = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    maxSizeKB: 500,
    format: 'jpeg'
  };

  static async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          const { width: newWidth, height: newHeight } = this.calculateDimensions(
            img.width,
            img.height,
            opts.maxWidth,
            opts.maxHeight
          );

          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeKB = blob.size / 1024;

              if (sizeKB > opts.maxSizeKB) {
                const newQuality = Math.max(0.1, opts.quality * 0.8);
                this.compressImage(file, { ...opts, quality: newQuality })
                  .then(resolve)
                  .catch(reject);
                return;
              }

              const compressedFile = new File(
                [blob],
                this.generateFileName(file.name, opts.format),
                { type: `image/${opts.format}` }
              );

              resolve({
                file: compressedFile,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: (file.size - blob.size) / file.size,
                dimensions: {
                  original: { width: img.width, height: img.height },
                  compressed: { width: newWidth, height: newHeight }
                }
              });
            },
            `image/${opts.format}`,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;

      if (width > height) {
        width = Math.min(maxWidth, width);
        height = width / aspectRatio;
      } else {
        height = Math.min(maxHeight, height);
        width = height * aspectRatio;
      }
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  private static generateFileName(originalName: string, format: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    return `${nameWithoutExt}_compressed_${timestamp}.${format}`;
  }

  static validateImage(file: File): ImageValidationResult {
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Image size must be less than 10MB' };
    }

    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedTypes.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF' };
    }

    return { valid: true };
  }

  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static async createThumbnail(file: File, size: number = 300): Promise<File> {
    const compressed = await this.compressImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      maxSizeKB: 100,
      format: 'jpeg'
    });

    return compressed.file;
  }
}

export const compressionPresets = {
  announcement: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    maxSizeKB: 500,
    format: 'jpeg' as const
  },
  thumbnail: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.7,
    maxSizeKB: 100,
    format: 'jpeg' as const
  },
  highQuality: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.9,
    maxSizeKB: 1000,
    format: 'jpeg' as const
  },
  mobile: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.75,
    maxSizeKB: 300,
    format: 'jpeg' as const
  }
};
