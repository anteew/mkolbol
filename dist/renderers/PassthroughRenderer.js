export class PassthroughRenderer {
    inputPipe;
    constructor(kernel) {
        this.inputPipe = kernel.createPipe();
        this.inputPipe.on('data', (data) => {
            process.stdout.write(data);
        });
        this.inputPipe.on('error', (err) => {
            console.error('PassthroughRenderer error:', err);
        });
    }
    destroy() {
        this.inputPipe.removeAllListeners();
        this.inputPipe.destroy();
    }
}
//# sourceMappingURL=PassthroughRenderer.js.map