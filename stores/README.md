# Zustand State Management

This project uses [Zustand](https://github.com/pmndrs/zustand) for client-side state management.

## Why Zustand?

- **Simple API**: Minimal boilerplate compared to Redux
- **TypeScript Support**: Excellent TypeScript inference
- **Small Bundle Size**: Only ~1KB gzipped
- **No Context Providers**: Direct store access without Provider wrappers
- **Devtools Support**: Works with Redux DevTools

## Store Structure

All Zustand stores are located in the `/stores` directory:

```
stores/
├── README.md
├── useIntegrationsStore.ts    # Integrations page state
├── useTableStore.ts            # Table filtering state
├── useForgotPasswordStore.ts  # Forgot password form state
└── useAuthCallbackStore.ts    # Auth callback flow state
```

## Creating a New Store

### 1. Basic Store Pattern

```typescript
import { create } from 'zustand';

interface MyState {
  // State properties
  count: number;
  name: string;

  // Actions
  increment: () => void;
  setName: (name: string) => void;
  reset: () => void;
}

export const useMyStore = create<MyState>((set) => ({
  // Initial state
  count: 0,
  name: '',

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  setName: (name) => set({ name }),
  reset: () => set({ count: 0, name: '' }),
}));
```

### 2. Using the Store in Components

```typescript
'use client';

import { useMyStore } from '@/stores/useMyStore';

export default function MyComponent() {
  // Select only the state you need
  const count = useMyStore((state) => state.count);
  const increment = useMyStore((state) => state.increment);

  // Or select multiple values
  const { name, setName } = useMyStore((state) => ({
    name: state.name,
    setName: state.setName,
  }));

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
}
```

## Best Practices

### 1. Keep Stores Focused

Each store should manage a specific domain or feature:

```typescript
// ✅ Good - Focused on one feature
useTableStore.ts       // Table filtering and sorting
useModalStore.ts       // Modal state
useAuthStore.ts        // Authentication state

// ❌ Bad - Too generic
useAppStore.ts         // Everything mixed together
```

### 2. Use Selectors

Only subscribe to the state you need to prevent unnecessary re-renders:

```typescript
// ✅ Good - Only re-renders when count changes
const count = useMyStore((state) => state.count);

// ❌ Bad - Re-renders on any state change
const store = useMyStore();
const count = store.count;
```

### 3. Include a Reset Function

Always include a way to reset state to initial values:

```typescript
const initialState = {
  email: "",
  error: "",
  isLoading: false,
};

export const useFormStore = create<FormState>((set) => ({
  ...initialState,

  setEmail: (email) => set({ email }),
  setError: (error) => set({ error }),
  reset: () => set(initialState), // Reset to initial state
}));
```

### 4. Type Everything

Use TypeScript interfaces for type safety:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  users: User[];
  selectedUser: User | null;
  addUser: (user: User) => void;
  selectUser: (id: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  selectedUser: null,

  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  })),

  selectUser: (id) => {
    const user = get().users.find(u => u.id === id);
    set({ selectedUser: user || null });
  },
}));
```

## Advanced Patterns

### Async Actions

```typescript
export const useDataStore = create<DataState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

### Computed Values

```typescript
export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  // Computed value using get()
  getTotalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.price, 0);
  },
}));

// Usage
const totalPrice = useCartStore((state) => state.getTotalPrice());
```

### Store Composition

```typescript
// Combine multiple stores
export const useAppState = () => {
  const user = useUserStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const notifications = useNotificationStore((state) => state.notifications);

  return { user, theme, notifications };
};
```

## DevTools Integration

To use Redux DevTools:

```typescript
import { devtools } from 'zustand/middleware';

export const useMyStore = create<MyState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    { name: 'MyStore' }
  )
);
```

## Migrating from useState

Before (useState):
```typescript
const [count, setCount] = useState(0);
const [name, setName] = useState('');
```

After (Zustand):
```typescript
// 1. Create store
const useMyStore = create<MyState>((set) => ({
  count: 0,
  name: '',
  setCount: (count) => set({ count }),
  setName: (name) => set({ name }),
}));

// 2. Use in component
const count = useMyStore((state) => state.count);
const setCount = useMyStore((state) => state.setCount);
const name = useMyStore((state) => state.name);
const setName = useMyStore((state) => state.setName);
```

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand API Reference](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [TypeScript Guide](https://docs.pmnd.rs/zustand/guides/typescript)
