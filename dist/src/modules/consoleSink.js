import { Writable } from 'stream';
export class ConsoleSink {
    prefix;
    inputPipe;
    constructor(prefix = '[sink]') {
        this.prefix = prefix;
        const sink = new Writable({
            objectMode: true,
            write(chunk, _enc, cb) {
                if (typeof chunk === 'string') {
                    console.log(`${prefix} ${chunk}`);
                }
                else if (Buffer.isBuffer(chunk)) {
                    console.log(`${prefix} ${formatBuffer(chunk)}`);
                }
                else {
                    console.log(`${prefix} ${JSON.stringify(chunk)}`);
                }
                cb();
            }
        });
        this.inputPipe = sink;
    }
}
function formatBuffer(buf) {
    const maxUtf8Length = 100;
    const maxHexBytes = 64;
    if (buf.length === 0) {
        return 'Buffer(0) []';
    }
    const isLikelyText = buf.every(byte => (byte >= 0x20 && byte <= 0x7E) ||
        byte === 0x09 || byte === 0x0A || byte === 0x0D);
    if (isLikelyText && buf.length <= maxUtf8Length) {
        const str = buf.toString('utf8');
        return `Buffer(${buf.length}) "${str}"`;
    }
    if (buf.length <= maxHexBytes) {
        const hex = buf.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
        return `Buffer(${buf.length}) [${hex}]`;
    }
    const preview = buf.subarray(0, maxHexBytes);
    const hex = preview.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
    return `Buffer(${buf.length}) [${hex} ... +${buf.length - maxHexBytes} bytes]`;
}
//# sourceMappingURL=consoleSink.js.map