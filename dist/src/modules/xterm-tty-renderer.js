import { Writable } from 'node:stream';
/**
 * XtermTTYRenderer
 *
 * Minimal terminal renderer that writes raw ANSI bytes to a TTY (default: process.stdout).
 * - Output-only module (inputPipe only)
 * - Optional alternate screen buffer management
 * - Testable: accepts custom writer
 */
export class XtermTTYRenderer {
    inputPipe;
    writer;
    altBuffer;
    started = false;
    constructor(options = {}) {
        this.writer = options.writer ?? process.stdout;
        this.altBuffer = Boolean(options.altBuffer);
        // Writable that forwards chunks to the terminal
        const sink = new Writable({
            write: (chunk, _enc, cb) => {
                try {
                    if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
                        this.writer.write(chunk);
                    }
                    else {
                        // If upstream sends objects (e.g., from parser), stringify minimally
                        const s = typeof chunk?.raw === 'string' ? chunk.raw : String(chunk);
                        this.writer.write(s);
                    }
                    cb();
                }
                catch (err) {
                    cb(err);
                }
            },
            objectMode: true,
        });
        this.inputPipe = sink;
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        if (this.altBuffer && this.writer.isTTY) {
            // Enter alternate screen buffer
            this.writer.write('\u001b[?1049h');
        }
    }
    stop() {
        if (!this.started)
            return;
        if (this.altBuffer && this.writer.isTTY) {
            // Leave alternate screen buffer
            this.writer.write('\u001b[?1049l');
        }
        this.started = false;
    }
}
//# sourceMappingURL=xterm-tty-renderer.js.map