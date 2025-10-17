import { describe, it, expect } from 'vitest';
import { FrameCodec } from '../../src/net/frame.js';

describe('FrameCodec', () => {
  it('encodes and decodes data frame', () => {
    const frame = FrameCodec.createDataFrame('hello', 42);
    const encoded = FrameCodec.encode(frame);
    const decoded = FrameCodec.decode(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.frame.metadata.type).toBe('data');
    expect(decoded!.frame.payload.toString()).toBe('hello');
  });

  it('returns null for incomplete data', () => {
    expect(FrameCodec.decode(Buffer.from([0x00]))).toBeNull();
  });

  it('handles ping/pong/close frames', () => {
    const ping = FrameCodec.encode(FrameCodec.createPingFrame());
    const pong = FrameCodec.encode(FrameCodec.createPongFrame());
    const close = FrameCodec.encode(FrameCodec.createCloseFrame());

    expect(FrameCodec.decode(ping)!.frame.metadata.type).toBe('ping');
    expect(FrameCodec.decode(pong)!.frame.metadata.type).toBe('pong');
    expect(FrameCodec.decode(close)!.frame.metadata.type).toBe('close');
  });

  it('rejects oversized payload', () => {
    const huge = Buffer.alloc(11 * 1024 * 1024);
    expect(() => FrameCodec.encode(FrameCodec.createDataFrame(huge))).toThrow('exceeds maximum');
  });
});
