import { describe, test, expect } from 'vitest';
import { InputSanitizer } from '../input-sanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeHTML', () => {
    test('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      
      expect(InputSanitizer.sanitizeHTML(input)).toBe(expected);
    });

    test('should escape all dangerous characters', () => {
      const input = '&<>"\'/';
      const expected = '&amp;&lt;&gt;&quot;&#x27;&#x2F;';
      
      expect(InputSanitizer.sanitizeHTML(input)).toBe(expected);
    });

    test('should handle empty string', () => {
      expect(InputSanitizer.sanitizeHTML('')).toBe('');
    });

    test('should handle null and undefined', () => {
      expect(InputSanitizer.sanitizeHTML(null as unknown as string)).toBe('');
      expect(InputSanitizer.sanitizeHTML(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    test('should remove control characters', () => {
      const input = 'normal text\x00\x01\x08\x0B\x0C\x0E\x1F\x7F';
      const expected = 'normal text';
      
      expect(InputSanitizer.sanitizeText(input)).toBe(expected);
    });

    test('should preserve whitespace characters', () => {
      const input = 'text with\nnewlines\tand spaces';
      
      expect(InputSanitizer.sanitizeText(input)).toBe(input);
    });

    test('should handle empty string', () => {
      expect(InputSanitizer.sanitizeText('')).toBe('');
    });
  });

  describe('sanitizeUsername', () => {
    test('should sanitize username correctly', () => {
      const input = '  TestUser123  ';
      const expected = 'testuser123';
      
      expect(InputSanitizer.sanitizeUsername(input)).toBe(expected);
    });

    test('should remove invalid characters', () => {
      const input = 'test@user#123!';
      const expected = 'testuser123';
      
      expect(InputSanitizer.sanitizeUsername(input)).toBe(expected);
    });

    test('should allow valid characters', () => {
      const input = 'test_user-123.name';
      const expected = 'test_user-123.name';
      
      expect(InputSanitizer.sanitizeUsername(input)).toBe(expected);
    });

    test('should prevent path traversal', () => {
      const input = 'user../admin';
      const expected = 'useradmin'; // Path traversal patterns are completely removed
      
      expect(InputSanitizer.sanitizeUsername(input)).toBe(expected);
    });
  });

  describe('sanitizeEmail', () => {
    test('should sanitize email correctly', () => {
      const input = '  Test.User@Example.COM  ';
      const expected = 'test.user@example.com';
      
      expect(InputSanitizer.sanitizeEmail(input)).toBe(expected);
    });

    test('should remove invalid characters', () => {
      const input = 'test!user@example#.com';
      const expected = 'testuser@example.com';
      
      expect(InputSanitizer.sanitizeEmail(input)).toBe(expected);
    });

    test('should preserve valid email characters', () => {
      const input = 'test.user-123@sub-domain.example.co.uk';
      const expected = 'test.user-123@sub-domain.example.co.uk';
      
      expect(InputSanitizer.sanitizeEmail(input)).toBe(expected);
    });
  });

  describe('sanitizeFilePath', () => {
    test('should prevent path traversal attacks', () => {
      const input = '../../../etc/passwd';
      const expected = 'etc/passwd';
      
      expect(InputSanitizer.sanitizeFilePath(input)).toBe(expected);
    });

    test('should remove null bytes', () => {
      const input = 'file\x00name.txt';
      const expected = 'filename.txt';
      
      expect(InputSanitizer.sanitizeFilePath(input)).toBe(expected);
    });

    test('should normalize multiple slashes', () => {
      const input = 'path//to///file.txt';
      const expected = 'path/to/file.txt';
      
      expect(InputSanitizer.sanitizeFilePath(input)).toBe(expected);
    });

    test('should remove leading dots and slashes', () => {
      const input = './../../hidden/file.txt';
      const expected = 'hidden/file.txt';
      
      expect(InputSanitizer.sanitizeFilePath(input)).toBe(expected);
    });
  });

  describe('sanitizeServerName', () => {
    test('should allow valid server name characters', () => {
      const input = 'My Server 123_test-name';
      const expected = 'My Server 123_test-name';
      
      expect(InputSanitizer.sanitizeServerName(input)).toBe(expected);
    });

    test('should remove invalid characters', () => {
      const input = 'Server@#$%^&*()Name';
      const expected = 'ServerName';
      
      expect(InputSanitizer.sanitizeServerName(input)).toBe(expected);
    });

    test('should normalize multiple spaces', () => {
      const input = 'Server    with     many     spaces';
      const expected = 'Server with many spaces';
      
      expect(InputSanitizer.sanitizeServerName(input)).toBe(expected);
    });
  });

  describe('sanitizeNumeric', () => {
    test('should parse valid integer', () => {
      expect(InputSanitizer.sanitizeNumeric('123', { integer: true })).toBe(123);
    });

    test('should parse valid float', () => {
      expect(InputSanitizer.sanitizeNumeric('123.45')).toBe(123.45);
    });

    test('should apply minimum bounds', () => {
      expect(InputSanitizer.sanitizeNumeric('5', { min: 10 })).toBe(10);
    });

    test('should apply maximum bounds', () => {
      expect(InputSanitizer.sanitizeNumeric('100', { max: 50 })).toBe(50);
    });

    test('should return null for invalid input', () => {
      expect(InputSanitizer.sanitizeNumeric('not-a-number')).toBeNull();
      expect(InputSanitizer.sanitizeNumeric('')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    test('should validate strong password', () => {
      const result = InputSanitizer.validatePassword('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized).toBe('StrongPass123!');
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '',
        'short',
        'lowercase123!',
        'UPPERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123',
        'a'.repeat(129), // Too long
      ];

      weakPasswords.forEach(password => {
        const result = InputSanitizer.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should provide specific error messages', () => {
      const result = InputSanitizer.validatePassword('weak');
      
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    test('should trim whitespace', () => {
      const result = InputSanitizer.validatePassword('  StrongPass123!  ');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('StrongPass123!');
    });
  });

  describe('validateFileUpload', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['content'], name, { type });
      // Override the size property to match the expected size
      Object.defineProperty(file, 'size', { value: size, writable: false });
      return file;
    };

    test('should validate correct file', () => {
      const file = createMockFile('test.txt', 1000, 'text/plain');
      const result = InputSanitizer.validateFileUpload(file, {
        maxSize: 2000,
        allowedTypes: ['text/plain'],
        allowedExtensions: ['txt'],
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject file exceeding size limit', () => {
      const file = createMockFile('large.txt', 5000, 'text/plain');
      const result = InputSanitizer.validateFileUpload(file, {
        maxSize: 2000,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size must not exceed 0MB');
    });

    test('should reject disallowed file type', () => {
      const file = createMockFile('test.exe', 1000, 'application/octet-stream');
      const result = InputSanitizer.validateFileUpload(file, {
        allowedTypes: ['text/plain'],
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type application/octet-stream is not allowed');
    });

    test('should reject disallowed file extension', () => {
      const file = createMockFile('script.js', 1000, 'text/javascript');
      const result = InputSanitizer.validateFileUpload(file, {
        allowedExtensions: ['txt', 'md'],
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File extension is not allowed');
    });

    test('should reject files with path traversal in name', () => {
      const file = createMockFile('../../../malicious.txt', 1000, 'text/plain');
      const result = InputSanitizer.validateFileUpload(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid file name');
    });
  });

  describe('removeScriptTags', () => {
    test('should remove script tags', () => {
      const input = '<p>Safe content</p><script>alert("xss")</script><p>More content</p>';
      const expected = '<p>Safe content</p><p>More content</p>';
      
      expect(InputSanitizer.removeScriptTags(input)).toBe(expected);
    });

    test('should remove dangerous HTML elements', () => {
      const input = `
        <div>Safe</div>
        <script>alert('xss')</script>
        <iframe src="evil.com"></iframe>
        <object data="malware.swf"></object>
        <embed src="malware.swf">
        <link rel="stylesheet" href="evil.css">
        <meta http-equiv="refresh" content="0;url=evil.com">
      `;
      
      const result = InputSanitizer.removeScriptTags(input);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<link');
      expect(result).not.toContain('<meta');
      expect(result).toContain('<div>Safe</div>');
    });

    test('should remove javascript and vbscript protocols', () => {
      const input = '<a href="javascript:alert(1)">Link</a><img src="vbscript:msgbox(1)">';
      const result = InputSanitizer.removeScriptTags(input);
      
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('vbscript:');
    });

    test('should remove event handlers', () => {
      const input = '<div onclick="alert(1)" onmouseover="evil()">Content</div>';
      const result = InputSanitizer.removeScriptTags(input);
      
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
    });
  });

  describe('escapeRegExp', () => {
    test('should escape special regex characters', () => {
      const input = '.*+?^${}()|[]\\';
      const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
      
      expect(InputSanitizer.escapeRegExp(input)).toBe(expected);
    });

    test('should not affect normal characters', () => {
      const input = 'normal text 123';
      
      expect(InputSanitizer.escapeRegExp(input)).toBe(input);
    });
  });
});