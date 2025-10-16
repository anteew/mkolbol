import { EventEmitter } from 'events';
export interface KeypressEvent {
    name?: string;
    sequence: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
}
export declare class KeyboardInput extends EventEmitter {
    private originalMode;
    private isActive;
    start(): void;
    stop(): void;
    private handleKeypress;
}
//# sourceMappingURL=keyboard-input.d.ts.map