export interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const JWT_TOKEN_PLACEHOLDER = '[REDACTED:jwt-token]';
const AWS_KEY_PLACEHOLDER = '[REDACTED:aws-access-key-id]';

const REDACTION_PATTERNS: RedactionPattern[] = [
  {
    name: 'jwt',
    pattern: new RegExp(JWT_TOKEN_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}', 'g'),
    replacement: '[REDACTED:jwt]'
  },
  {
    name: 'aws-key',
    pattern: new RegExp(AWS_KEY_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '|AKIA[0-9A-Z]{16}', 'g'),
    replacement: '[REDACTED:aws-key]'
  },
  {
    name: 'aws-secret',
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)[\s:=]+[A-Za-z0-9/+=]{40}/g,
    replacement: 'aws_secret_access_key = [REDACTED:aws-secret]'
  },
  {
    name: 'api-key',
    pattern: /(?:api[_-]?key|apikey)[\s:=]+['"]?[A-Za-z0-9_\-]{20,}['"]?/gi,
    replacement: 'api_key: [REDACTED:api-key]'
  },
  {
    name: 'url-creds',
    pattern: /((?:postgres|mysql|mongodb):\/\/)([^:]+):([^@]+)@/g,
    replacement: '$1[REDACTED:url-creds]@'
  },
  {
    name: 'private-key',
    pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
    replacement: '[REDACTED:private-key]'
  }
];

export interface RedactionResult {
  value: unknown;
  redactedCount: number;
}

export function redactValue(value: unknown): RedactionResult {
  let redactedCount = 0;

  function redactRecursive(val: unknown): unknown {
    if (val === null || val === undefined) {
      return val;
    }

    if (typeof val === 'string') {
      let redacted = val;
      for (const pattern of REDACTION_PATTERNS) {
        const before = redacted;
        redacted = redacted.replace(pattern.pattern, pattern.replacement);
        if (redacted !== before) {
          redactedCount++;
        }
      }
      return redacted;
    }

    if (Array.isArray(val)) {
      return val.map(item => redactRecursive(item));
    }

    if (typeof val === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
        result[key] = redactRecursive(value);
      }
      return result;
    }

    return val;
  }

  const redactedValue = redactRecursive(value);
  return { value: redactedValue, redactedCount };
}

export function redactSecrets(text: string, patterns: RedactionPattern[] = REDACTION_PATTERNS): string {
  let redacted = text;
  
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern.pattern, pattern.replacement);
  }
  
  return redacted;
}

export function addRedactionPattern(pattern: RedactionPattern): void {
  REDACTION_PATTERNS.push(pattern);
}

export function getRedactionPatterns(): readonly RedactionPattern[] {
  return REDACTION_PATTERNS;
}
