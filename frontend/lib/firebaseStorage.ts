/**
 * Firebase Storage Utilities
 * Handles file uploads to Firebase Storage
 */

'use client';

import { ref, uploadBytes, getDownloadURL, deleteObject, UploadResult } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  };
}

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const { folder = 'uploads', fileName, metadata } = options;
  
  // Generate file name if not provided
  const finalFileName = fileName || `${Date.now()}_${file.name}`;
  const filePath = `${folder}/${finalFileName}`;
  
  // Create storage reference
  const storageRef = ref(storage, filePath);
  
  // Upload file
  const uploadMetadata = {
    contentType: metadata?.contentType || file.type,
    customMetadata: metadata?.customMetadata || {}
  };
  
  await uploadBytes(storageRef, file, uploadMetadata);
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const fileOptions = {
      ...options,
      fileName: options.fileName 
        ? `${options.fileName}_${index}`
        : undefined
    };
    return uploadFile(file, fileOptions);
  });
  
  return Promise.all(uploadPromises);
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    // Extract path from URL
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    
    if (!pathMatch) {
      throw new Error('Invalid file URL');
    }
    
    // Decode the path (Firebase encodes special characters)
    const filePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, filePath);
    
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get download URL for a file
 */
export async function getFileUrl(filePath: string): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, filePath);
  return getDownloadURL(storageRef);
}

/**
 * Upload image with compression (client-side)
 */
export async function uploadImage(
  file: File,
  options: UploadOptions & { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8, ...uploadOptions } = options;
  
  // Compress image if it's an image file
  if (file.type.startsWith('image/')) {
    const compressedFile = await compressImage(file, maxWidth, maxHeight, quality);
    return uploadFile(compressedFile, uploadOptions);
  }
  
  return uploadFile(file, uploadOptions);
}

/**
 * Compress image before upload
 */
function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };
      
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
