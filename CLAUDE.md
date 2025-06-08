# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Minecraft Server Management Dashboard frontend built with Next.js 15 (App Router) and TypeScript. It provides user authentication, server management, and multi-language support for managing Minecraft servers.

## Development Commands

```bash
# Development
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

```typescript
// Example service pattern
export async function getServers(): Promise<Result<Server[], string>> {
  return fetchWithErrorHandling<Server[]>('/servers');
}
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

1. Login credentials are sent as `application/x-www-form-urlencoded` to `/auth/token`
2. JWT token is stored in localStorage as `authToken`
3. User data is stored in localStorage as `currentUser`
4. All authenticated requests include `Authorization: Bearer ${token}` header
5. Users must be approved by admin (`is_approved` flag) to access the system

### Server Management Types

The system supports three Minecraft server types:
- `vanilla`: Official Minecraft server
- `paper`: Paper server (performance-optimized)
- `forge`: Forge server (modded)

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

## Common Patterns to Follow

1. **Always use Result types** for async operations - never throw exceptions
2. **Early returns** to avoid deep nesting
3. **Functional components** with hooks - no class components
4. **CSS Modules** for styling - no global styles except in globals.css
5. **Type everything** - avoid `any` types (ESLint will warn)
6. **Colocate related files** - keep tests and styles with components