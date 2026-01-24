# @aksara/api

API client with caching for Aksara Framework.

## Installation

```bash
npm install @aksara/api
```

## Usage

### Basic Setup

```typescript
import { APIClient } from '@aksara/api';

const apiClient = new APIClient({
  baseUrl: 'https://api.example.com',
  apiPrefix: '/api',
  getAuthHeaders: async () => {
    const token = await getAuthToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  },
  isBundled: () => {
    return window.location.protocol === 'capacitor:';
  }
});
```

### Making Requests

```typescript
// GET request
const response = await apiClient.get('/users');
const data = await response.json();

// POST request
const response = await apiClient.post('/users', { name: 'John' });

// Cached GET request
const response = await apiClient.getCached('/users');

// Skip cache
const response = await apiClient.getCached('/users', { skipCache: true });
```

### Cache Management

```typescript
// Invalidate cache by pattern
await apiClient.invalidateCache('/users');

// Clear all cache
await apiClient.clearCache();
```

## Copyright

Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.


