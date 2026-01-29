# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ParkiU Admin is a parking lot management system built as a point-of-sale application with robust offline capabilities and real-time synchronization. The system handles vehicle entry/exit operations, parking space management, pricing, and transaction history.

**Key Characteristics:**
- Designed for unreliable internet connections with offline-first architecture
- Uses Auth0 for authentication with role-based access control
- Real-time updates via Socket.io when online
- IndexedDB for local persistence and offline queue management
- Optional thermal printer support via QZ Tray

## Common Commands

### Development
```bash
npm run dev              # Start development server (port 5173)
npm run dev:clean        # Kill existing vite processes and start fresh
npm run build            # TypeScript compilation + production build
npm run preview          # Preview production build locally
```

### Testing
```bash
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
```

### Code Quality
```bash
npm run lint             # Run ESLint on all files
```

### Utilities
```bash
npm run clean            # Remove node_modules and reinstall dependencies
npm run ports            # Check what's running on ports 5173/5174
```

### Running Individual Tests
```bash
npx vitest run src/path/to/file.test.tsx           # Run specific test file
npx vitest run src/path/to/file.test.tsx -t "test name"  # Run specific test
```

## Architecture Overview

### Tech Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** TailwindCSS with shadcn/ui-inspired components
- **State Management:** Zustand (global UI state), React Query (server state)
- **Database:** Dexie.js wrapper for IndexedDB (local storage)
- **Auth:** Auth0 with JWT tokens
- **Real-time:** Socket.io client for live updates
- **Routing:** React Router v7
- **Build:** Vite with code splitting and tree shaking

### Project Structure

```
src/
├── api/                    # API layer
│   ├── client.ts          # Axios client with Auth0 interceptors
│   ├── hooks/             # React Query hooks for data fetching
│   └── services/          # API service functions
├── components/            # Reusable UI components
│   ├── common/           # Generic components (Button, Card, Dialog, etc.)
│   ├── vehicles/         # Vehicle-specific components
│   └── parking/          # Parking-specific components
├── features/             # Feature modules (self-contained)
│   ├── auth/            # Authentication & authorization
│   ├── dashboard/       # Statistics and overview
│   ├── parking/         # Parking lot management
│   ├── vehicles/        # Vehicle entry/exit
│   ├── onboarding/      # Initial setup flow
│   └── settings/        # Application settings
├── db/                   # IndexedDB schema (Dexie)
│   └── schema.ts        # Vehicle, ParkingSpot, Transaction, OfflineOperation tables
├── services/            # Business logic services
│   ├── offlineQueue.ts  # Queue management for offline operations
│   ├── offlineSync.ts   # Sync engine for pending operations
│   ├── connectionService.ts  # Online/offline detection
│   └── printing/        # QZ Tray integration for thermal printing
├── store/               # Zustand global state
│   └── useStore.ts      # UI state (offline status, syncing, current view)
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── layouts/             # Layout components (MainLayout with sidebar)
```

## Key Architectural Patterns

### Offline-First Architecture

The application is designed to work seamlessly offline and sync when connectivity returns.

**Offline Queue System:**
- Located in `src/services/offlineQueue.ts` and `src/services/offlineSync.ts`
- All vehicle entry/exit operations are queued in IndexedDB with idempotency keys
- When online, operations sync automatically via `syncPendingOperations()`
- Idempotency keys prevent duplicate operations on retry

**Connection State:**
- Managed by `connectionService` (`src/services/connectionService.ts`)
- Global state in Zustand store (`isOffline`, `isSyncing`)
- Axios interceptor automatically detects network errors and updates offline state
- UI components react to `isOffline` state to show banners and adjust behavior

**IndexedDB Schema:**
- Defined in `src/db/schema.ts` using Dexie
- Tables: `vehicles`, `parkingSpots`, `transactions`, `operations`
- Each record has `syncStatus`: 'synced' | 'pending' | 'error'

### Authentication & Authorization

**Auth0 Integration:**
- Configuration in `.env` file (domain, client ID, audience)
- `AuthProvider` wraps the app and provides Auth0 context
- `setAuth0Client()` in `src/api/client.ts` registers Auth0 for token management
- Tokens automatically added to requests via Axios interceptor

**Role-Based Access Control:**
- Roles: `global_admin`, `local_admin`, `operator`, `temp_admin`
- `RoleGuard` component protects routes based on allowed roles
- `useOperationPermissions()` hook provides granular permission checks
- Role hierarchy enforced at routing level in `App.tsx`

**Permission Examples:**
- Vehicle operations (entry/exit): `global_admin`, `local_admin`, `operator` only
- Parking view: All roles including `temp_admin` (read-only for pending users)
- Settings/pricing: `global_admin` and `local_admin` only

### Data Fetching Strategy

**React Query Pattern:**
- All server state managed via React Query hooks in `src/api/hooks/`
- Stale time and cache configuration in `App.tsx` query client
- Automatic retry logic: 2 retries for queries, 1 for mutations
- Real-time invalidation triggered by Socket.io events

