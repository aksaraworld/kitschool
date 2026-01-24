/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

export interface QRScannerConfig {
  qrbox?: { width: number; height: number };
  fps?: number;
  aspectRatio?: number;
  verbose?: boolean;
  supportedScanTypes?: any[];
}

export interface CameraDevice {
  id: string;
  label: string;
}

export interface QRScanResult {
  decodedText: string;
  result: any;
}

export type QRScanCallback = (decodedText: string, result: any) => void;
export type QRScanErrorCallback = (errorMessage: string) => void;


