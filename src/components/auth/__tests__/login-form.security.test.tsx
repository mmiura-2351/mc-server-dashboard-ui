import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../login-form';

// Mock the auth context
const mockLogin = vi.fn();
vi.mock('@/contexts/auth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// Mock the input sanitizer
vi.mock('@/utils/input-sanitizer', () => ({
  InputSanitizer: {
    sanitizeUsername: vi.fn((input: string) => {
      if (!input) return '';
      return input.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }),
    sanitizeText: vi.fn((input: string) => {
      if (!input) return '';
      return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }),
  },
}));

describe('LoginForm Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Sanitization', () => {
    test('should sanitize username input in real-time', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      
      // Type input with control characters (these should be removed by sanitizeText)
      fireEvent.change(usernameInput, { target: { value: 'Test\x00User\x01' } });
      
      // Should be sanitized to remove control characters
      expect(usernameInput).toHaveValue('TestUser');
    });

    test('should sanitize text inputs to remove control characters', async () => {
      render(<LoginForm />);
      
      const _passwordInput = screen.getByLabelText(/password/i);
      
      // Type input with control characters
      fireEvent.change(_passwordInput, { target: { value: 'pass\x00word\x01' } });
      
      // Should remove control characters
      expect(_passwordInput).toHaveValue('password');
    });

    test('should clear error when user starts typing', async () => {
      mockLogin.mockResolvedValue({ isErr: () => true, error: { message: 'Invalid credentials' } });
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      // Submit with empty fields to trigger error
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username is required and must contain only valid characters/i)).toBeInTheDocument();
      });
      
      // Start typing in username field
      fireEvent.change(usernameInput, { target: { value: 'test' } });
      
      // Error should be cleared
      expect(screen.queryByText(/username is required and must contain only valid characters/i)).not.toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    test('should validate username length', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      // Enter short username
      fireEvent.change(usernameInput, { target: { value: 'ab' } });
      fireEvent.change(_passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters long/i)).toBeInTheDocument();
      });
    });

    test('should validate password length', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      // Enter short password
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(_passwordInput, { target: { value: '12345' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters long/i)).toBeInTheDocument();
      });
    });

    test('should validate empty fields', async () => {
      render(<LoginForm />);
      
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username is required and must contain only valid characters/i)).toBeInTheDocument();
      });
    });

    test('should validate sanitized empty fields', async () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      // Enter only invalid characters that will be sanitized away
      fireEvent.change(usernameInput, { target: { value: '@#$%' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username is required and must contain only valid characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle pending approval error gracefully', async () => {
      mockLogin.mockResolvedValue({
        isErr: () => true,
        error: { status: 403, message: 'User account pending approval' }
      });
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(_passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/your account is pending approval/i)).toBeInTheDocument();
      });
    });

    test('should handle 401 errors with generic message', async () => {
      mockLogin.mockResolvedValue({
        isErr: () => true,
        error: { status: 401, message: 'Unauthorized' }
      });
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(_passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
      });
    });

    test('should handle rate limiting errors', async () => {
      mockLogin.mockResolvedValue({
        isErr: () => true,
        error: { status: 429, message: 'Too many requests' }
      });
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(_passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
      });
    });

    test('should handle generic errors with safe message', async () => {
      mockLogin.mockResolvedValue({
        isErr: () => true,
        error: { status: 500, message: 'Internal server error' }
      });
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(_passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/login failed. please try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('HTML Input Attributes Security', () => {
    test('should have proper input attributes for security', () => {
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      
      // Username input security attributes
      expect(usernameInput).toHaveAttribute('minlength', '3');
      expect(usernameInput).toHaveAttribute('maxlength', '50');
      expect(usernameInput).toHaveAttribute('pattern', '[a-zA-Z0-9._-]+');
      expect(usernameInput).toHaveAttribute('title', 'Username must contain only letters, numbers, dots, underscores, and hyphens');
      
      // Password input security attributes
      expect(_passwordInput).toHaveAttribute('type', 'password');
      expect(_passwordInput).toHaveAttribute('minlength', '6');
      expect(_passwordInput).toHaveAttribute('maxlength', '128');
      expect(_passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  describe('Successful Login', () => {
    test('should call onSuccess callback after successful login', async () => {
      const mockOnSuccess = vi.fn();
      mockLogin.mockResolvedValue({ isErr: () => false, value: undefined });
      
      render(<LoginForm onSuccess={mockOnSuccess} />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(_passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledOnce();
      });
    });

    test('should pass sanitized credentials to login function', async () => {
      mockLogin.mockResolvedValue({ isErr: () => false, value: undefined });
      
      render(<LoginForm />);
      
      const usernameInput = screen.getByLabelText(/username/i);
      const _passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });
      
      // Enter username with whitespace and valid characters, and password with whitespace
      fireEvent.change(usernameInput, { target: { value: '  TestUser123  ' } });
      fireEvent.change(_passwordInput, { target: { value: '  validpassword123  ' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          username: 'testuser123', // Should be sanitized (trimmed, lowercased)
          password: 'validpassword123', // Should be trimmed
        });
      });
    });
  });
});