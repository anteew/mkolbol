const LEVEL_VALUES = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
};
function parseModules(envVar) {
    if (!envVar || envVar.trim() === '')
        return new Set();
    return new Set(envVar
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0));
}
function parseLevel(envVar) {
    const level = (envVar?.toLowerCase() || 'info');
    return LEVEL_VALUES[level] !== undefined ? level : 'info';
}
function createConfig() {
    const debugEnv = process.env.DEBUG;
    const modulesEnv = process.env.MK_DEBUG_MODULES;
    const levelEnv = process.env.MK_DEBUG_LEVEL;
    const enabled = debugEnv === '1' || debugEnv === 'true' || !!modulesEnv;
    const modules = parseModules(modulesEnv);
    const level = parseLevel(levelEnv);
    return Object.freeze({
        enabled,
        modules,
        level,
        levelValue: LEVEL_VALUES[level],
    });
}
export const config = createConfig();
//# sourceMappingURL=config.js.map