import * as fs from 'fs';
import * as path from 'path';
export class LoggerRenderer {
    inputPipe;
    writeStream;
    constructor(kernel, logFilePath) {
        this.inputPipe = kernel.createPipe();
        const dir = path.dirname(logFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.writeStream = fs.createWriteStream(logFilePath, { flags: 'a' });
        this.inputPipe.on('data', (data) => {
            this.writeStream.write(data);
        });
        this.inputPipe.on('error', (err) => {
            console.error('LoggerRenderer error:', err);
        });
    }
    destroy() {
        this.inputPipe.removeAllListeners();
        this.writeStream.end();
    }
}
//# sourceMappingURL=LoggerRenderer.js.map