/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { ReactNode } from 'react';

/**
 * Grid position
 */
export interface GridPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

/**
 * Grid entity (any item that can be positioned on the grid)
 */
export interface GridEntity<T = any> {
  id: string;
  name: string;
  data?: T;
  position?: GridPosition;
  metadata?: {
    color?: string;
    icon?: string;
    type?: string;
    [key: string]: any;
  };
}

/**
 * Grid size configuration
 */
export interface GridSize {
  rows: number;
  cols: number;
}

/**
 * Grid cell props
 */
export interface GridCellProps {
  row: number;
  col: number;
  entity?: GridEntity;
  isEmpty: boolean;
  isEditable: boolean;
  onDrop?: (row: number, col: number) => void;
  onPositionClick?: (row: number, col: number) => void;
  renderEntity?: (entity: GridEntity) => ReactNode;
  className?: string;
}

/**
 * Grid map props
 */
export interface GridMapProps<T = any> {
  entities: GridEntity<T>[];
  gridSize: GridSize;
  editable?: boolean;
  onEntityDrop?: (entityId: string, position: GridPosition) => void;
  onPositionUpdate?: (entityId: string, position: GridPosition) => void;
  onPositionClick?: (row: number, col: number) => void;
  renderEntity?: (entity: GridEntity<T>) => ReactNode;
  emptyCellRenderer?: (row: number, col: number) => ReactNode;
  className?: string;
  cellClassName?: string;
  showControls?: boolean;
  onGridSizeChange?: (size: GridSize) => void;
  minRows?: number;
  minCols?: number;
  maxRows?: number;
  maxCols?: number;
}

/**
 * Draggable item props
 */
export interface DraggableItemProps {
  entity: GridEntity;
  isDragging?: boolean;
  onDragStart?: (entity: GridEntity) => void;
  onDragEnd?: () => void;
  renderContent?: (entity: GridEntity) => ReactNode;
  className?: string;
}

/**
 * Grid controls props
 */
export interface GridControlsProps {
  gridSize: GridSize;
  onAddRow?: () => void;
  onRemoveRow?: () => void;
  onAddCol?: () => void;
  onRemoveCol?: () => void;
  minRows?: number;
  minCols?: number;
  maxRows?: number;
  maxCols?: number;
  className?: string;
}

/**
 * Grid legend props
 */
export interface GridLegendProps {
  entities: GridEntity[];
  renderLegendItem?: (entity: GridEntity) => ReactNode;
  className?: string;
}
