export const nodeDefaults = {
    enabled: true,
    budget: {
        kb: 10,
        lines: 200,
    },
    rules: [
        {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }, { type: 'codeframe' }],
            priority: 10,
        },
        {
            match: { evt: 'assert.fail' },
            actions: [{ type: 'include' }, { type: 'slice', window: 10 }],
            priority: 9,
        },
        {
            match: { evt: 'test.error' },
            actions: [{ type: 'include' }, { type: 'slice', window: 5 }],
            priority: 8,
        },
        {
            match: { evt: ['console.error', 'console.warn'] },
            actions: [{ type: 'include' }],
            priority: 7,
        },
        {
            match: { lvl: 'debug' },
            actions: [{ type: 'exclude' }],
            priority: 1,
        },
    ],
};
//# sourceMappingURL=node-defaults.js.map