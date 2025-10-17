import { describe, it, expect } from 'vitest';
import { createGoldenHarness } from '../../src/test/golden/harness.js';

describe('Golden Transcript Harness', () => {
  it('should create and compare snapshots with masking', () => {
    const harness = createGoldenHarness({
      suite: 'golden',
      case: 'sample-transcript',
    });

    const transcript = `
[2024-10-12T14:32:45.123Z] Process started with ID: 12a3b4c5-d6e7-f8a9-b0c1-d2e3f4a5b6c7
[2024-10-12T14:32:45.456Z] Connection established at 1697123565456
[2024-10-12T14:32:45.789Z] User input: hello world
[2024-10-12T14:32:46.012Z] Response: Hello, World!
    `.trim();

    harness.assertSnapshot(transcript);

    const result = harness.compare(transcript);
    expect(result.match).toBe(true);
  });

  it('should detect mismatches', () => {
    const harness = createGoldenHarness({
      suite: 'golden',
      case: 'mismatch-test',
    });

    const original = 'Original content with timestamp: 2024-10-12T14:32:45.123Z';
    harness.snapshot(original);

    const modified = 'Modified content with timestamp: 2024-10-12T14:32:45.123Z';
    const result = harness.compare(modified);

    expect(result.match).toBe(false);
    expect(result.expected).toContain('Original content');
    expect(result.actual).toContain('Modified content');
  });

  it('should support custom mask rules', () => {
    const harness = createGoldenHarness({
      suite: 'golden',
      case: 'custom-masks',
      masks: [{ pattern: /PID:\d+/g, replacement: 'PID:<REDACTED>' }],
    });

    const transcript = `
Process PID:12345 started
Timestamp: 2024-10-12T14:32:45.123Z
User ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
    `.trim();

    harness.assertSnapshot(transcript);

    const result = harness.compare(transcript);
    expect(result.match).toBe(true);
  });
});
