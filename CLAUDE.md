# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standard Development Rules

### Rule 1: New Rule Addition Process

**Continuously improve project standards through rule documentation.**

When receiving instructions from users that appear to require ongoing compliance (not just one-time implementation):

1. Ask: "Should I make this a standard rule?"
2. If YES response is received, add it to CLAUDE.md as an additional rule
3. Apply it as a standard rule for all future interactions

This process enables continuous improvement of project rules and ensures consistent behavior across sessions.

### Rule 2: Task Completion and CI Verification

**Always verify CI passes and commit changes after completing any task.**

When completing any significant task or feature implementation:

1. **Pre-commit Verification**: The pre-commit hook automatically runs all CI checks:
   - **Lint-staged**: Automatically fixes ESLint and Prettier issues for staged files
   - **Type Check**: Runs TypeScript type checking (`npm run type-check`)
   - **Tests**: Runs full test suite (`npm test`)
2. **Manual CI Verification**: If needed, manually run CI checks:
   - `npm run lint` - ESLint checking
   - `npm run format:check` - Prettier formatting check
   - `npm run type-check` - TypeScript type checking
   - `npm test` - Run test suite
3. **Commit Changes**: Create meaningful commit messages with proper documentation
4. **Status Update**: Update relevant tracking documents if applicable

**Pre-commit Hook Features:**

- Automatically fixes linting and formatting issues for staged files
- Prevents commits with type errors or failing tests
- Matches all CI pipeline checks for consistency
- Provides clear error messages with fix instructions

### Rule 3: Test Code Development Process

**Follow systematic approach for test coverage improvement.**

When creating test coverage for components or services:

1. **Establish Target Coverage**: Set target coverage percentage based on component criticality
2. **Analyze Required Testing Elements**:
   - Analyze the component/service implementation thoroughly
   - Identify uncovered lines, error paths, and edge cases
   - Understand props, state changes, user interactions, and API calls
   - Review existing tests to avoid duplication
3. **Create Tests Based on Analysis**:
   - Create comprehensive test cases targeting specific uncovered areas
   - Focus on error handling, user interactions, and business logic validation
   - Use appropriate mocking strategies for external dependencies (API calls, localStorage)
4. **Iterate Until Coverage Target is Met**:
   - Run coverage reports to identify remaining gaps
   - Iterate on analysis and implementation until target coverage is achieved
   - Ensure all tests pass and maintain code quality standards

### Rule 4: Code Review Issue Creation

**Create GitHub Issues for improvements, bugs, and missing features found during code reviews.**

When reviewing source code and identifying areas for improvement:

1. **Create GitHub Issues**: For any bugs, improvement opportunities, or missing features discovered during code review
2. **Categorize Issues**: Use appropriate labels (bug, enhancement, feature-request, etc.)
3. **Provide Context**: Include relevant code references, file paths, and line numbers
4. **Document Impact**: Describe the potential impact and benefits of addressing the issue

### Rule 5: Standard Issue Resolution Process

**Follow systematic approach when fixing GitHub Issues.**

When addressing GitHub Issues, follow this standard procedure:

1. **Create Issue Branch**: Create a dedicated branch for the issue and attach it to the issue
2. **Analyze Issue Details**: Thoroughly understand the issue requirements and perform necessary analysis
3. **Create Sub-Issues**: If needed, create sub-issues to break down complex problems into manageable parts
4. **Deep Implementation Planning**: Think deeply about all elements required for implementation based on your analysis
5. **Implement Solution**: Perform the implementation and fixes following project standards
6. **Verify and Create PR**: Confirm the issue has been properly addressed and create a pull request

### Rule 6: Test Execution Guidelines

**Be mindful of test execution performance and timeouts.**

When running tests, follow these guidelines:

1. **Avoid Full Test Suite Timeouts**: Running all tests may result in timeouts. Focus on running minimal, targeted tests when possible
2. **Extend Timeout for Full Suite**: When running the complete test suite is necessary, explicitly extend the timeout duration (e.g., use `--timeout=300000` parameter)

