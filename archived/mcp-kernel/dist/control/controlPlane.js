export class ControlPlane {
    router;
    onChange;
    state = [
        { name: "metrics", enabled: true },
        { name: "compression", enabled: false }
    ];
    constructor(router, onChange) {
        this.router = router;
        this.onChange = onChange;
        this.register();
    }
    current() {
        return { pipeline: this.state.map(s => ({ name: s.name, enabled: s.enabled })) };
    }
    setEnabled(name, enabled) {
        const entry = this.state.find(s => s.name === name);
        if (!entry)
            throw new Error("unknown middleware");
        entry.enabled = enabled;
        this.onChange();
    }
    register() {
        this.router.registerTool({ name: "kernel.middleware.list" }, async () => this.current());
        this.router.registerTool({ name: "kernel.middleware.enable" }, async (params) => {
            this.setEnabled(params?.name, true);
            return this.current();
        });
        this.router.registerTool({ name: "kernel.middleware.disable" }, async (params) => {
            this.setEnabled(params?.name, false);
            return this.current();
        });
        this.router.registerResource({ uri: "mcp://kernel/middleware.json", subscribable: true }, async () => this.current());
    }
}
//# sourceMappingURL=controlPlane.js.map