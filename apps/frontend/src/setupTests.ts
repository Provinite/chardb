import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver. Implementations are `function`s, not arrows:
// Vitest runs them as constructors under `new`, which an arrow cannot be.
global.IntersectionObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mocked-object-url");
global.URL.revokeObjectURL = vi.fn();

// Mock File and FileReader
Object.defineProperty(globalThis, "File", {
  writable: true,
  configurable: true,
  value: class extends Blob {
    name: string;
    lastModified: number;

    constructor(
      chunks: BlobPart[],
      filename: string,
      options?: FilePropertyBag,
    ) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = Date.now();
    }
  },
});

Object.defineProperty(globalThis, "FileReader", {
  writable: true,
  configurable: true,
  value: class extends EventTarget {
    result: string | ArrayBuffer | null = null;
    error: DOMException | null = null;
    readyState: number = 0;

    readAsDataURL = vi.fn();
    readAsText = vi.fn();
    readAsArrayBuffer = vi.fn();
    abort = vi.fn();

    static EMPTY = 0;
    static LOADING = 1;
    static DONE = 2;
  },
});

// Global test timeout
vi.setConfig({
  testTimeout: 10000,
});
