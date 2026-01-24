/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { QRScannerConfig, CameraDevice, QRScanCallback, QRScanErrorCallback } from './types';

export interface UseQRScannerOptions extends QRScannerConfig {
  onScanSuccess?: QRScanCallback;
  onScanError?: QRScanErrorCallback;
  autoStart?: boolean;
  elementId?: string;
}

export interface UseQRScannerReturn {
  isScanning: boolean;
  cameras: CameraDevice[];
  selectedCamera: string | null;
  error: string | null;
  startScanning: (cameraId?: string) => Promise<void>;
  stopScanning: () => Promise<void>;
  getCameras: () => Promise<CameraDevice[]>;
  setCamera: (cameraId: string) => void;
}

/**
 * React hook for QR code scanning
 */
export function useQRScanner(options: UseQRScannerOptions = {}): UseQRScannerReturn {
  const {
    onScanSuccess,
    onScanError,
    autoStart = false,
    elementId = 'qr-scanner',
    qrbox = { width: 250, height: 250 },
    fps = 5,
    aspectRatio = 1.0,
    verbose = false,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  /**
   * Get available cameras
   */
  const getCameras = useCallback(async (): Promise<CameraDevice[]> => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const devices = await Html5Qrcode.getCameras();
      
      const cameraList: CameraDevice[] = devices.map((device: any) => ({
        id: device.id,
        label: device.label || `Camera ${device.id}`,
      }));
      
      setCameras(cameraList);
      return cameraList;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to get cameras';
      setError(errorMsg);
      console.error('Error getting cameras:', err);
      return [];
    }
  }, []);

  /**
   * Start scanning
   */
  const startScanning = useCallback(async (cameraId?: string) => {
    if (isProcessingRef.current || isScanning) {
      return;
    }

    const targetCameraId = cameraId || selectedCamera;
    if (!targetCameraId) {
      setError('No camera selected');
      return;
    }

    const scannerElement = document.getElementById(elementId);
    if (!scannerElement) {
      setError(`Scanner element with id "${elementId}" not found`);
      return;
    }

    isProcessingRef.current = true;
    setIsScanning(true);
    setError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Clean up existing instance
      if (scannerInstanceRef.current) {
        try {
          await scannerInstanceRef.current.stop();
          scannerInstanceRef.current.clear();
        } catch (e: any) {
          // Ignore "scanner not running" errors
          if (!e?.message?.includes('not running') && !e?.message?.includes('not paused')) {
            console.warn('Error cleaning up previous instance:', e);
          }
        }
        scannerInstanceRef.current = null;
      }

      // Clear the element
      scannerElement.innerHTML = '';

      const html5QrCode = new Html5Qrcode(elementId);
      
      const config: Html5QrcodeCameraScanConfig = {
        fps,
        qrbox,
        aspectRatio,
      };

      await html5QrCode.start(
        targetCameraId,
        config,
        (decodedText, result) => {
          if (onScanSuccess) {
            onScanSuccess(decodedText, result);
          }
        },
        (errorMessage) => {
          if (onScanError) {
            onScanError(errorMessage);
          }
        }
      );

      scannerInstanceRef.current = html5QrCode;
      isProcessingRef.current = false;
    } catch (err: any) {
      isProcessingRef.current = false;
      setIsScanning(false);
      const errorMsg = err?.message || 'Failed to start scanner';
      setError(errorMsg);
      console.error('Error starting scanner:', err);
    }
  }, [selectedCamera, elementId, fps, qrbox, aspectRatio, onScanSuccess, onScanError, isScanning]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(async () => {
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop();
        scannerInstanceRef.current.clear();
        scannerInstanceRef.current = null;
      } catch (err: any) {
        // Ignore "scanner not running" errors
        if (!err?.message?.includes('not running') && !err?.message?.includes('not paused')) {
          console.warn('Error stopping scanner:', err);
        }
      }
    }
    
    setIsScanning(false);
    isProcessingRef.current = false;
  }, []);

  /**
   * Set camera
   */
  const setCamera = useCallback((cameraId: string) => {
    setSelectedCamera(cameraId);
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && selectedCamera && !isScanning) {
      startScanning();
    }
  }, [autoStart, selectedCamera, isScanning, startScanning]);

  // Get cameras on mount
  useEffect(() => {
    getCameras();
  }, [getCameras]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    cameras,
    selectedCamera,
    error,
    startScanning,
    stopScanning,
    getCameras,
    setCamera,
  };
}


