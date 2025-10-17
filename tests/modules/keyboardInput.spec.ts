import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { KeyboardInput } from '../../src/modules/keyboard-input.js';

describe('KeyboardInput', () => {
  let keyboard: KeyboardInput;
  let originalIsTTY: boolean;
  let originalIsRaw: boolean | undefined;
  let originalSetRawMode: ((mode: boolean) => void) | undefined;

  beforeEach(() => {
    keyboard = new KeyboardInput();
    originalIsTTY = process.stdin.isTTY;
    originalIsRaw = process.stdin.isRaw;
    originalSetRawMode = process.stdin.setRawMode;
  });

  afterEach(() => {
    keyboard.stop();
    process.stdin.isTTY = originalIsTTY;
    process.stdin.isRaw = originalIsRaw;
    process.stdin.setRawMode = originalSetRawMode;
  });

  describe('TTY detection', () => {
    it('should emit error when stdin is not a TTY', (context) => {
      process.stdin.isTTY = false;

      const errorSpy = vi.fn();
      keyboard.on('error', errorSpy);

      keyboard.start();

      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'stdin is not a TTY',
        }),
      );
    });

    it('should not activate when stdin is not a TTY', () => {
      process.stdin.isTTY = false;

      const errorSpy = vi.fn();
      keyboard.on('error', errorSpy);

      keyboard.start();

      expect((keyboard as any).isActive).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should activate when stdin is a TTY', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      keyboard.start();

      expect((keyboard as any).isActive).toBe(true);
    });
  });

  describe('raw mode enable/restore', () => {
    it('should enable raw mode when starting', () => {
      process.stdin.isTTY = true;
      const setRawModeMock = vi.fn();
      process.stdin.setRawMode = setRawModeMock;
      process.stdin.isRaw = false;

      keyboard.start();

      expect(setRawModeMock).toHaveBeenCalledWith(true);
    });

    it('should store original raw mode state', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();
      process.stdin.isRaw = false;

      keyboard.start();

      expect((keyboard as any).originalMode).toBe(false);
    });

    it('should restore original raw mode when stopping', () => {
      process.stdin.isTTY = true;
      const setRawModeMock = vi.fn();
      process.stdin.setRawMode = setRawModeMock;
      process.stdin.isRaw = false;

      keyboard.start();
      setRawModeMock.mockClear();

      keyboard.stop();

      expect(setRawModeMock).toHaveBeenCalledWith(false);
    });

    it('should not call setRawMode when stopping if not started', () => {
      const setRawModeMock = vi.fn();
      process.stdin.setRawMode = setRawModeMock;

      keyboard.stop();

      expect(setRawModeMock).not.toHaveBeenCalled();
    });

    it('should handle missing setRawMode gracefully', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = undefined;

      expect(() => keyboard.start()).not.toThrow();
      expect(() => keyboard.stop()).not.toThrow();
    });
  });

  describe('keypress events', () => {
    it('should emit keypress event for regular keys', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      const keypressSpy = vi.fn();
      keyboard.on('keypress', keypressSpy);

      keyboard.start();

      process.stdin.emit('keypress', 'a', {
        name: 'a',
        ctrl: false,
        meta: false,
        shift: false,
      });

      expect(keypressSpy).toHaveBeenCalledWith({
        name: 'a',
        sequence: 'a',
        ctrl: false,
        meta: false,
        shift: false,
      });
    });

    it('should handle ctrl modifier', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      const keypressSpy = vi.fn();
      keyboard.on('keypress', keypressSpy);

      keyboard.start();

      process.stdin.emit('keypress', '\u0001', {
        name: 'a',
        ctrl: true,
        meta: false,
        shift: false,
      });

      expect(keypressSpy).toHaveBeenCalledWith({
        name: 'a',
        sequence: '\u0001',
        ctrl: true,
        meta: false,
        shift: false,
      });
    });

    it('should handle meta and shift modifiers', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      const keypressSpy = vi.fn();
      keyboard.on('keypress', keypressSpy);

      keyboard.start();

      process.stdin.emit('keypress', 'A', {
        name: 'a',
        ctrl: false,
        meta: true,
        shift: true,
      });

      expect(keypressSpy).toHaveBeenCalledWith({
        name: 'a',
        sequence: 'A',
        ctrl: false,
        meta: true,
        shift: true,
      });
    });

    it('should emit ctrl-c event and stop on Ctrl+C', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      const ctrlcSpy = vi.fn();
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      keyboard.on('ctrl-c', ctrlcSpy);
      keyboard.start();

      process.stdin.emit('keypress', '\u0003', {
        name: 'c',
        ctrl: true,
        meta: false,
        shift: false,
      });

      expect(ctrlcSpy).toHaveBeenCalledOnce();
      expect((keyboard as any).isActive).toBe(false);
      expect(exitSpy).toHaveBeenCalledWith(0);

      exitSpy.mockRestore();
    });

    it('should not emit events after stop', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      const keypressSpy = vi.fn();
      keyboard.on('keypress', keypressSpy);

      keyboard.start();
      keyboard.stop();

      process.stdin.emit('keypress', 'a', {
        name: 'a',
        ctrl: false,
        meta: false,
        shift: false,
      });

      expect(keypressSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple start calls gracefully', () => {
      process.stdin.isTTY = true;
      const setRawModeMock = vi.fn();
      process.stdin.setRawMode = setRawModeMock;

      keyboard.start();
      keyboard.start();
      keyboard.start();

      expect(setRawModeMock).toHaveBeenCalledTimes(1);
    });

    it('should handle special keys', () => {
      process.stdin.isTTY = true;
      process.stdin.setRawMode = vi.fn();

      const keypressSpy = vi.fn();
      keyboard.on('keypress', keypressSpy);

      keyboard.start();

      process.stdin.emit('keypress', '\r', {
        name: 'return',
        ctrl: false,
        meta: false,
        shift: false,
      });

      expect(keypressSpy).toHaveBeenCalledWith({
        name: 'return',
        sequence: '\r',
        ctrl: false,
        meta: false,
        shift: false,
      });
    });
  });
});
