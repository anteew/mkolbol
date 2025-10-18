import { AnsiParser, } from '../src/transforms/AnsiParser.js';
function withParser(options, fn) {
    const parser = new AnsiParser(options);
    fn(parser);
}
function logEvents(label, parser, input) {
    const events = parser.parse(input);
    console.log(`\n--- ${label} ---`);
    dumpEvents(events);
    console.log('State:', parser.getState());
}
function dumpEvents(events) {
    if (events.length === 0) {
        console.log('(no events emitted)');
        return;
    }
    for (const event of events) {
        console.dir(event, { depth: null });
    }
}
console.log('=== ANSI Parser P3 Feature Tour ===');
withParser({ cols: 16, rows: 4 }, (parser) => {
    logEvents('256-color foreground', parser, '\u001B[38;5;196mBright Red\u001B[0m');
    logEvents('Truecolor background', parser, '\u001B[48;2;32;64;128mCustom BG\u001B[0m');
});
withParser({ cols: 4, rows: 2 }, (parser) => {
    logEvents('Initial content before resize', parser, 'ABCD');
    const resizeEvent = parser.resize(6, 3);
    console.log('\nResize event:', resizeEvent);
    console.log('Dimensions:', parser.getDimensions());
    logEvents('Content after resize', parser, 'EFGH');
});
withParser({ cols: 4, rows: 3 }, (parser) => {
    logEvents('Auto-wrap disabled', parser, '\u001B[?7lWrap?');
    logEvents('Auto-wrap enabled', parser, '\u001B[?7hWrap!');
    logEvents('Screen inverse on', parser, '\u001B[?5h');
    logEvents('Screen inverse off', parser, '\u001B[?5l');
    console.log('Final DEC state:', {
        autoWrap: parser.getState().autoWrap,
        screenInverse: parser.getState().screenInverse,
    });
});
console.log('\nRun `npx vitest run --reporter=default tests/transforms/ansiParser.performance.spec.ts` to execute the lightweight performance guard.');
//# sourceMappingURL=ansi-parser-p3.js.map