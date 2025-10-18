import { Duplex, PassThrough } from 'node:stream';

// Serial-like adapter: here we simulate with a PassThrough. On real hardware, replace
// with a serialport Duplex (or any Duplex) and keep the rest unchanged.
class SerialLike extends Duplex {
  private rx = new PassThrough();
  private tx = new PassThrough();
  constructor() {
    super();
    this.tx.on('data', (chunk) => this.push(chunk));
  }
  // Device receives data from host (write into rx)
  _write(chunk: Buffer, _enc: BufferEncoding, cb: (e?: Error | null) => void) {
    this.rx.write(chunk);
    cb();
  }
  // Host reads data coming from device (read from tx)
  _read(_size: number) {
    // Pumped by this.tx 'data' handler
  }
  // For the demo: send a device message
  deviceWrite(data: Buffer | string) {
    this.tx.write(typeof data === 'string' ? Buffer.from(data) : data);
  }
  // For the demo: when host writes, echo uppercase back from device
  startEchoUppercase() {
    this.rx.on('data', (buf: Buffer) => {
      const up = Buffer.from(buf.toString('utf8').toUpperCase());
      this.deviceWrite(up);
    });
  }
}

async function main() {
  const serial = new SerialLike();
  serial.startEchoUppercase();

  // Transform: uppercase has already been applied by the serial shim, but keep a place
  // holder to demonstrate chaining (no-op here).
  const transform = new PassThrough();

  // Sink: logs to console
  const sink = new PassThrough();
  sink.on('data', (b) => process.stdout.write(`[sink] ${b.toString('utf8')}`));

  // Wire: serial (Duplex) → transform → sink
  serial.pipe(transform).pipe(sink);

  // Simulate device traffic
  serial.write('hello serial\n'); // host → device; device echos uppercase back

  // Simulate device spontaneous message
  setTimeout(() => serial.deviceWrite('tick\n'), 300);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