### Rule 7: Issue Resolution Completion Process

**Always close resolved Issues with proper documentation and status updates.**

When completing issue resolution:

1. **Verify Resolution**: Ensure all issue requirements have been fully addressed
2. **Document Changes**: Update relevant documentation (README, CLAUDE.md, etc.) if needed
3. **Test Validation**: Confirm all tests pass and functionality works as expected
4. **Close with Summary**: Close issues with a summary of changes made and references to related PRs

### Rule 8: Git/GitHub Workflow Standards

**Follow standardized Git and GitHub practices for consistent project management.**

**Branch Management:**

1. **Issue-based Branches**: Create branches following pattern `fix/issue-{number}-{brief-description}` or `feature/issue-{number}-{brief-description}`
2. **Keep Branches Focused**: One branch per issue/feature to maintain clear history
3. **Regular Updates**: Keep feature branches updated with latest main changes

**Pull Request Workflow:**

**Pull Request Preparation:**

1. **Update with Main**: Before creating PR, ensure feature branch is updated with latest main (`git pull origin main` or `git rebase origin/main`)
2. **Resolve Conflicts**: Address any merge conflicts locally before pushing
3. **Verify CI**: Ensure all tests pass and code quality checks succeed (`npm run lint`, `npm run type-check`, `npm test`)
4. **Format Check**: Always run `npm run format:check` before committing to ensure consistent code formatting
5. **Clean History**: Consider interactive rebase for cleaner commit history if needed

**Pull Request Creation:**

1. **Descriptive Titles**: Use clear, descriptive PR titles that explain the change
2. **Comprehensive Descriptions**: Include summary, changes made, testing approach, and impact assessment
3. **Link Issues**: Always link related issues using "Resolves #X" or "Fixes #X"
4. **Request Reviews**: Assign appropriate reviewers and respond to feedback promptly

**Issue Management:**

1. **Clear Descriptions**: Write detailed issue descriptions with clear acceptance criteria
2. **Proper Labels**: Use appropriate labels (bug, enhancement, documentation, etc.)
3. **Priority Setting**: Assign priority levels to help with work planning
4. **Progress Updates**: Keep issues updated with progress and blockers

### Rule 9: Pull Request Review Process

**Conduct thorough code reviews and provide comprehensive feedback on GitHub Pull Requests.**

**Review Guidelines:**

1. **Comprehensive Coverage**: Review code quality, functionality, tests, documentation, and security implications
2. **Constructive Feedback**: Provide specific, actionable feedback with suggestions for improvement
3. **Code Standards**: Verify adherence to project coding standards and architectural patterns
4. **Testing Verification**: Ensure adequate test coverage and that all tests pass

**Review Process:**

1. **Use GitHub CLI**: Utilize `gh pr view` and `gh pr review` commands for efficient review workflow
2. **Structured Comments**: Organize feedback into categories (bugs, improvements, questions, suggestions)
3. **Approval Criteria**: Only approve PRs that meet all quality standards and fully address the issue
4. **Follow-up Actions**: Track that feedback is addressed before final approval and merge

### Rule 10: Pull Request Merge Strategy

**Use squash merge as the default merge strategy for pull requests.**

When merging pull requests:

1. **Default to Squash Merge**: Use `gh pr merge <number> --squash` to maintain a clean commit history
2. **Clean Commit Message**: Ensure the squashed commit has a clear, descriptive message
3. **Delete Merged Branches**: Always delete the feature branch after successful merge
4. **Update Related Issues**: Ensure linked issues are properly closed with the merge

Benefits of squash merge:

- Maintains clean, linear commit history
- Groups all PR changes into a single commit
- Makes it easier to revert changes if needed
- Keeps the main branch history readable

### Rule 11: Pre-Pull Request CI Verification

**Always verify CI checks locally before creating or updating pull requests.**

When preparing to create or update a pull request:

1. **Run Full CI Check Suite**:

   ```bash
   npm run lint          # ESLint checking
   npm run format:check  # Prettier formatting check
   npm run type-check    # TypeScript type checking
   npm test             # Run test suite
   ```

