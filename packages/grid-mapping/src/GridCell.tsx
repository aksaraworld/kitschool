/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import React from 'react';
import { GridCellProps } from './types';

/**
 * Grid Cell Component
 * Individual cell in the grid that can contain an entity
 */
export function GridCell({
  row,
  col,
  entity,
  isEmpty,
  isEditable,
  onDrop,
  onPositionClick,
  renderEntity,
  className = ''
}: GridCellProps) {
  const handleDragOver = (e: React.DragEvent) => {
    if (isEditable && onDrop) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isEditable && onDrop) {
      e.preventDefault();
      onDrop(row, col);
    }
  };

  const handleClick = () => {
    if (isEditable && onPositionClick) {
      onPositionClick(row, col);
    }
  };

  const baseClasses = 'border border-zinc-200 rounded flex items-center justify-center text-xs font-medium transition-all min-h-[60px]';
  const emptyClasses = isEmpty ? 'bg-white hover:bg-zinc-50' : '';
  const entityClasses = entity?.metadata?.color 
    ? `bg-${entity.metadata.color} text-white`
    : entity 
    ? 'bg-[#3ACCBC] text-white'
    : '';
  const editableClasses = isEditable ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${emptyClasses} ${entityClasses} ${editableClasses} ${className}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      title={entity ? `${entity.name} (${row}, ${col})` : `(${row}, ${col})`}
    >
      {entity && renderEntity ? (
        renderEntity(entity)
      ) : entity ? (
        <div className="px-2 py-1 text-center break-words">
          {entity.name}
        </div>
      ) : (
        <span className="text-zinc-400 text-xs">({row}, {col})</span>
      )}
    </div>
  );
}
