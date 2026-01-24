/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import React from 'react';
import { GridControlsProps } from './types';

/**
 * Grid Controls Component
 * Controls for adjusting grid size (add/remove rows and columns)
 */
export function GridControls({
  gridSize,
  onAddRow,
  onRemoveRow,
  onAddCol,
  onRemoveCol,
  minRows = 1,
  minCols = 1,
  maxRows,
  maxCols,
  className = ''
}: GridControlsProps) {
  const canRemoveRow = gridSize.rows > minRows;
  const canAddRow = !maxRows || gridSize.rows < maxRows;
  const canRemoveCol = gridSize.cols > minCols;
  const canAddCol = !maxCols || gridSize.cols < maxCols;

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <div className="text-sm font-medium text-zinc-700">
        Grid: {gridSize.rows} × {gridSize.cols}
      </div>
      
      {onAddRow && canAddRow && (
        <button
          onClick={onAddRow}
          className="px-3 py-1 bg-green-200 hover:bg-green-300 text-green-700 rounded-lg text-sm font-medium"
        >
          + Baris
        </button>
      )}
      
      {onRemoveRow && canRemoveRow && (
        <button
          onClick={onRemoveRow}
          className="px-3 py-1 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg text-sm font-medium"
        >
          - Baris
        </button>
      )}
      
      {onAddCol && canAddCol && (
        <button
          onClick={onAddCol}
          className="px-3 py-1 bg-green-200 hover:bg-green-300 text-green-700 rounded-lg text-sm font-medium"
        >
          + Kolom
        </button>
      )}
      
      {onRemoveCol && canRemoveCol && (
        <button
          onClick={onRemoveCol}
          className="px-3 py-1 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg text-sm font-medium"
        >
          - Kolom
        </button>
      )}
    </div>
  );
}
