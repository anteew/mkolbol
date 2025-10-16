import { Kernel } from 'mkolbol';
import * as http from 'http';

export class CalculatorServer {
  private server: http.Server | null = null;
  private kernel: Kernel;
  private options: { port: number; precision: number };

  constructor(kernel: Kernel, options: { port: number; precision: number }) {
    this.kernel = kernel;
    this.options = options;
  }

  start() {
    const { port, precision } = this.options;

    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`);
      const pathname = url.pathname;

      if (pathname === '/add') {
        const a = parseFloat(url.searchParams.get('a') || '0');
        const b = parseFloat(url.searchParams.get('b') || '0');
        const result = (a + b).toFixed(precision);

        const logMessage = `[${new Date().toISOString()}] GET ${req.url} → ${result}`;
        console.log(logMessage);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: parseFloat(result) }));
      } else if (pathname === '/subtract') {
        const a = parseFloat(url.searchParams.get('a') || '0');
        const b = parseFloat(url.searchParams.get('b') || '0');
        const result = (a - b).toFixed(precision);

        const logMessage = `[${new Date().toISOString()}] GET ${req.url} → ${result}`;
        console.log(logMessage);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: parseFloat(result) }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.server.listen(port, () => {
      console.log(`[calculator] Server listening on http://localhost:${port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
