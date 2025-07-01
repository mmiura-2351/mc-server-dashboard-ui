# Connection Monitoring System

This module provides comprehensive backend API connection monitoring and automatic operation control for the MC Server Dashboard.

## Features

- **Real-time Connection Monitoring**: Continuously monitors backend API health
- **Automatic Operation Control**: Disables API-dependent operations when backend is unavailable
- **Visual Status Indicators**: Shows connection status with color-coded indicators
- **Warning Banners**: Displays prominent warnings during connection issues
- **Graceful Degradation**: Supports degraded connection modes
- **Internationalization**: Full Japanese and English language support
- **Accessibility**: Complete ARIA support and keyboard navigation

## Components

### ConnectionProvider

Wraps your application to provide connection monitoring context.

```tsx
import { ConnectionProvider } from "@/contexts/connection";

function App() {
  return (
    <ConnectionProvider autoStart={true} config={{ healthCheckInterval: 30000 }}>
      <YourApp />
    </ConnectionProvider>
  );
}
```

**Props:**
- `autoStart` (boolean): Start monitoring automatically on mount
- `config` (object): Custom configuration for monitoring behavior
- `monitor` (object): Custom monitor instance (for testing)

### ConnectionStatusIndicator

Displays current connection status with visual indicators.

```tsx
import { ConnectionStatusIndicator } from "@/components/connection/connection-status-indicator";

function Header() {
  return (
    <div>
      <ConnectionStatusIndicator 
        size="small" 
        position="inline"
        showDetails={true}
      />
    </div>
  );
}
```

**Props:**
- `size`: "small" | "medium" | "large" - Visual size of indicator
- `position`: "inline" | "fixed" - Positioning behavior
- `showDetails`: boolean - Show additional information in tooltip
- `className`: string - Custom CSS class

### ConnectionWarningBanner

Shows warning messages during connection issues.

```tsx
import { ConnectionWarningBanner } from "@/components/connection/connection-warning-banner";

function Layout() {
  return (
    <main>
      <ConnectionWarningBanner 
        showOnDegraded={true}
        dismissible={true}
        showDetails={true}
      />
      {children}
    </main>
  );
}
```

**Props:**
- `showOnDegraded`: boolean - Show banner for degraded connections
- `dismissible`: boolean - Allow user to dismiss banner
- `showDetails`: boolean - Show detailed error information
- `autoHide`: boolean - Auto-hide when connection restores

### Connection-Aware Components

#### ConnectionAwareButton

Button that automatically disables when API is unavailable.

```tsx
import { ConnectionAwareButton } from "@/components/connection/connection-aware";

function ServerControls() {
  return (
    <ConnectionAwareButton 
      allowDegraded={false}
      onClick={handleStartServer}
    >
      Start Server
    </ConnectionAwareButton>
  );
}
```

#### ConnectionAwareForm

Form that prevents submission when disconnected.

```tsx
import { ConnectionAwareForm } from "@/components/connection/connection-aware";

function CreateServerForm() {
  return (
    <ConnectionAwareForm onSubmit={handleSubmit}>
      <input name="serverName" />
      <button type="submit">Create Server</button>
    </ConnectionAwareForm>
  );
}
```

#### ConnectionGuard

Conditionally renders content based on connection state.

```tsx
import { ConnectionGuard } from "@/components/connection/connection-aware";

function ServerManagement() {
  return (
    <ConnectionGuard 
      allowDegraded={false}
      fallback={<div>Connection required for server management</div>}
    >
      <ServerDashboard />
    </ConnectionGuard>
  );
}
```

## Hooks

### useConnection

Access connection state and control functions.

```tsx
import { useConnection } from "@/contexts/connection";

function MyComponent() {
  const { 
    isConnected, 
    isDegraded, 
    isChecking,
    checkConnection,
    resetRetries 
  } = useConnection();
  
  if (!isConnected) {
    return <div>Please check your connection</div>;
  }
  
  return <div>Content when connected</div>;
}
```

### useConnectionAwareButton

Get props for connection-aware buttons.

```tsx
import { useConnectionAwareButton } from "@/components/connection/connection-aware";

function CustomButton() {
  const { connectionProps, ...buttonProps } = useConnectionAwareButton({
    allowDegraded: false,
    disableOnChecking: true
  });
  
  return (
    <button {...buttonProps}>
      {connectionProps.isConnected ? "Connected" : "Offline"}
    </button>
  );
}
```

### useConnectionAwareRender

Control rendering based on connection state.

