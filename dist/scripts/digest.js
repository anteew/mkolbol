#!/usr/bin/env tsx
import { generateAllDigests, generateDigestsForCases } from '../src/digest/generator.js';
async function main() {
    console.log('Laminar Digest Generator');
    console.log('========================\n');
    const args = process.argv.slice(2);
    const casesIndex = args.indexOf('--cases');
    const configPath = 'laminar.config.json';
    let count;
    if (casesIndex !== -1 && args[casesIndex + 1]) {
        const cases = args[casesIndex + 1].split(',').map(c => c.trim());
        count = await generateDigestsForCases(cases, configPath);
    }
    else {
        count = await generateAllDigests(configPath);
    }
    if (count === 0) {
        console.log('\nNo failing test cases found.');
    }
    else {
        console.log(`\nGenerated ${count} digest(s).`);
    }
}
main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
//# sourceMappingURL=digest.js.map