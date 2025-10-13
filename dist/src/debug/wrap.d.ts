export interface WrapOptions {
    enabled?: boolean;
    redactLargeArgs?: boolean;
    maxArgLength?: number;
    redactSecrets?: boolean;
}
export declare function wrap<T extends (...args: any[]) => any>(fn: T, name: string, module: string, options?: WrapOptions): T;
//# sourceMappingURL=wrap.d.ts.map