2. **Fix Any Issues Before Pushing**:

   - If formatting issues: Run `npm run format` to auto-fix
   - If linting issues: Run `npm run lint:fix` for auto-fixable issues
   - If type errors: Fix TypeScript errors manually
   - If test failures: Debug and fix failing tests

3. **Verify New Files**:

   - Ensure all new files are properly formatted
   - Run format check specifically on new files before first commit
   - Pre-commit hooks may not catch all issues in new files

4. **CI Failure Recovery**:
   - If CI fails after pushing, fix locally first
   - Run the specific failed check locally to verify fix
   - Commit with descriptive message about what was fixed

This prevents CI failures and reduces unnecessary commit noise in pull requests.

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

### Initial Setup

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Configure environment variables (optional - defaults work for development)
# Edit .env.local if you need custom API URL or other settings
```

### Running the Application

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

# Testing with Coverage
npm run test:coverage              # Run tests with coverage report
npm run test:coverage:watch        # Run tests with coverage in watch mode
npm run coverage:report            # Generate detailed coverage report
npm run coverage:open              # Open HTML coverage report in browser

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
  return fetchWithErrorHandling<Server[]>("/api/v1/servers");
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

#### Coverage Reporting

This project has comprehensive test coverage reporting configured with the following targets:

- **Lines**: 80% coverage target
- **Functions**: 80% coverage target
- **Branches**: 75% coverage target
- **Statements**: 80% coverage target

**Coverage Commands:**

```bash
npm run test:coverage              # Run tests with coverage report
npm run test:coverage:watch        # Run tests with coverage in watch mode
npm run coverage:report            # Generate detailed coverage report
npm run coverage:open              # Open HTML coverage report in browser
```

**Coverage Reports:**

- **Terminal**: Summary displayed in terminal after test runs
- **HTML Report**: Detailed interactive report at `./coverage/index.html`
- **LCOV**: Standard format for CI/CD integration at `./coverage/lcov.info`
- **JSON**: Programmatic access at `./coverage/coverage-final.json`

The coverage configuration excludes test files, type definitions, and Next.js boilerplate files to focus on actual application logic. Current coverage is maintained above 80% for all metrics.

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

### Internationalization (i18n)

**Important**: Always write components with i18n in mind. This project supports Japanese and English languages.

- Uses `next-intl` for i18n support
- Translation files in `src/i18n/messages/en.json` and `src/i18n/messages/ja.json`
- English is the default language
- Language preference stored in localStorage
- Components must use `useTranslation()` hook and `t('key')` for all user-facing text

#### i18n Implementation Guidelines

1. **Never hardcode user-facing strings** - Always use translation keys
2. **Import useTranslation hook** in all components that display text
3. **Use descriptive translation keys** with dot notation (e.g., `servers.settings.title`)
4. **Support parameterized translations** for dynamic content (e.g., `t('errors.operationFailed', { action })`)
5. **Update both en.json and ja.json** when adding new translations
6. **Test with translation mocks** to ensure proper i18n behavior

```typescript
// ✅ Good - Using i18n
import { useTranslation } from "@/contexts/language";

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("servers.title")}</h1>
      <button>{t("common.save")}</button>
      <p>{t("errors.operationFailed", { action: "start" })}</p>
    </div>
  );
}

// ❌ Bad - Hardcoded strings
export function MyComponent() {
  return (
    <div>
      <h1>Servers</h1>
      <button>Save</button>
      <p>Failed to start server</p>
    </div>
  );
}
```

#### Testing with i18n

When writing tests, mock the translation function appropriately:

```typescript
// For tests, provide translation mocks
const translations: Record<string, string> = {
  "servers.title": "Servers",
  "common.save": "Save",
  "errors.operationFailed": "Failed to {action} server",
};

