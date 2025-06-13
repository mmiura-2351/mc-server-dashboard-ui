import { describe, test, expect, vi } from 'vitest';
import { FileUploadSecurity, DEFAULT_UPLOAD_CONFIG } from '../file-upload-security';

// Mock File constructor for testing
class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(content: string[], name: string, options: { type?: string; lastModified?: number } = {}) {
    this.name = name;
    this.size = content.reduce((sum, chunk) => sum + chunk.length, 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }

  slice(start = 0, end = this.size): Blob {
    return {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(end - start)),
      size: end - start,
      type: this.type,
    } as unknown as Blob;
  }
}

// Set up global File for testing
global.File = MockFile as unknown as typeof File;

describe('FileUploadSecurity', () => {
  describe('validateSingleFile', () => {
    test('should validate a safe file', async () => {
      const file = new MockFile(['content'], 'test.txt', { type: 'text/plain' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file, {
        maxFileSize: 1024 * 1024,
        allowedExtensions: ['txt'],
        allowedMimeTypes: ['text/plain'],
        blockDangerousExtensions: true,
        scanForMalware: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should reject file exceeding size limit', async () => {
      const file = new MockFile(['x'.repeat(1000)], 'large.txt', { type: 'text/plain' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file, {
        maxFileSize: 500,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds limit of 0MB');
    });

    test('should reject file without extension', async () => {
      const file = new MockFile(['content'], 'noextension', { type: 'text/plain' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File must have an extension');
    });

    test('should reject dangerous file extensions', async () => {
      const file = new MockFile(['content'], 'malware.exe', { type: 'application/octet-stream' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file, {
        blockDangerousExtensions: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type .exe is potentially dangerous and not allowed');
    });

    test('should reject disallowed file extensions', async () => {
      const file = new MockFile(['content'], 'script.js', { type: 'text/javascript' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file, {
        allowedExtensions: ['txt', 'md'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type .js is not allowed');
    });

    test('should warn about unsupported MIME types', async () => {
      const file = new MockFile(['content'], 'test.txt', { type: 'application/unknown' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file, {
        allowedMimeTypes: ['text/plain'],
        allowedExtensions: ['txt'],
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('MIME type application/unknown may not be fully supported');
    });

    test('should sanitize unsafe filenames', async () => {
      const file = new MockFile(['content'], '../../../malicious.txt', { type: 'text/plain' }) as unknown as File;
      
      const result = await FileUploadSecurity.validateSingleFile(file, {
        allowedExtensions: ['txt'],
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Filename has been sanitized for security');
      expect(result.sanitizedFile).toBeDefined();
      expect(result.sanitizedFile!.name).toBe('malicious.txt');
    });
  });

  describe('validateFiles', () => {
    test('should validate multiple safe files', async () => {
      const files = [
        new MockFile(['content1'], 'file1.txt', { type: 'text/plain' }),
        new MockFile(['content2'], 'file2.txt', { type: 'text/plain' }),
      ] as unknown as File[];

      const result = await FileUploadSecurity.validateFiles(files, {
        maxFiles: 5,
        maxTotalSize: 1024,
        maxFileSize: 512,
        allowedExtensions: ['txt'],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedFiles).toHaveLength(2);
    });

    test('should reject too many files', async () => {
      const files = Array(10).fill(null).map((_, i) => 
        new MockFile(['content'], `file${i}.txt`, { type: 'text/plain' })
      ) as unknown as File[];

      const result = await FileUploadSecurity.validateFiles(files, {
        maxFiles: 5,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many files selected. Maximum allowed: 5');
    });

    test('should reject files exceeding total size limit', async () => {
      const files = [
        new MockFile(['x'.repeat(600)], 'file1.txt', { type: 'text/plain' }),
        new MockFile(['x'.repeat(600)], 'file2.txt', { type: 'text/plain' }),
      ] as unknown as File[];

      const result = await FileUploadSecurity.validateFiles(files, {
        maxTotalSize: 1000,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total file size exceeds limit of 1MB');
    });

    test('should collect errors from individual files', async () => {
      const files = [
        new MockFile(['content'], 'safe.txt', { type: 'text/plain' }),
        new MockFile(['content'], 'dangerous.exe', { type: 'application/octet-stream' }),
      ] as unknown as File[];

      const result = await FileUploadSecurity.validateFiles(files, {
        allowedExtensions: ['txt'],
        blockDangerousExtensions: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('dangerous.exe');
      expect(result.sanitizedFiles).toHaveLength(1);
    });
  });

  describe('securityFilter', () => {
    test('should separate allowed and blocked files', async () => {
      const files = [
        new MockFile(['content'], 'safe.txt', { type: 'text/plain' }),
        new MockFile(['content'], 'dangerous.exe', { type: 'application/octet-stream' }),
        new MockFile(['content'], 'script.js', { type: 'text/javascript' }),
      ] as unknown as File[];

      const result = await FileUploadSecurity.securityFilter(files, {
        allowedExtensions: ['txt'],
        blockDangerousExtensions: true,
      });

      expect(result.allowed).toHaveLength(1);
      expect(result.allowed[0]?.name).toBe('safe.txt');
      
      expect(result.blocked).toHaveLength(2);
      expect(result.blocked.map(b => b.file.name)).toContain('dangerous.exe');
      expect(result.blocked.map(b => b.file.name)).toContain('script.js');
      
      expect(result.blocked.every(b => b.reason.length > 0)).toBe(true);
    });

    test('should include warnings for allowed files', async () => {
      const files = [
        new MockFile(['content'], '../sanitized.txt', { type: 'text/plain' }),
      ] as unknown as File[];

      const result = await FileUploadSecurity.securityFilter(files, {
        allowedExtensions: ['txt'],
      });

      expect(result.allowed).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Filename has been sanitized for security');
    });
  });

  describe('DEFAULT_UPLOAD_CONFIG', () => {
    test('should have reasonable default values', () => {
      expect(DEFAULT_UPLOAD_CONFIG.maxFileSize).toBe(100 * 1024 * 1024); // 100MB
      expect(DEFAULT_UPLOAD_CONFIG.maxTotalSize).toBe(500 * 1024 * 1024); // 500MB
      expect(DEFAULT_UPLOAD_CONFIG.maxFiles).toBe(50);
      expect(DEFAULT_UPLOAD_CONFIG.blockDangerousExtensions).toBe(true);
      expect(DEFAULT_UPLOAD_CONFIG.allowedExtensions).toContain('txt');
      expect(DEFAULT_UPLOAD_CONFIG.allowedExtensions).toContain('json');
      expect(DEFAULT_UPLOAD_CONFIG.allowedExtensions).toContain('jar');
      expect(DEFAULT_UPLOAD_CONFIG.allowedMimeTypes).toContain('text/plain');
      expect(DEFAULT_UPLOAD_CONFIG.allowedMimeTypes).toContain('application/json');
    });

    test('should allow common Minecraft server file types', () => {
      const minecraftFiles = ['jar', 'zip', 'properties', 'yml', 'json', 'txt', 'log'];
      
      minecraftFiles.forEach(ext => {
        expect(DEFAULT_UPLOAD_CONFIG.allowedExtensions).toContain(ext);
      });
    });
  });

  describe('getSecurityRecommendations', () => {
    test('should return security recommendations', () => {
      const recommendations = FileUploadSecurity.getSecurityRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every(rec => typeof rec === 'string')).toBe(true);
      expect(recommendations.some(rec => rec.includes('trusted sources'))).toBe(true);
      expect(recommendations.some(rec => rec.includes('antivirus'))).toBe(true);
    });
  });

  describe('malware detection', () => {
    test('should detect potentially dangerous file signatures', async () => {
      // Create a mock file with PE executable signature
      const mockArrayBuffer = new ArrayBuffer(4);
      const mockView = new Uint8Array(mockArrayBuffer);
      mockView[0] = 0x4D; // 'M'
      mockView[1] = 0x5A; // 'Z' - PE signature
      
      const maliciousFile = {
        name: 'not-an-exe.txt',
        size: 1000,
        type: 'text/plain',
        slice: vi.fn().mockReturnValue({
          arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer)
        })
      } as unknown as File;

      const result = await FileUploadSecurity.validateSingleFile(maliciousFile, {
        allowedExtensions: ['txt'],
        scanForMalware: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File appears to contain suspicious content');
    });

    test('should allow legitimate JAR files with ZIP signature', async () => {
      // Create a mock JAR file with ZIP signature
      const mockArrayBuffer = new ArrayBuffer(4);
      const mockView = new Uint8Array(mockArrayBuffer);
      mockView[0] = 0x50; // 'P'
      mockView[1] = 0x4B; // 'K' - ZIP signature
      
      const jarFile = {
        name: 'server.jar',
        size: 1000,
        type: 'application/java-archive',
        slice: vi.fn().mockReturnValue({
          arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer)
        })
      } as unknown as File;

      const result = await FileUploadSecurity.validateSingleFile(jarFile, {
        allowedExtensions: ['jar'],
        scanForMalware: true,
      });

      expect(result.isValid).toBe(true);
    });
  });
});