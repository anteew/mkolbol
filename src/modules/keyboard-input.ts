import { EventEmitter } from 'events';
import * as readline from 'readline';

export interface KeypressEvent {
  name?: string;
  sequence: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

export class KeyboardInput extends EventEmitter {
  private originalMode: boolean | undefined;
  private isActive = false;

  start(): void {
    if (this.isActive) return;

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

  stop(): void {
    if (!this.isActive) return;

    process.stdin.off('keypress', this.handleKeypress);

    if (process.stdin.setRawMode && this.originalMode !== undefined) {
      process.stdin.setRawMode(this.originalMode);
    }

    this.isActive = false;
  }

  private handleKeypress = (str: string, key: readline.Key): void => {
    if (key.ctrl && key.name === 'c') {
      this.emit('ctrl-c');
      this.stop();
      process.exit(0);
      return;
    }

    const event: KeypressEvent = {
      name: key.name,
      sequence: str,
      ctrl: key.ctrl || false,
      meta: key.meta || false,
      shift: key.shift || false,
    };

    this.emit('keypress', event);
  };
}
