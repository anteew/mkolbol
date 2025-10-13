import { PassThrough } from 'stream';
export class InProcPipe {
    createDuplex(options) {
        return new PassThrough(options);
    }
}
//# sourceMappingURL=InProcPipe.js.map