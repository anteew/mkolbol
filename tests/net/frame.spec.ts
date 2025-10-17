import { describe, it, expect } from 'vitest';
import { FrameCodec } from '../../src/net/frame.js';
import type { Frame } from '../../src/net/transport.js';

describe('FrameCodec', () => {
  describe('encode/decode', () => {
    it('encodes and decodes data frame', () => {
      const payload = Buffer.from('hello world', 'utf8');
      const frame = FrameCodec.createDataFrame(payload, 42);

      const encoded = FrameCodec.encode(frame);
      expect(encoded).toBeInstanceOf(Buffer);

      const decoded = FrameCodec.decode(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.frame.metadata.type).toBe('data');
      expect(decoded!.frame.metadata.sequenceId).toBe(42);
      expect(decoded!.frame.payload.toString('utf8')).toBe('hello world');
      expect(decoded!.bytesConsumed).toBe(encoded.length);
    });

    it('returns null for incomplete header', () => {
      const partial = Buffer.from([0x00, 0x00, 0x00]);
      const result = FrameCodec.decode(partial);
      expect(result).toBeNull();
    });

    it('returns null for incomplete payload', () => {
      const frame = FrameCodec.createDataFrame('test data');
      const encoded = FrameCodec.encode(frame);
      const partial = encoded.slice(0, encoded.length - 5);

      const result = FrameCodec.decode(partial);
      expect(result).toBeNull();
    });

    it('handles empty payload', () => {
      const frame = FrameCodec.createDataFrame(Buffer.alloc(0));
      const encoded = FrameCodec.encode(frame);
      const decoded = FrameCodec.decode(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.frame.payload.length).toBe(0);
    });

    it('handles large payload', () => {
      const largePayload = Buffer.alloc(1024 * 1024, 'x'); // 1MB
      const frame = FrameCodec.createDataFrame(largePayload);
      const encoded = FrameCodec.encode(frame);
      const decoded = FrameCodec.decode(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.frame.payload.length).toBe(largePayload.length);
      expect(decoded!.frame.payload.equals(largePayload)).toBe(true);
    });

    it('rejects payload exceeding max size', () => {
      const hugePayload = Buffer.alloc(11 * 1024 * 1024, 'x'); // 11MB (over 10MB limit)
      const frame = FrameCodec.createDataFrame(hugePayload);

      expect(() => FrameCodec.encode(frame)).toThrow('Payload exceeds maximum size');
    });

    it('handles string payload', () => {
      const frame = FrameCodec.createDataFrame('string data', 123);
      const encoded = FrameCodec.encode(frame);
      const decoded = FrameCodec.decode(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.frame.payload.toString('utf8')).toBe('string data');
    });
  });

  describe('frame types', () => {
    it('creates ping frame', () => {
      const frame = FrameCodec.createPingFrame();
      expect(frame.metadata.type).toBe('ping');
      expect(frame.payload.length).toBe(0);
      expect(frame.metadata.timestamp).toBeGreaterThan(0);
    });

    it('creates pong frame', () => {
      const frame = FrameCodec.createPongFrame();
      expect(frame.metadata.type).toBe('pong');
      expect(frame.payload.length).toBe(0);
      expect(frame.metadata.timestamp).toBeGreaterThan(0);
    });

    it('creates close frame', () => {
      const frame = FrameCodec.createCloseFrame();
      expect(frame.metadata.type).toBe('close');
      expect(frame.payload.length).toBe(0);
    });

    it('encodes and decodes ping/pong frames', () => {
      const ping = FrameCodec.createPingFrame();
      const pong = FrameCodec.createPongFrame();

      const encodedPing = FrameCodec.encode(ping);
      const encodedPong = FrameCodec.encode(pong);

      const decodedPing = FrameCodec.decode(encodedPing);
      const decodedPong = FrameCodec.decode(encodedPong);

      expect(decodedPing!.frame.metadata.type).toBe('ping');
      expect(decodedPong!.frame.metadata.type).toBe('pong');
    });
  });

  describe('multiple frames in buffer', () => {
    it('decodes first frame and reports bytes consumed', () => {
      const frame1 = FrameCodec.createDataFrame('first');
      const frame2 = FrameCodec.createDataFrame('second');

      const encoded1 = FrameCodec.encode(frame1);
      const encoded2 = FrameCodec.encode(frame2);
      const combined = Buffer.concat([encoded1, encoded2]);

      const decoded = FrameCodec.decode(combined);

      expect(decoded).not.toBeNull();
      expect(decoded!.frame.payload.toString('utf8')).toBe('first');
      expect(decoded!.bytesConsumed).toBe(encoded1.length);
    });

    it('can decode remaining frames after consuming first', () => {
      const frame1 = FrameCodec.createDataFrame('first');
      const frame2 = FrameCodec.createDataFrame('second');

      const encoded1 = FrameCodec.encode(frame1);
      const encoded2 = FrameCodec.encode(frame2);
      const combined = Buffer.concat([encoded1, encoded2]);

      const decoded1 = FrameCodec.decode(combined);
      expect(decoded1).not.toBeNull();

      const remaining = combined.slice(decoded1!.bytesConsumed);
      const decoded2 = FrameCodec.decode(remaining);

      expect(decoded2).not.toBeNull();
      expect(decoded2!.frame.payload.toString('utf8')).toBe('second');
    });
  });

  describe('metadata preservation', () => {
    it('preserves timestamp in metadata', () => {
      const before = Date.now();
      const frame = FrameCodec.createDataFrame('test');
      const after = Date.now();

      const encoded = FrameCodec.encode(frame);
      const decoded = FrameCodec.decode(encoded);

      expect(decoded!.frame.metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(decoded!.frame.metadata.timestamp).toBeLessThanOrEqual(after);
    });

    it('preserves sequence ID', () => {
      const frame = FrameCodec.createDataFrame('test', 999);
      const encoded = FrameCodec.encode(frame);
      const decoded = FrameCodec.decode(encoded);

      expect(decoded!.frame.metadata.sequenceId).toBe(999);
    });
  });
});