**Example Hook Structure:**
```typescript
// Pattern used throughout api/hooks/
export const useVehicles = (parkingLotId: string) => {
  return useQuery({
    queryKey: ['vehicles', parkingLotId],
    queryFn: () => VehicleService.getVehicles(token, parkingLotId),
    staleTime: 30000,
  });
};
```

### Real-Time Updates

**Socket.io Integration:**
- Connection established when user has active parking lot
- Listens for events: `vehicle_entry`, `vehicle_exit`, `space_update`
- Invalidates React Query cache to trigger refetch
- Automatically reconnects on network recovery

### Component Organization

**Feature-Based Structure:**
- Each feature in `src/features/` is self-contained with components, hooks, types
- Export index files for clean imports
- Common components in `src/components/common/` follow shadcn/ui patterns

**Component Pattern:**
- Functional components with TypeScript interfaces for props
- Composition over configuration (small, composable components)
- Use `@/` alias for absolute imports (configured in vite.config.ts and tsconfig.json)

### Printing System

**QZ Tray Integration:**
- Optional thermal printer support for receipts
- Located in `src/services/printing/qz.ts`
- Fallback to HTML printing if QZ Tray unavailable
- ESC/POS commands for 80mm thermal printers
- Status indicator in UI (`QZTrayStatus` component)

## Important Conventions

### Path Aliases
Always use `@/` for imports from `src/`:
```typescript
import { useStore } from '@/store/useStore';
import { Button } from '@/components/common/Button';
```

### TypeScript
- Strict mode enabled
- No unused locals/parameters allowed
- Use explicit types for props interfaces
- Prefer `interface` over `type` for component props

### State Management
- Server state: React Query (queries/mutations)
- Global UI state: Zustand (`useStore`)
- Local component state: `useState`
- Never mix concerns - server data goes in React Query, not Zustand

### Error Handling
- API errors caught by Axios interceptor
- Network errors trigger offline mode
- User-facing errors shown via Toast notifications
- Console errors for debugging (removed in production builds)

### Offline Operations
When implementing features that modify data:
1. Add operation to offline queue via `enqueueOperation()`
2. Include idempotency key using `generateIdempotencyKey()`
3. Update local IndexedDB immediately for optimistic UI
4. Let sync service handle server updates when online

### Role Checking
- Use `RoleGuard` component for route protection
- Use `useOperationPermissions()` hook for UI-level permission checks
- Never assume user has permission - always check role/status

## Environment Variables

Required in `.env`:
```bash
VITE_API_BACKEND_URL=http://localhost:8080          # Backend API URL
VITE_AUTH0_DOMAIN=your-tenant.auth0.com             # Auth0 tenant
VITE_AUTH0_CLIENT_ID=your_client_id                 # Auth0 app client ID
VITE_AUTH0_AUDIENCE=https://parkiu/api              # Auth0 API identifier
VITE_AUTH0_CALLBACK_URL=http://localhost:5173/callback
VITE_GOOGLE_MAPS_API_KEY=your_api_key               # For parking lot location
```

## Backend Expectations

The frontend expects the following from the backend:

**Authentication:**
- Accepts `Authorization: Bearer <token>` header
- Returns 401 for invalid/expired tokens
- Returns 403 for insufficient permissions

**Endpoints:**
- Vehicle operations: POST `/parking-lots/:id/vehicles/entry`, `/parking-lots/:id/vehicles/exit`
- Idempotency: Honors `X-Idempotency-Key` header
- Admin profile: GET `/admin/profile/` (returns role, status, parking lots)

**Real-time:**
- Socket.io server emits: `vehicle_entry`, `vehicle_exit`, `space_update`
- Clients join room by parking lot ID

## Testing

**Test Setup:**
- Vitest with jsdom environment
- Testing Library for React components
- Setup file: `src/test/setup.ts`
- Mock Auth0 and API calls in tests

**Test Locations:**
- Co-located with source files: `__tests__/` folders
- Example: `src/features/auth/components/__tests__/RoleGuard.test.tsx`

## Common Pitfalls & Solutions

**React Hook Errors:**
- Multiple React copies can cause "Invalid hook call" errors
- Fixed by `dedupe` in vite.config.ts - don't remove this

**Offline Mode Not Working:**
- Check that `connectionService.initialize()` is called in App.tsx
- Verify Axios interceptor in `api/client.ts` is catching network errors
- Ensure operations use idempotency keys

**Auth Token Issues:**
- Token is fetched automatically by Axios interceptor
- If manual token needed, use `getToken()` from `api/client.ts`
- Don't call `getTokenSilently()` directly - use the helper

**Build Warnings:**
- Lottie eval warning is suppressed in vite.config.ts (safe to ignore)
- Chunk size warnings appear if vendor chunks exceed 1MB

## Code Style

- Use TypeScript for all new code
- Follow ESLint rules (run `npm run lint`)
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused (<300 lines)
- Extract complex logic to custom hooks
- Use early returns for guard clauses
