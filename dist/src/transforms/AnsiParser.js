export class AnsiParser {
    state;
    buffer = '';
    events = [];
    constructor() {
        this.state = this.createInitialState();
    }
    createInitialState() {
        return {
            cursorX: 0,
            cursorY: 0,
            bold: false,
            underline: false,
            foregroundColor: null,
            backgroundColor: null,
            inverse: false,
        };
    }
    parse(input) {
        this.events = [];
        this.buffer = input;
        let i = 0;
        while (i < this.buffer.length) {
            const char = this.buffer[i];
            const charCode = char.charCodeAt(0);
            if (char === '\x1B' || char === '\u009B') {
                const escapeLen = this.parseEscapeSequence(i);
                i += escapeLen;
            }
            else if (char === '\n') {
                this.handleLineFeed();
                i++;
            }
            else if (char === '\r') {
                this.handleCarriageReturn();
                i++;
            }
            else if (char === '\t') {
                this.handleTab();
                i++;
            }
            else if (char === '\b') {
                this.handleBackspace();
                i++;
            }
            else if (charCode >= 32 && charCode <= 126) {
                this.handlePrintable(char);
                i++;
            }
            else if (charCode >= 160) {
                this.handlePrintable(char);
                i++;
            }
            else {
                i++;
            }
        }
        return this.events;
    }
    parseEscapeSequence(startIndex) {
        const start = startIndex;
        let i = startIndex + 1;
        if (i >= this.buffer.length)
            return 1;
        const next = this.buffer[i];
        if (next === '[') {
            i++;
            const csiResult = this.parseCSI(i);
            return csiResult;
        }
        else if (next === ']') {
            i++;
            const oscLen = this.parseOSC(i);
            return oscLen;
        }
        return i - start;
    }
    parseCSI(startIndex) {
        let i = startIndex;
        let paramStr = '';
        while (i < this.buffer.length) {
            const char = this.buffer[i];
            const charCode = char.charCodeAt(0);
            if (charCode >= 0x30 && charCode <= 0x3F) {
                paramStr += char;
                i++;
            }
            else if (charCode >= 0x40 && charCode <= 0x7E) {
                this.executeCSI(paramStr, char);
                return i - startIndex + 3;
            }
            else {
                break;
            }
        }
        return i - startIndex + 2;
    }
    parseOSC(startIndex) {
        let i = startIndex;
        while (i < this.buffer.length) {
            const char = this.buffer[i];
            if (char === '\x07' || (char === '\x1B' && this.buffer[i + 1] === '\\')) {
                return i - startIndex + (char === '\x07' ? 3 : 4);
            }
            i++;
        }
        return i - startIndex + 2;
    }
    executeCSI(paramStr, command) {
        const params = paramStr.split(';').map(p => (p === '' ? 0 : parseInt(p, 10)));
        switch (command) {
            case 'm':
                this.handleSGR(params);
                break;
            case 'H':
            case 'f':
                this.handleCUP(params);
                break;
            case 'A':
                this.handleCUU(params[0] || 1);
                break;
            case 'B':
                this.handleCUD(params[0] || 1);
                break;
            case 'C':
                this.handleCUF(params[0] || 1);
                break;
            case 'D':
                this.handleCUB(params[0] || 1);
                break;
            case 'J':
                this.handleED(params[0] || 0);
                break;
            case 'K':
                this.handleEL(params[0] || 0);
                break;
        }
    }
    handleSGR(params) {
        if (params.length === 0)
            params = [0];
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            if (param === 0) {
                this.state.bold = false;
                this.state.underline = false;
                this.state.inverse = false;
                this.state.foregroundColor = null;
                this.state.backgroundColor = null;
            }
            else if (param === 1) {
                this.state.bold = true;
            }
            else if (param === 4) {
                this.state.underline = true;
            }
            else if (param === 7) {
                this.state.inverse = true;
            }
            else if (param === 22) {
                this.state.bold = false;
            }
            else if (param === 24) {
                this.state.underline = false;
            }
            else if (param === 27) {
                this.state.inverse = false;
            }
            else if (param >= 30 && param <= 37) {
                this.state.foregroundColor = param - 30;
            }
            else if (param === 39) {
                this.state.foregroundColor = null;
            }
            else if (param >= 40 && param <= 47) {
                this.state.backgroundColor = param - 40;
            }
            else if (param === 49) {
                this.state.backgroundColor = null;
            }
            else if (param >= 90 && param <= 97) {
                this.state.foregroundColor = param - 90 + 8;
            }
            else if (param >= 100 && param <= 107) {
                this.state.backgroundColor = param - 100 + 8;
            }
        }
        this.events.push({
            type: 'style',
            data: { ...this.state },
        });
    }
    handleCUP(params) {
        const row = (params[0] || 1) - 1;
        const col = (params[1] || 1) - 1;
        this.state.cursorY = Math.max(0, row);
        this.state.cursorX = Math.max(0, col);
        this.events.push({
            type: 'cursor',
            data: { action: 'position', x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleCUU(n) {
        this.state.cursorY = Math.max(0, this.state.cursorY - n);
        this.events.push({
            type: 'cursor',
            data: { action: 'up', amount: n, x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleCUD(n) {
        this.state.cursorY += n;
        this.events.push({
            type: 'cursor',
            data: { action: 'down', amount: n, x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleCUF(n) {
        this.state.cursorX += n;
        this.events.push({
            type: 'cursor',
            data: { action: 'forward', amount: n, x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleCUB(n) {
        this.state.cursorX = Math.max(0, this.state.cursorX - n);
        this.events.push({
            type: 'cursor',
            data: { action: 'back', amount: n, x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleED(mode) {
        this.events.push({
            type: 'erase',
            data: { target: 'display', mode },
        });
    }
    handleEL(mode) {
        this.events.push({
            type: 'erase',
            data: { target: 'line', mode },
        });
    }
    handleLineFeed() {
        this.state.cursorY++;
        this.events.push({
            type: 'print',
            data: { char: '\n', x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleCarriageReturn() {
        this.state.cursorX = 0;
        this.events.push({
            type: 'cursor',
            data: { action: 'carriageReturn', x: 0, y: this.state.cursorY },
        });
    }
    handleTab() {
        const nextTabStop = Math.floor(this.state.cursorX / 8) * 8 + 8;
        this.state.cursorX = nextTabStop;
        this.events.push({
            type: 'print',
            data: { char: '\t', x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handleBackspace() {
        this.state.cursorX = Math.max(0, this.state.cursorX - 1);
        this.events.push({
            type: 'cursor',
            data: { action: 'backspace', x: this.state.cursorX, y: this.state.cursorY },
        });
    }
    handlePrintable(char) {
        this.events.push({
            type: 'print',
            data: { char, x: this.state.cursorX, y: this.state.cursorY, style: { ...this.state } },
        });
        this.state.cursorX++;
    }
    getState() {
        return { ...this.state };
    }
    reset() {
        this.state = this.createInitialState();
        this.buffer = '';
        this.events = [];
    }
}
//# sourceMappingURL=AnsiParser.js.map