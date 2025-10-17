import { PluginManifest, ToolDescriptor, ResourceDescriptor } from '../types';
import { Router } from '../kernel/router';

export function registerManifest(
  router: Router,
  manifest: PluginManifest,
  impl: {
    tools?: Record<string, (params: any, session: any) => Promise<any>>;
    resources?: Record<string, (uri: string, session: any) => Promise<any>>;
  },
) {
  for (const t of manifest.tools ?? []) {
    const h = impl.tools?.[t.name];
    if (!h) continue;
    router.registerTool(t as ToolDescriptor, h);
  }
  for (const r of manifest.resources ?? []) {
    const rd = impl.resources?.[r.uri];
    if (!rd) continue;
    router.registerResource(r as ResourceDescriptor, rd);
  }
}
