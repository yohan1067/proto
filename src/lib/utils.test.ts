import { describe, it, expect, vi } from 'vitest';
import { parseStreamChunk, parseSSEData, copyToClipboard } from './utils';
import { useUIStore } from '../store/useUIStore';

// Mock UI Store
vi.mock('../store/useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      setShowToast: vi.fn(),
    })),
  },
}));

describe('utils', () => {
  describe('parseStreamChunk', () => {
    it('splits complete lines correctly', () => {
      const input = "line1\nline2\nline3\n";
      const { lines, remainingBuffer } = parseStreamChunk(input);
      expect(lines).toEqual(['line1', 'line2', 'line3']);
      expect(remainingBuffer).toBe('');
    });

    it('handles incomplete lines correctly', () => {
      const input = "line1\nline2\nincom";
      const { lines, remainingBuffer } = parseStreamChunk(input);
      expect(lines).toEqual(['line1', 'line2']);
      expect(remainingBuffer).toBe('incom');
    });
  });

  describe('parseSSEData', () => {
    it('returns content from valid data line', () => {
      const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      expect(parseSSEData(line)).toBe('Hello');
    });

    it('returns null for DONE signal', () => {
      expect(parseSSEData('data: [DONE]')).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(parseSSEData('invalid')).toBeNull();
    });
    
    it('returns null for empty content', () => {
       const line = 'data: {"choices":[{"delta":{}}]}';
       expect(parseSSEData(line)).toBeNull();
    });
  });

  describe('copyToClipboard', () => {
    const originalClipboard = navigator.clipboard;
    
    it('calls navigator.clipboard.writeText and shows toast on success', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      
      // Use Object.defineProperty to override readonly property
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      const setShowToastMock = vi.fn();
      // @ts-expect-error - navigator.clipboard is read-only
      useUIStore.getState.mockReturnValue({ setShowToast: setShowToastMock });

      await copyToClipboard('test text');
      
      expect(writeTextMock).toHaveBeenCalledWith('test text');
      expect(setShowToastMock).toHaveBeenCalledWith(true);

      // Cleanup
      if (originalClipboard) {
         Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true });
      } else {
        // @ts-expect-error - navigator.clipboard is read-only
         delete navigator.clipboard;
      }
    });
  });
});