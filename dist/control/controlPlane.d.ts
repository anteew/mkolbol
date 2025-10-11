import { Router } from "../kernel/router";
export type MiddlewareState = {
    name: string;
    enabled: boolean;
};
export declare class ControlPlane {
    private router;
    private onChange;
    private state;
    constructor(router: Router, onChange: () => void);
    private current;
    private setEnabled;
    private register;
}
//# sourceMappingURL=controlPlane.d.ts.map