/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { useState, useCallback } from 'react';
import { GridEntity, GridSize, GridPosition } from '../types';
import { updateEntityPosition, validateGridSize } from '../utils';

/**
 * Hook for managing grid map state
 */
export function useGridMap<T = any>(
  initialEntities: GridEntity<T>[] = [],
  initialGridSize: GridSize = { rows: 10, cols: 15 }
) {
  const [entities, setEntities] = useState<GridEntity<T>[]>(initialEntities);
  const [gridSize, setGridSize] = useState<GridSize>(initialGridSize);
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null);

  const updateEntity = useCallback((entityId: string, position: GridPosition) => {
    setEntities(prev => updateEntityPosition(prev, entityId, position));
  }, []);

  const removeEntity = useCallback((entityId: string) => {
    setEntities(prev => prev.filter(e => e.id !== entityId));
  }, []);

  const addEntity = useCallback((entity: GridEntity<T>) => {
    setEntities(prev => [...prev, entity]);
  }, []);

  const updateGridSize = useCallback((
    newSize: GridSize,
    options?: {
      minRows?: number;
      minCols?: number;
      maxRows?: number;
      maxCols?: number;
    }
  ) => {
    const validated = validateGridSize(
      newSize,
      options?.minRows,
      options?.minCols,
      options?.maxRows,
      options?.maxCols
    );
    setGridSize(validated);
  }, []);

  const handleEntityDrop = useCallback((entityId: string, position: GridPosition) => {
    updateEntity(entityId, position);
  }, [updateEntity]);

  return {
    entities,
    gridSize,
    draggedEntityId,
    setDraggedEntityId,
    updateEntity,
    removeEntity,
    addEntity,
    updateGridSize,
    handleEntityDrop,
    setEntities,
    setGridSize
  };
}
