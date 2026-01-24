/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { GridPosition, GridEntity, GridSize } from './types';

/**
 * Calculate grid position from index
 */
export function getPositionFromIndex(index: number, cols: number): GridPosition {
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: col,
    y: row,
    row,
    col
  };
}

/**
 * Calculate index from grid position
 */
export function getIndexFromPosition(row: number, col: number, cols: number): number {
  return row * cols + col;
}

/**
 * Find entity at position
 */
export function getEntityAtPosition(
  entities: GridEntity[],
  row: number,
  col: number
): GridEntity | undefined {
  return entities.find(
    entity => entity.position?.row === row && entity.position?.col === col
  );
}

/**
 * Check if position is valid
 */
export function isValidPosition(
  row: number,
  col: number,
  gridSize: GridSize
): boolean {
  return row >= 0 && row < gridSize.rows && col >= 0 && col < gridSize.cols;
}

/**
 * Update entity position
 */
export function updateEntityPosition(
  entities: GridEntity[],
  entityId: string,
  position: GridPosition
): GridEntity[] {
  return entities.map(entity => {
    if (entity.id === entityId) {
      return {
        ...entity,
        position
      };
    }
    return entity;
  };
}

/**
 * Remove entity from position
 */
export function removeEntityFromPosition(
  entities: GridEntity[],
  row: number,
  col: number
): GridEntity[] {
  return entities.map(entity => {
    if (entity.position?.row === row && entity.position?.col === col) {
      const { position, ...rest } = entity;
      return rest;
    }
    return entity;
  });
}

/**
 * Validate grid size
 */
export function validateGridSize(
  size: GridSize,
  minRows: number = 1,
  minCols: number = 1,
  maxRows?: number,
  maxCols?: number
): GridSize {
  let rows = Math.max(minRows, size.rows);
  let cols = Math.max(minCols, size.cols);

  if (maxRows) {
    rows = Math.min(maxRows, rows);
  }
  if (maxCols) {
    cols = Math.min(maxCols, cols);
  }

  return { rows, cols };
}
