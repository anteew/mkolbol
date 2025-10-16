import { EventEmitter } from 'events';
import * as readline from 'readline';
export class KeyboardInput extends EventEmitter {
    originalMode;
    isActive = false;
    start() {
        if (this.isActive)
            return;
        if (!process.stdin.isTTY) {
            this.emit('error', new Error('stdin is not a TTY'));
            return;
        }
        this.originalMode = process.stdin.isRaw;
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
        }
        readline.emitKeypressEvents(process.stdin);
        process.stdin.on('keypress', this.handleKeypress);
        this.isActive = true;
    }
    stop() {
        if (!this.isActive)
            return;
        process.stdin.off('keypress', this.handleKeypress);
        if (process.stdin.setRawMode && this.originalMode !== undefined) {
            process.stdin.setRawMode(this.originalMode);
        }
        this.isActive = false;
    }
    handleKeypress = (str, key) => {
        if (key.ctrl && key.name === 'c') {
            this.emit('ctrl-c');
            this.stop();
            process.exit(0);
            return;
        }
        const event = {
            name: key.name,
            sequence: str,
            ctrl: key.ctrl || false,
            meta: key.meta || false,
            shift: key.shift || false,
        };
        this.emit('keypress', event);
    };
}
//# sourceMappingURL=keyboard-input.js.map