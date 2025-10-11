export function registerManifest(router, manifest, impl) {
    for (const t of manifest.tools ?? []) {
        const h = impl.tools?.[t.name];
        if (!h)
            continue;
        router.registerTool(t, h);
    }
    for (const r of manifest.resources ?? []) {
        const rd = impl.resources?.[r.uri];
        if (!rd)
            continue;
        router.registerResource(r, rd);
    }
}
//# sourceMappingURL=manifest.js.map