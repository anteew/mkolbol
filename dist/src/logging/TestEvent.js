export function createEvent(evt, caseName, options = {}) {
    return {
        ts: Date.now(),
        lvl: options.lvl || 'info',
        case: caseName,
        phase: options.phase,
        evt,
        id: options.id,
        corr: options.corr,
        path: options.path,
        payload: options.payload,
    };
}
//# sourceMappingURL=TestEvent.js.map