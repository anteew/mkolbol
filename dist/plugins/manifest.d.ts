import { PluginManifest } from "../types";
import { Router } from "../kernel/router";
export declare function registerManifest(router: Router, manifest: PluginManifest, impl: {
    tools?: Record<string, (params: any, session: any) => Promise<any>>;
    resources?: Record<string, (uri: string, session: any) => Promise<any>>;
}): void;
//# sourceMappingURL=manifest.d.ts.map