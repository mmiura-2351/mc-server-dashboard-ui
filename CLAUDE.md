# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Minecraft Server Management Dashboard frontend built with Next.js 15 (App Router) and TypeScript. It provides comprehensive server management capabilities including user authentication, server lifecycle management, player groups, backup systems, and multi-language support.

**Backend Dependency**: This frontend depends on the FastAPI backend located at `../mc-server-dashboard-api/`. The backend must be running before starting the frontend.

### Backend API Features
- FastAPI-based Python backend with SQLAlchemy ORM
- JWT token authentication with role-based access control
- Real-time WebSocket communication for logs and status
- Server lifecycle management (start/stop/status)
- Player group management (OP/whitelist)
- Backup and restore system
- File management capabilities

## Development Commands

```bash
# IMPORTANT: Start backend API first!
cd ../mc-server-dashboard-api
uv run fastapi dev       # Backend on http://localhost:8000

# Then start frontend (in this directory)
npm run dev              # Start dev server with Turbopack on http://localhost:3000
npm run build           # Build for production
npm run start           # Start production server

# Code Quality (run these before committing)
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format with Prettier
npm run format:check    # Check formatting
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run tests once
npm run test:watch      # Run tests in watch mode

# Running a single test file
npm test -- src/components/auth/login-form.test.tsx
```

## Architecture Patterns

### Error Handling with neverthrow

This codebase uses functional error handling with `neverthrow` Result types instead of exceptions:

```typescript
// All async operations return Result<T, E>
const result = await authService.login(username, password);
if (result.isErr()) {
  // Handle error
  return;
}
// Access success value
const user = result.value;
```

### API Communication Pattern

All API calls go through `fetchWithErrorHandling` in services, which:
1. Automatically adds Authorization headers from localStorage
2. Returns Result types for consistent error handling
3. Centralizes error response parsing
4. Handles FastAPI backend endpoints with `/api/v1/` prefix

```typescript
// Example service pattern
export async function getServers(): Promise<Result<Server[], string>> {
  return fetchWithErrorHandling<Server[]>('/api/v1/servers');
}

// All endpoints are prefixed with /api/v1/
// - /api/v1/auth/token (login)
// - /api/v1/users/register (registration)
// - /api/v1/servers (server management)
// - /api/v1/groups (player groups)
// - /api/v1/backups (backup system)
```

### Context-Based State Management

Two main contexts manage global state:

1. **AuthContext** (`src/contexts/auth.tsx`): 
   - Manages user authentication state and tokens
   - Provides login/logout/register functions
   - Persists auth data to localStorage

2. **LanguageContext** (`src/contexts/language.tsx`):
   - Handles language switching between 'ja' and 'en'
   - Loads translations from `src/i18n/messages/`

### Component Organization

Components are organized by feature with colocated tests and styles:

```
src/components/auth/
├── login-form.tsx          # Component
├── login-form.test.tsx     # Tests
└── auth-form.module.css    # Styles
```

### Testing Approach

- Uses Vitest with React Testing Library
- Test setup in `src/test/setup.ts` provides global mocks for Next.js router and localStorage
- Tests focus on user behavior rather than implementation details
- Mock API responses using `vi.mock()` for service modules

## Key Implementation Details

### Authentication Flow

1. Login credentials are sent as `application/x-www-form-urlencoded` to `/api/v1/auth/token`
2. JWT token is stored in localStorage as `authToken`
3. User data is stored in localStorage as `currentUser`
4. All authenticated requests include `Authorization: Bearer ${token}` header
5. Users must be approved by admin (`is_approved` flag) to access the system
6. First registered user automatically becomes admin with approval
7. Role-based access control: admin/operator/user roles
8. JWT tokens expire after 30 minutes (configurable in backend)

### Server Management

#### Server Types
The system supports three Minecraft server types:
- `vanilla`: Official Minecraft server
- `paper`: Paper server (performance-optimized)
- `forge`: Forge server (modded)

#### Server Status Types
- `stopped`: Server is not running
- `starting`: Server is in startup process
- `running`: Server is active and accepting connections
- `stopping`: Server is shutting down
- `error`: Server encountered an error

#### Real-time Features
- WebSocket connections for live server logs
- Real-time server status monitoring
- System notifications via WebSocket
- Console command execution with live feedback

### Internationalization

- Uses `next-intl` for i18n support
- Translation files in `src/i18n/messages/`
- Language preference stored in localStorage
- Components use `t('key')` for translations

## Environment Configuration

Create `.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Environment
The backend requires these environment variables in `../mc-server-dashboard-api/.env`:
```
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./app.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Common Patterns to Follow

1. **Always use Result types** for async operations - never throw exceptions
2. **Early returns** to avoid deep nesting
3. **Functional components** with hooks - no class components
4. **CSS Modules** for styling - no global styles except in globals.css
5. **Type everything** - avoid `any` types (ESLint will warn)
6. **Colocate related files** - keep tests and styles with components
7. **Backend dependency** - Always ensure backend API is running
8. **API prefixes** - All backend endpoints use `/api/v1/` prefix
9. **WebSocket auth** - Include JWT token in WebSocket connections
10. **Error boundaries** - Handle API connection failures gracefully