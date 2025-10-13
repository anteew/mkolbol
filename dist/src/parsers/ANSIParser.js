export class ANSIParser {
    state;
    constructor(rows = 24, cols = 80) {
        this.state = this.createEmptyState(rows, cols);
    }
    createEmptyState(rows, cols) {
        return {
            cells: Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({ char: ' ', fg: null, bg: null }))),
            cursorX: 0,
            cursorY: 0,
            rows,
            cols,
            scrollback: [],
            currentFg: null,
            currentBg: null
        };
    }
    parse(data) {
        const str = data.toString();
        let i = 0;
        while (i < str.length) {
            const char = str[i];
            if (char === '\x1b') {
                const seq = this.parseEscapeSequence(str, i);
                this.handleEscapeSequence(seq);
                i += seq.length;
            }
            else if (char === '\n') {
                this.state.cursorY++;
                this.state.cursorX = 0;
                i++;
            }
            else if (char === '\r') {
                this.state.cursorX = 0;
                i++;
            }
            else if (char === '\b') {
                if (this.state.cursorX > 0) {
                    this.state.cursorX--;
                }
                i++;
            }
            else if (char === '\t') {
                this.state.cursorX = Math.min(this.state.cols - 1, ((this.state.cursorX + 8) >> 3) << 3);
                i++;
            }
            else {
                if (this.state.cursorY < this.state.rows && this.state.cursorX < this.state.cols) {
                    this.state.cells[this.state.cursorY][this.state.cursorX] = {
                        char: char,
                        fg: this.state.currentFg,
                        bg: this.state.currentBg
                    };
                }
                this.state.cursorX++;
                i++;
            }
            if (this.state.cursorX >= this.state.cols) {
                this.state.cursorX = 0;
                this.state.cursorY++;
            }
            if (this.state.cursorY >= this.state.rows) {
                this.scroll();
            }
        }
        return this.state;
    }
    parseEscapeSequence(str, start) {
        let i = start + 1;
        if (i >= str.length) {
            return { type: 'unknown', length: 1 };
        }
        if (str[i] === '[') {
            i++;
            let params = '';
            while (i < str.length && /[0-9;]/.test(str[i])) {
                params += str[i];
                i++;
            }
            const cmd = i < str.length ? str[i] : '';
            return {
                type: 'csi',
                params: params ? params.split(';').map(p => parseInt(p) || 0) : [],
                cmd: cmd,
                length: i - start + 1,
                raw: str.substring(start, i + 1)
            };
        }
        else if (str[i] === ']') {
            i++;
            while (i < str.length && str[i] !== '\x07' && str[i] !== '\x1b') {
                i++;
            }
            if (i < str.length && str[i] === '\x1b')
                i++;
            if (i < str.length && str[i] === '\\')
                i++;
            return {
                type: 'osc',
                length: i - start + 1,
                raw: str.substring(start, i + 1)
            };
        }
        return { type: 'unknown', length: 2 };
    }
    handleEscapeSequence(seq) {
        if (seq.type === 'csi' && seq.cmd) {
            switch (seq.cmd) {
                case 'm':
                    this.handleSGR(seq.params || []);
                    break;
                case 'H':
                case 'f':
                    const row = (seq.params?.[0] || 1) - 1;
                    const col = (seq.params?.[1] || 1) - 1;
                    this.state.cursorY = Math.max(0, Math.min(this.state.rows - 1, row));
                    this.state.cursorX = Math.max(0, Math.min(this.state.cols - 1, col));
                    break;
                case 'J':
                    this.clearDisplay(seq.params?.[0] || 0);
                    break;
                case 'K':
                    this.clearLine(seq.params?.[0] || 0);
                    break;
                case 'A':
                    this.state.cursorY = Math.max(0, this.state.cursorY - (seq.params?.[0] || 1));
                    break;
                case 'B':
                    this.state.cursorY = Math.min(this.state.rows - 1, this.state.cursorY + (seq.params?.[0] || 1));
                    break;
                case 'C':
                    this.state.cursorX = Math.min(this.state.cols - 1, this.state.cursorX + (seq.params?.[0] || 1));
                    break;
                case 'D':
                    this.state.cursorX = Math.max(0, this.state.cursorX - (seq.params?.[0] || 1));
                    break;
                case 'G':
                    const colPos = (seq.params?.[0] || 1) - 1;
                    this.state.cursorX = Math.max(0, Math.min(this.state.cols - 1, colPos));
                    break;
            }
        }
    }
    handleSGR(params) {
        if (params.length === 0)
            params = [0];
        for (const param of params) {
            if (param === 0) {
                this.state.currentFg = null;
                this.state.currentBg = null;
            }
            else if (param >= 30 && param <= 37) {
                this.state.currentFg = this.ansiColorToRGB(param - 30);
            }
            else if (param >= 40 && param <= 47) {
                this.state.currentBg = this.ansiColorToRGB(param - 40);
            }
            else if (param >= 90 && param <= 97) {
                this.state.currentFg = this.ansiColorToRGB(param - 90 + 8);
            }
            else if (param >= 100 && param <= 107) {
                this.state.currentBg = this.ansiColorToRGB(param - 100 + 8);
            }
        }
    }
    ansiColorToRGB(color) {
        const colors = [
            '#000000', '#800000', '#008000', '#808000',
            '#000080', '#800080', '#008080', '#c0c0c0',
            '#808080', '#ff0000', '#00ff00', '#ffff00',
            '#0000ff', '#ff00ff', '#00ffff', '#ffffff'
        ];
        return colors[color] || '#ffffff';
    }
    clearDisplay(mode) {
        if (mode === 0) {
            for (let y = this.state.cursorY; y < this.state.rows; y++) {
                const startX = y === this.state.cursorY ? this.state.cursorX : 0;
                for (let x = startX; x < this.state.cols; x++) {
                    this.state.cells[y][x] = { char: ' ', fg: null, bg: null };
                }
            }
        }
        else if (mode === 1) {
            for (let y = 0; y <= this.state.cursorY; y++) {
                const endX = y === this.state.cursorY ? this.state.cursorX : this.state.cols - 1;
                for (let x = 0; x <= endX; x++) {
                    this.state.cells[y][x] = { char: ' ', fg: null, bg: null };
                }
            }
        }
        else if (mode === 2) {
            this.state = this.createEmptyState(this.state.rows, this.state.cols);
        }
    }
    clearLine(mode) {
        const y = this.state.cursorY;
        if (mode === 0) {
            for (let x = this.state.cursorX; x < this.state.cols; x++) {
                this.state.cells[y][x] = { char: ' ', fg: null, bg: null };
            }
        }
        else if (mode === 1) {
            for (let x = 0; x <= this.state.cursorX; x++) {
                this.state.cells[y][x] = { char: ' ', fg: null, bg: null };
            }
        }
        else if (mode === 2) {
            for (let x = 0; x < this.state.cols; x++) {
                this.state.cells[y][x] = { char: ' ', fg: null, bg: null };
            }
        }
    }
    scroll() {
        this.state.scrollback.push(this.state.cells[0]);
        for (let i = 0; i < this.state.rows - 1; i++) {
            this.state.cells[i] = this.state.cells[i + 1];
        }
        this.state.cells[this.state.rows - 1] = Array(this.state.cols)
            .fill(null)
            .map(() => ({ char: ' ', fg: null, bg: null }));
        this.state.cursorY = this.state.rows - 1;
    }
    getState() {
        return this.state;
    }
    reset() {
        this.state = this.createEmptyState(this.state.rows, this.state.cols);
    }
}
//# sourceMappingURL=ANSIParser.js.map