const JWT_TOKEN_PLACEHOLDER = '[REDACTED:jwt-token]';
const AWS_KEY_PLACEHOLDER = '[REDACTED:aws-access-key-id]';
const REDACTION_PATTERNS = [
    {
        name: 'jwt',
        pattern: new RegExp(JWT_TOKEN_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            '|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}', 'g'),
        replacement: '[REDACTED:jwt]',
    },
    {
        name: 'aws-key',
        pattern: new RegExp(AWS_KEY_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '|AKIA[0-9A-Z]{16}', 'g'),
        replacement: '[REDACTED:aws-key]',
    },
    {
        name: 'aws-secret',
        pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)[\s:=]+[A-Za-z0-9/+=]{40}/g,
        replacement: 'aws_secret_access_key = [REDACTED:aws-secret]',
    },
    {
        name: 'api-key',
        pattern: /(?:api[_-]?key|apikey)[\s:=]+['"]?[A-Za-z0-9_\-]{20,}['"]?/gi,
        replacement: 'api_key: [REDACTED:api-key]',
    },
    {
        name: 'url-creds',
        pattern: /((?:postgres|mysql|mongodb):\/\/)([^:]+):([^@]+)@/g,
        replacement: '$1[REDACTED:url-creds]@',
    },
    {
        name: 'private-key',
        pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
        replacement: '[REDACTED:private-key]',
    },
];
export function redactValue(value) {
    let redactedCount = 0;
    function redactRecursive(val) {
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
            return val.map((item) => redactRecursive(item));
        }
        if (typeof val === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(val)) {
                result[key] = redactRecursive(value);
            }
            return result;
        }
        return val;
    }
    const redactedValue = redactRecursive(value);
    return { value: redactedValue, redactedCount };
}
export function redactSecrets(text, patterns = REDACTION_PATTERNS) {
    let redacted = text;
    for (const pattern of patterns) {
        redacted = redacted.replace(pattern.pattern, pattern.replacement);
    }
    return redacted;
}
export function addRedactionPattern(pattern) {
    REDACTION_PATTERNS.push(pattern);
}
export function getRedactionPatterns() {
    return REDACTION_PATTERNS;
}
//# sourceMappingURL=redaction.js.map