/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import React, { useState } from 'react';
import { DraggableItemProps } from './types';

/**
 * Draggable Item Component
 * Wrapper for entities that can be dragged onto the grid
 */
export function DraggableItem({
  entity,
  isDragging = false,
  onDragStart,
  onDragEnd,
  renderContent,
  className = ''
}: DraggableItemProps) {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDraggingLocal(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('entityId', entity.id);
    if (onDragStart) {
      onDragStart(entity);
    }
  };

  const handleDragEnd = () => {
    setIsDraggingLocal(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const hasPosition = entity.position?.row !== undefined && entity.position?.col !== undefined;
  const baseClasses = 'px-4 py-2 rounded-lg text-sm font-medium cursor-move transition-all';
  const positionClasses = hasPosition
    ? 'bg-green-500 text-white hover:bg-green-600'
    : 'bg-[#3ACCBC] text-white hover:bg-[#3ACCBC]/80';
  const draggingClasses = (isDragging || isDraggingLocal) ? 'opacity-50' : '';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${baseClasses} ${positionClasses} ${draggingClasses} ${className}`}
    >
      {renderContent ? (
        renderContent(entity)
      ) : (
        <>
          {entity.name}
          {hasPosition && ` (${entity.position.row}, ${entity.position.col})`}
        </>
      )}
    </div>
  );
}
