# @aksara/hooks

Custom React hooks for Aksara Framework.

## Installation

```bash
npm install @aksara/hooks
```

## Usage

### useAsync

Handle async operations with loading and error states.

```typescript
import { useAsync } from '@aksara/hooks';

const { data, loading, error, execute, reset } = useAsync(
  async () => {
    const response = await fetch('/api/users');
    return response.json();
  },
  { immediate: true }
);
```

### useDebounce

Debounce a value.

```typescript
import { useDebounce } from '@aksara/hooks';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

### useLocalStorage

Manage localStorage with React state.

```typescript
import { useLocalStorage } from '@aksara/hooks';

const [value, setValue, removeValue] = useLocalStorage('key', 'initialValue');
```

### useMounted

Check if component is mounted.

```typescript
import { useMounted } from '@aksara/hooks';

const isMounted = useMounted();

useEffect(() => {
  if (isMounted()) {
    // Safe to update state
  }
}, []);
```

### usePrevious

Get previous value.

```typescript
import { usePrevious } from '@aksara/hooks';

const previousValue = usePrevious(currentValue);
```

### useToggle

Boolean toggle state.

```typescript
import { useToggle } from '@aksara/hooks';

const [isOpen, toggle, setIsOpen] = useToggle(false);
```

## Copyright

Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.


