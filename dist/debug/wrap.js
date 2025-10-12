const DEFAULT_OPTIONS = {
    enabled: true,
    redactLargeArgs: true,
    maxArgLength: 100,
    redactSecrets: true,
};
const SECRET_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
];
function shouldRedactKey(key) {
    return SECRET_PATTERNS.some((pattern) => pattern.test(key));
}
function redactValue(value, options) {
    if (value === undefined)
        return 'undefined';
    if (value === null)
        return 'null';
    const type = typeof value;
    if (type === 'function')
        return '[Function]';
    if (type === 'symbol')
        return value.toString();
    if (type === 'object') {
        if (Array.isArray(value)) {
            if (value.length > 5) {
                return `[Array(${value.length})]`;
            }
            return `[${value.map((v) => redactValue(v, options)).join(', ')}]`;
        }
        const obj = value;
        const keys = Object.keys(obj);
        if (keys.length > 10) {
            return `{Object with ${keys.length} keys}`;
        }
        const entries = keys.map((key) => {
            if (options.redactSecrets && shouldRedactKey(key)) {
                return `${key}: [REDACTED]`;
            }
            return `${key}: ${redactValue(obj[key], options)}`;
        });
        return `{${entries.join(', ')}}`;
    }
    const str = String(value);
    if (options.redactLargeArgs && str.length > options.maxArgLength) {
        return `[String(${str.length})]`;
    }
    return str;
}
function formatArgs(args, options) {
    return args.map((arg) => redactValue(arg, options)).join(', ');
}
export function wrap(fn, name, module, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!opts.enabled) {
        return fn;
    }
    const wrappedFn = function (...args) {
        const start = performance.now();
        const formattedArgs = formatArgs(args, opts);
        console.debug(`[${module}] ${name}(${formattedArgs}) → entry`);
        try {
            const result = fn.apply(this, args);
            if (result instanceof Promise) {
                return result.then((value) => {
                    const duration = performance.now() - start;
                    console.debug(`[${module}] ${name} → exit (${duration.toFixed(2)}ms)`);
                    return value;
                }, (error) => {
                    const duration = performance.now() - start;
                    console.debug(`[${module}] ${name} → error (${duration.toFixed(2)}ms):`, error.message || error);
                    throw error;
                });
            }
            const duration = performance.now() - start;
            console.debug(`[${module}] ${name} → exit (${duration.toFixed(2)}ms)`);
            return result;
        }
        catch (error) {
            const duration = performance.now() - start;
            const message = error instanceof Error ? error.message : String(error);
            console.debug(`[${module}] ${name} → error (${duration.toFixed(2)}ms):`, message);
            throw error;
        }
    };
    Object.defineProperty(wrappedFn, 'name', { value: name, configurable: true });
    return wrappedFn;
}
//# sourceMappingURL=wrap.js.map