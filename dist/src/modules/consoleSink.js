import { Writable } from 'stream';
export class ConsoleSink {
    inputPipe;
    prefix;
    format;
    constructor(options) {
        if (typeof options === 'string') {
            this.prefix = options;
            this.format = 'text';
        }
        else {
            this.prefix = options?.prefix ?? '[sink]';
            this.format = options?.format ?? 'text';
        }
        const sink = new Writable({
            objectMode: true,
            write: (chunk, _enc, cb) => {
                if (this.format === 'jsonl') {
                    this.writeJsonl(chunk);
                }
                else {
                    this.writeText(chunk);
                }
                cb();
            },
        });
        this.inputPipe = sink;
    }
    writeText(chunk) {
        if (typeof chunk === 'string') {
            console.log(`${this.prefix} ${chunk}`);
        }
        else if (Buffer.isBuffer(chunk)) {
            console.log(`${this.prefix} ${formatBuffer(chunk)}`);
        }
        else {
            console.log(`${this.prefix} ${JSON.stringify(chunk)}`);
        }
    }
    writeJsonl(chunk) {
        const ts = new Date().toISOString();
        let data;
        if (Buffer.isBuffer(chunk)) {
            data = {
                type: 'Buffer',
                encoding: 'base64',
                data: chunk.toString('base64'),
            };
        }
        else {
            data = chunk;
        }
        const line = JSON.stringify({ ts, data });
        console.log(line);
    }
}
function formatBuffer(buf) {
    const maxUtf8Length = 100;
    const maxHexBytes = 64;
    if (buf.length === 0) {
        return 'Buffer(0) []';
    }
    const isLikelyText = buf.every((byte) => (byte >= 0x20 && byte <= 0x7e) || byte === 0x09 || byte === 0x0a || byte === 0x0d);
    if (isLikelyText && buf.length <= maxUtf8Length) {
        const str = buf.toString('utf8');
        return `Buffer(${buf.length}) "${str}"`;
    }
    if (buf.length <= maxHexBytes) {
        const hex = buf
            .toString('hex')
            .match(/.{1,2}/g)
            ?.join(' ') || '';
        return `Buffer(${buf.length}) [${hex}]`;
    }
    const preview = buf.subarray(0, maxHexBytes);
    const hex = preview
        .toString('hex')
        .match(/.{1,2}/g)
        ?.join(' ') || '';
    return `Buffer(${buf.length}) [${hex} ... +${buf.length - maxHexBytes} bytes]`;
}
//# sourceMappingURL=consoleSink.js.map