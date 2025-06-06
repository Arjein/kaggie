// Test setup file for vitest
import { vi } from 'vitest';

// Mock Chrome APIs that aren't available in test environment
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  runtime: {
    lastError: null,
  },
} as any;
