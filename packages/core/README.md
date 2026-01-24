# @aksara/core

Core utilities and types for Aksara Framework.

## Installation

```bash
npm install @aksara/core
```

## Usage

### Utilities

```typescript
import { cn, calculateDistance, formatDate, debounce } from '@aksara/core';

// Merge Tailwind classes
const className = cn('px-4', 'py-2', isActive && 'bg-blue-500');

// Calculate distance between coordinates
const distance = calculateDistance(lat1, lon1, lat2, lon2);

// Format dates
const formatted = formatDate(new Date(), true);

// Debounce function
const debouncedSearch = debounce(searchFunction, 300);
```

### Types

```typescript
import { BaseUser, ApiResponse, PaginatedResponse } from '@aksara/core';

// Extend base types for your application
interface MyUser extends BaseUser {
  customField: string;
}
```

## Copyright

Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.


