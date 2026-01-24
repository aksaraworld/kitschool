/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import React, { useState, useCallback } from 'react';
import { GridMapProps, GridPosition } from './types';
import { GridCell } from './GridCell';
import { GridControls } from './GridControls';
import { getEntityAtPosition, getPositionFromIndex, isValidPosition } from './utils';

/**
 * Grid Map Component
 * Main component for visual grid-based positioning with drag-and-drop
 */
export function GridMap<T = any>({
  entities,
  gridSize,
  editable = false,
  onEntityDrop,
  onPositionUpdate,
  onPositionClick,
  renderEntity,
  emptyCellRenderer,
  className = '',
  cellClassName = '',
  showControls = true,
  onGridSizeChange,
  minRows = 1,
  minCols = 1,
  maxRows,
  maxCols
}: GridMapProps<T>) {
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null);

  const handleCellDrop = useCallback((row: number, col: number) => {
    if (!editable || !draggedEntityId || !onEntityDrop) return;

    const position: GridPosition = {
      x: col,
      y: row,
      row,
      col
    };

    if (isValidPosition(row, col, gridSize)) {
      onEntityDrop(draggedEntityId, position);
      setDraggedEntityId(null);
    }
  }, [editable, draggedEntityId, onEntityDrop, gridSize]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (editable && onPositionClick) {
      onPositionClick(row, col);
    }
  }, [editable, onPositionClick]);

  const handleDragStart = useCallback((entityId: string) => {
    if (editable) {
      setDraggedEntityId(entityId);
    }
  }, [editable]);

  const handleDragEnd = useCallback(() => {
    setDraggedEntityId(null);
  }, []);

  const handleAddRow = useCallback(() => {
    if (onGridSizeChange) {
      const newSize = {
        rows: Math.min((maxRows || Infinity), gridSize.rows + 1),
        cols: gridSize.cols
      };
      onGridSizeChange(newSize);
    }
  }, [gridSize, maxRows, onGridSizeChange]);

  const handleRemoveRow = useCallback(() => {
    if (onGridSizeChange && gridSize.rows > minRows) {
      const newSize = {
        rows: gridSize.rows - 1,
        cols: gridSize.cols
      };
      onGridSizeChange(newSize);
    }
  }, [gridSize, minRows, onGridSizeChange]);

  const handleAddCol = useCallback(() => {
    if (onGridSizeChange) {
      const newSize = {
        rows: gridSize.rows,
        cols: Math.min((maxCols || Infinity), gridSize.cols + 1)
      };
      onGridSizeChange(newSize);
    }
  }, [gridSize, maxCols, onGridSizeChange]);

  const handleRemoveCol = useCallback(() => {
    if (onGridSizeChange && gridSize.cols > minCols) {
      const newSize = {
        rows: gridSize.rows,
        cols: gridSize.cols - 1
      };
      onGridSizeChange(newSize);
    }
  }, [gridSize, minCols, onGridSizeChange]);

  return (
    <div className={`w-full ${className}`}>
      {showControls && editable && onGridSizeChange && (
        <div className="mb-4">
          <GridControls
            gridSize={gridSize}
            onAddRow={handleAddRow}
            onRemoveRow={handleRemoveRow}
            onAddCol={handleAddCol}
            onRemoveCol={handleRemoveCol}
            minRows={minRows}
            minCols={minCols}
            maxRows={maxRows}
            maxCols={maxCols}
          />
        </div>
      )}

      <div className="border-2 border-zinc-300 rounded-lg p-2 bg-zinc-50 w-full">
        <div
          className="grid gap-1 w-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize.rows}, minmax(60px, 1fr))`,
            aspectRatio: `${gridSize.cols} / ${gridSize.rows}`
          }}
        >
          {Array.from({ length: gridSize.rows * gridSize.cols }).map((_, index) => {
            const position = getPositionFromIndex(index, gridSize.cols);
            const entity = getEntityAtPosition(entities, position.row, position.col);
            const isEmpty = !entity;

            return (
              <GridCell
                key={index}
                row={position.row}
                col={position.col}
                entity={entity}
                isEmpty={isEmpty}
                isEditable={editable}
                onDrop={handleCellDrop}
                onPositionClick={handleCellClick}
                renderEntity={renderEntity}
                className={cellClassName}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