const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));
```

## Environment Configuration

### Frontend Environment Setup

1. **Copy the environment template:**

   ```bash
   cp .env.example .env.local
   ```

2. **Configure environment variables** (optional - defaults work for development):

   ```bash
   # .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_APP_NAME=MC Server Dashboard
   NEXT_PUBLIC_DEFAULT_LANGUAGE=en
   NODE_ENV=development
   ```

3. **Available Environment Variables:**

   - `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000)
   - `NEXT_PUBLIC_APP_NAME`: Application name displayed in UI (default: MC Server Dashboard)
   - `NEXT_PUBLIC_DEFAULT_LANGUAGE`: Default language (en/ja, default: en)
   - `NODE_ENV`: Environment mode (development/production)
   - `NEXT_RUNTIME_ENV`: Runtime environment override for deployment scenarios (optional)

4. **Runtime Environment Override:**

   For HTTP-only deployments where `npm start` forces HTTPS redirects, use `NEXT_RUNTIME_ENV` to override environment detection:

   ```bash
   # For systemd service or deployment scripts
   Environment=NEXT_RUNTIME_ENV=development

   # Or in .env.local
   NEXT_RUNTIME_ENV=development
   ```

   This prevents HTTPS redirects and security headers that interfere with HTTP-only deployments while maintaining production build optimizations.

### Backend Environment

The backend requires these environment variables in `../mc-server-dashboard-api/.env`:

```
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./app.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### API Documentation

When developing with the backend API, you can access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs#/ - Interactive API documentation with request/response examples
- **OpenAPI JSON**: http://localhost:8000/openapi.json - Raw OpenAPI specification for API reference

These endpoints are available when the backend development server is running and provide comprehensive documentation of all available API endpoints, request formats, and response schemas.

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
11. **Internationalization** - Always use `useTranslation()` hook and `t('key')` for user-facing text - never hardcode strings

### Rule 12: Context Function Stability

**Always use useCallback for functions in React Contexts to prevent infinite re-render loops.**

This project has experienced multiple instances of infinite API request loops caused by unstable context functions. When context functions are recreated on every render, components using these functions in useEffect dependency arrays will continuously re-execute.

**Problem Pattern:**

```typescript
// ❌ BAD: Functions recreated on every render
export function SomeContext() {
  const someFunction = () => {
    /* ... */
  };
  const anotherFunction = (param: string) => {
    /* ... */
  };

  return { someFunction, anotherFunction };
}

// Component using the context
function MyComponent() {
  const { someFunction } = useSomeContext();

  useEffect(() => {
    // This will run on every render because someFunction changes
    someApiCall();
  }, [someFunction]); // ← Causes infinite loop
}
```

**Solution Pattern:**

```typescript
// ✅ GOOD: Stable functions with useCallback
export function SomeContext() {
  const someFunction = useCallback(() => {
    /* ... */
  }, []); // Empty deps if no dependencies

  const anotherFunction = useCallback((param: string) => {
    /* ... */
  }, []); // Add dependencies as needed

  return { someFunction, anotherFunction };
}
```

**Mandatory useCallback Usage:**

1. **All functions returned from Contexts must use useCallback**
2. **Functions passed as props to components should use useCallback**
3. **Functions used in useEffect dependency arrays must be stable**

**Common Context Functions to Stabilize:**

- Authentication functions: `login`, `logout`, `register`
- Translation functions: `t` (translation function)
- API service functions: `fetchData`, `updateData`, `deleteData`
- Navigation functions: `navigateToPage`, `goBack`

**Historical Issues:**

- Issue #129: Infinite `/api/v1/servers` requests (191 calls/second) caused by unstable `logout` and `t` functions
- Multiple similar incidents in AuthContext and LanguageContext

**Detection:**

- Symptoms: Infinite API calls, browser performance degradation, rapid console log generation
- Monitoring: Check browser network tab for repeated identical requests
- Debug: Add logging to useEffect to identify which dependencies are changing

**Testing:**

```typescript
// Test that functions are stable across renders
test("context functions should be stable", () => {
  const { result, rerender } = renderHook(() => useMyContext());
  const initialFunction = result.current.myFunction;

  rerender();

  expect(result.current.myFunction).toBe(initialFunction);
});
```

This rule is critical for maintaining application performance and preventing resource exhaustion.
