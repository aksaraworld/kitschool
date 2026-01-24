# @aksara/grid-mapping

Visual grid-based positioning system for Aksara Framework with drag-and-drop functionality.

## Features

- ✅ Visual grid layout with configurable size
- ✅ Drag-and-drop entity positioning
- ✅ Click-to-position support
- ✅ Grid size controls (add/remove rows/columns)
- ✅ Entity rendering customization
- ✅ Position validation
- ✅ Responsive grid layout
- ✅ Empty cell handling

## Installation

```bash
npm install @aksara/grid-mapping
```

## Usage

### Basic Setup

```typescript
import { GridMap, useGridMap } from '@aksara/grid-mapping';
import type { GridEntity, GridSize } from '@aksara/grid-mapping';

// Define entities
const entities: GridEntity[] = [
  {
    id: 'entity-1',
    name: 'Block A',
    position: { x: 0, y: 0, row: 0, col: 0 },
    metadata: {
      color: 'blue',
      type: 'block'
    }
  },
  {
    id: 'entity-2',
    name: 'Block B',
    position: { x: 1, y: 0, row: 0, col: 1 }
  }
];

// Initial grid size
const gridSize: GridSize = { rows: 10, cols: 15 };

// Use the component
<GridMap
  entities={entities}
  gridSize={gridSize}
  editable={true}
  onEntityDrop={(entityId, position) => {
    console.log(`Entity ${entityId} dropped at`, position);
    // Update entity position in your database
  }}
  onPositionClick={(row, col) => {
    console.log(`Clicked position:`, { row, col });
  }}
/>
```

### Using the Hook

```typescript
import { useGridMap } from '@aksara/grid-mapping';

function MyGridComponent() {
  const {
    entities,
    gridSize,
    updateEntity,
    updateGridSize,
    handleEntityDrop
  } = useGridMap(
    initialEntities,
    { rows: 10, cols: 15 }
  );

  return (
    <GridMap
      entities={entities}
      gridSize={gridSize}
      editable={true}
      onEntityDrop={handleEntityDrop}
      onGridSizeChange={updateGridSize}
      showControls={true}
    />
  );
}
```

### Custom Entity Rendering

```typescript
<GridMap
  entities={entities}
  gridSize={gridSize}
  renderEntity={(entity) => (
    <div className="flex flex-col items-center">
      <span className="font-bold">{entity.name}</span>
      {entity.metadata?.icon && (
        <span>{entity.metadata.icon}</span>
      )}
    </div>
  )}
/>
```

### Draggable Items

```typescript
import { DraggableItem } from '@aksara/grid-mapping';

<div className="flex gap-2">
  {availableEntities.map(entity => (
    <DraggableItem
      key={entity.id}
      entity={entity}
      onDragStart={(entity) => {
        console.log('Dragging:', entity.name);
      }}
      onDragEnd={() => {
        console.log('Drag ended');
      }}
    />
  ))}
</div>
```

### Grid Controls

```typescript
import { GridControls } from '@aksara/grid-mapping';

<GridControls
  gridSize={gridSize}
  onAddRow={() => setGridSize({ ...gridSize, rows: gridSize.rows + 1 })}
  onRemoveRow={() => setGridSize({ ...gridSize, rows: Math.max(1, gridSize.rows - 1) })}
  onAddCol={() => setGridSize({ ...gridSize, cols: gridSize.cols + 1 })}
  onRemoveCol={() => setGridSize({ ...gridSize, cols: Math.max(1, gridSize.cols - 1) })}
  minRows={1}
  minCols={1}
  maxRows={50}
  maxCols={50}
/>
```

## Types

```typescript
interface GridEntity<T = any> {
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

interface GridPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

interface GridSize {
  rows: number;
  cols: number;
}
```

## Utilities

```typescript
import {
  getEntityAtPosition,
  updateEntityPosition,
  removeEntityFromPosition,
  validateGridSize,
  getPositionFromIndex,
  getIndexFromPosition
} from '@aksara/grid-mapping';

// Find entity at position
const entity = getEntityAtPosition(entities, 0, 0);

// Update entity position
const updated = updateEntityPosition(entities, 'entity-1', { x: 1, y: 1, row: 1, col: 1 });

// Validate grid size
const validSize = validateGridSize({ rows: 5, cols: 5 }, 1, 1, 50, 50);
```

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
