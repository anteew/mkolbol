#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
function printHelp() {
    console.log(`mkctl - Microkernel Control CLI

USAGE
  mkctl <command>

COMMANDS
  endpoints    List all registered endpoints with type and coordinates

EXAMPLES
  mkctl endpoints

LEARN MORE
  Documentation: https://github.com/anteew/mkolbol
`);
}
async function main() {
    const [, , cmd] = process.argv;
    switch (cmd) {
        case 'endpoints': {
            const snapshotPath = path.resolve(process.cwd(), 'reports', 'endpoints.json');
            let endpoints;
            try {
                const data = await fs.readFile(snapshotPath, 'utf-8');
                endpoints = JSON.parse(data);
            }
            catch (err) {
                console.log('No endpoints registered.');
                break;
            }
            if (endpoints.length === 0) {
                console.log('No endpoints registered.');
                break;
            }
            console.log('Registered Endpoints:');
            console.log('');
            for (const endpoint of endpoints) {
                console.log(`ID:          ${endpoint.id}`);
                console.log(`Type:        ${endpoint.type}`);
                console.log(`Coordinates: ${endpoint.coordinates}`);
                if (endpoint.metadata?.ioMode) {
                    console.log(`IO Mode:     ${endpoint.metadata.ioMode}`);
                }
                if (endpoint.metadata && Object.keys(endpoint.metadata).length > 0) {
                    console.log(`Metadata:    ${JSON.stringify(endpoint.metadata)}`);
                }
                console.log('');
            }
            break;
        }
        default:
            printHelp();
            if (cmd) {
                console.error(`\nUnknown command: ${cmd}`);
                process.exit(1);
            }
    }
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=mkctl.js.map