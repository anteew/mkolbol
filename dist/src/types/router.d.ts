import type { RoutingEndpoint } from '../types.js';
export type RouterEventType = 'added' | 'updated' | 'removed' | 'staleExpired';
export interface RouterEvent {
    type: RouterEventType;
    endpoint: RoutingEndpoint;
    timestamp: number;
}
export type RouterEventCallback = (event: RouterEvent) => void;
//# sourceMappingURL=router.d.ts.map