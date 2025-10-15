export declare const nodeDefaults: {
    enabled: boolean;
    budget: {
        kb: number;
        lines: number;
    };
    rules: ({
        match: {
            lvl: string;
            evt?: undefined;
        };
        actions: {
            type: string;
        }[];
        priority: number;
    } | {
        match: {
            evt: string;
            lvl?: undefined;
        };
        actions: ({
            type: string;
            window?: undefined;
        } | {
            type: string;
            window: number;
        })[];
        priority: number;
    } | {
        match: {
            evt: string[];
            lvl?: undefined;
        };
        actions: {
            type: string;
        }[];
        priority: number;
    })[];
};
//# sourceMappingURL=node-defaults.d.ts.map