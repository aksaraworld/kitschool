# @aksara/context

React context utilities for Aksara Framework.

## Installation

```bash
npm install @aksara/context
```

## Usage

### createContextWithHook

Create a context with a custom hook that throws if used outside provider.

```typescript
import { createContextWithHook } from '@aksara/context';
import { createContext, useContext } from 'react';

interface MyContextType {
  value: string;
  setValue: (value: string) => void;
}

const [MyContext, useMyContext] = createContextWithHook<MyContextType>(
  'MyContext',
  'useMyContext must be used within MyProvider'
);

export function MyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('');
  
  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
}

// Usage
function MyComponent() {
  const { value, setValue } = useMyContext();
  // ...
}
```

## Copyright

Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.


