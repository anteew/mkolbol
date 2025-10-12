import * as fs from 'node:fs';
import * as path from 'node:path';
export class CodeFrameExtractor {
    contextLines = 2;
    sourcemapCache = new Map();
    constructor(contextLines = 2) {
        this.contextLines = contextLines;
    }
    extractFromStack(stack) {
        const frames = [];
        const parsedFrames = this.parseStackTrace(stack);
        for (const frame of parsedFrames) {
            if (!frame.file || !frame.line) {
                continue;
            }
            const resolvedFrame = this.resolveSourceMap(frame);
            const codeFrame = this.extractCodeFrame(resolvedFrame);
            if (codeFrame) {
                frames.push(codeFrame);
                if (frames.length >= 3)
                    break;
            }
        }
        return frames;
    }
    parseStackTrace(stack) {
        const frames = [];
        const lines = stack.split('\n');
        for (const line of lines) {
            const frame = this.parseStackLine(line);
            if (frame) {
                frames.push(frame);
            }
        }
        return frames;
    }
    parseStackLine(line) {
        const patterns = [
            /at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/,
            /^\s*(.+?)@(.+?):(\d+):(\d+)/,
            /^\s*at\s+(.+?):(\d+):(\d+)/,
        ];
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                if (match.length === 5) {
                    return {
                        function: match[1]?.trim(),
                        file: match[2],
                        line: parseInt(match[3], 10),
                        column: parseInt(match[4], 10),
                    };
                }
                else if (match.length === 4) {
                    return {
                        file: match[1],
                        line: parseInt(match[2], 10),
                        column: parseInt(match[3], 10),
                    };
                }
            }
        }
        return null;
    }
    resolveSourceMap(frame) {
        if (!frame.file)
            return frame;
        const mapFile = `${frame.file}.map`;
        if (!fs.existsSync(mapFile)) {
            const tsFile = frame.file.replace(/\.js$/, '.ts');
            if (fs.existsSync(tsFile)) {
                return { ...frame, file: tsFile };
            }
            return frame;
        }
        try {
            let sourceMap = this.sourcemapCache.get(mapFile);
            if (!sourceMap) {
                const mapContent = fs.readFileSync(mapFile, 'utf-8');
                sourceMap = JSON.parse(mapContent);
                this.sourcemapCache.set(mapFile, sourceMap);
            }
            if (sourceMap.sources && sourceMap.sources.length > 0) {
                const originalFile = path.resolve(path.dirname(frame.file), sourceMap.sources[0]);
                if (fs.existsSync(originalFile)) {
                    return { ...frame, file: originalFile };
                }
            }
        }
        catch (e) {
        }
        return frame;
    }
    extractCodeFrame(frame) {
        if (!frame.file || !frame.line)
            return null;
        try {
            if (!fs.existsSync(frame.file)) {
                return null;
            }
            const content = fs.readFileSync(frame.file, 'utf-8');
            const lines = content.split('\n');
            if (frame.line > lines.length || frame.line < 1) {
                return null;
            }
            const focusLine = frame.line - 1;
            const startLine = Math.max(0, focusLine - this.contextLines);
            const endLine = Math.min(lines.length - 1, focusLine + this.contextLines);
            const before = [];
            for (let i = startLine; i < focusLine; i++) {
                before.push(lines[i]);
            }
            const focus = lines[focusLine];
            const after = [];
            for (let i = focusLine + 1; i <= endLine; i++) {
                after.push(lines[i]);
            }
            return {
                file: frame.file,
                line: frame.line,
                column: frame.column,
                source: lines.slice(startLine, endLine + 1),
                context: {
                    before,
                    focus,
                    after,
                },
            };
        }
        catch (e) {
            return null;
        }
    }
    formatCodeFrame(codeFrame) {
        const lines = [];
        const lineNumWidth = String(codeFrame.line + this.contextLines).length;
        lines.push(`  at ${codeFrame.file}:${codeFrame.line}${codeFrame.column ? `:${codeFrame.column}` : ''}`);
        let currentLine = codeFrame.line - codeFrame.context.before.length;
        for (const line of codeFrame.context.before) {
            const lineNum = String(currentLine).padStart(lineNumWidth, ' ');
            lines.push(`  ${lineNum} | ${line}`);
            currentLine++;
        }
        const focusLineNum = String(currentLine).padStart(lineNumWidth, ' ');
        lines.push(`> ${focusLineNum} | ${codeFrame.context.focus}`);
        if (codeFrame.column) {
            const indicator = ' '.repeat(lineNumWidth + 3 + (codeFrame.column - 1)) + '^';
            lines.push(indicator);
        }
        currentLine++;
        for (const line of codeFrame.context.after) {
            const lineNum = String(currentLine).padStart(lineNumWidth, ' ');
            lines.push(`  ${lineNum} | ${line}`);
            currentLine++;
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=codeframe.js.map