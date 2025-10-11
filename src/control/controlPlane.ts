import { Router } from "../kernel/router";
import { Json } from "../types";

export type MiddlewareState = { name: string; enabled: boolean };

export class ControlPlane {
  private state: MiddlewareState[] = [
    { name: "metrics", enabled: true },
    { name: "compression", enabled: false }
  ];
  constructor(private router: Router, private onChange: () => void) {
    this.register();
  }
  private current(): Json {
    return { pipeline: this.state.map(s => ({ name: s.name, enabled: s.enabled })) };
  }
  private setEnabled(name: string, enabled: boolean) {
    const entry = this.state.find(s => s.name === name);
    if (!entry) throw new Error("unknown middleware");
    entry.enabled = enabled;
    this.onChange();
  }
  private register() {
    this.router.registerTool({ name: "kernel.middleware.list" }, async () => this.current());
    this.router.registerTool({ name: "kernel.middleware.enable" }, async (params: any) => {
      this.setEnabled(params?.name, true);
      return this.current();
    });
    this.router.registerTool({ name: "kernel.middleware.disable" }, async (params: any) => {
      this.setEnabled(params?.name, false);
      return this.current();
    });
    this.router.registerResource({ uri: "mcp://kernel/middleware.json", subscribable: true }, async () => this.current());
  }
}