```tsx
import { useConnectionAwareRender } from "@/components/connection/connection-aware";

function ConditionalFeature() {
  const { shouldRender, shouldDisable } = useConnectionAwareRender({
    allowDegraded: true
  });
  
  if (!shouldRender) {
    return <div>Feature unavailable offline</div>;
  }
  
  return (
    <div className={shouldDisable ? "disabled" : ""}>
      <AdvancedFeature />
    </div>
  );
}
```

### useConnectionStatus

Get formatted connection status information.

```tsx
import { useConnectionStatus } from "@/contexts/connection";

function StatusDisplay() {
  const { color, text, downtime, error } = useConnectionStatus();
  
  return (
    <div style={{ color }}>
      Status: {text}
      {downtime && <span>Downtime: {downtime}</span>}
      {error && <span>Error: {error.message}</span>}
    </div>
  );
}
```

## Higher-Order Components

### withConnectionAware

Wrap components to disable them when disconnected.

```tsx
import { withConnectionAware } from "@/components/connection/connection-aware";

const ServerControls = withConnectionAware(ServerControlsComponent, {
  allowDegraded: false,
  showDisconnectedMessage: true,
  disconnectedMessage: "Server controls require stable connection"
});
```

## Configuration

### Connection Monitor Configuration

```tsx
interface ConnectionMonitorConfig {
  healthCheckInterval: number;    // Default: 30000ms (30 seconds)
  timeout: number;               // Default: 5000ms (5 seconds)
  maxRetries: number;           // Default: 3
  retryBackoffMultiplier: number; // Default: 1.5
  healthEndpoint: string;        // Default: "/api/v1/health"
}
```

### Connection States

- **connected**: Backend is healthy and responsive
- **degraded**: Backend responds but with issues
- **disconnected**: Backend is not responding
- **checking**: Currently performing health check

## Error Handling

The system uses structured error handling with the following error types:

```tsx
interface ConnectionError {
  message: string;
  connectionStatus: "checking" | "failed" | "timeout" | "degraded";
  endpoint?: string;
  retryCount?: number;
  maxRetries?: number;
  lastSuccessfulConnection?: Date;
  downtime?: number;
  suggestions?: string[];
}
```

## Integration Examples

### Basic Layout Integration

```tsx
import { ConnectionProvider } from "@/contexts/connection";
import { ConnectionStatusIndicator } from "@/components/connection/connection-status-indicator";
import { ConnectionWarningBanner } from "@/components/connection/connection-warning-banner";

function Layout({ children }) {
  return (
    <ConnectionProvider>
      <header>
        <h1>My App</h1>
        <ConnectionStatusIndicator size="small" />
      </header>
      <main>
        <ConnectionWarningBanner showOnDegraded={true} />
        {children}
      </main>
    </ConnectionProvider>
  );
}
```

### API Service Integration

The connection monitoring automatically integrates with the existing `fetchWithErrorHandling` function. No additional changes needed for API calls.

### Form Validation Integration

```tsx
function CreateForm() {
  const { isConnected } = useConnection();
  
  const validate = (data) => {
    const errors = {};
    if (!isConnected) {
      errors.connection = "Connection required to submit form";
    }
    return errors;
  };
  
  return (
    <ConnectionAwareForm onSubmit={handleSubmit}>
      {/* form fields */}
    </ConnectionAwareForm>
  );
}
```

## Best Practices

1. **Wrap your app with ConnectionProvider** at the highest level possible
2. **Use ConnectionGuard** for components that absolutely require API access
3. **Use ConnectionAwareButton** for actions that trigger API calls
4. **Show connection status** in your main layout/header
5. **Provide fallback content** for offline scenarios
6. **Test with degraded connections** to ensure graceful degradation
7. **Use appropriate error messages** that guide users to solutions

## Testing

The connection monitoring system provides comprehensive test utilities:

```tsx
import { render } from "@testing-library/react";
import { ConnectionProvider } from "@/contexts/connection";

function renderWithConnection(component, connectionState = {}) {
  const mockMonitor = createMockMonitor(connectionState);
  
  return render(
    <ConnectionProvider monitor={mockMonitor}>
      {component}
    </ConnectionProvider>
  );
}
```

## Accessibility

All components include proper ARIA attributes:
- `role="status"` for status indicators
- `aria-live="polite"` for warning banners
- `aria-disabled` for disabled buttons
- Keyboard navigation support
- Screen reader compatible status messages

## Performance

The connection monitoring system is optimized for performance:
- Configurable check intervals (default: 30 seconds)
- Debounced state updates
- Efficient component re-renders
- Automatic cleanup on unmount
- Memory leak prevention