import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CodeFrame {
  file: string;
  line: number;
  column?: number;
  source: string[];
  context: {
    before: string[];
    focus: string;
    after: string[];
  };
}

export interface StackFrame {
  file?: string;
  line?: number;
  column?: number;
  function?: string;
}

export class CodeFrameExtractor {
  private contextLines: number = 2;
  private sourcemapCache: Map<string, any> = new Map();

  constructor(contextLines: number = 2) {
    this.contextLines = contextLines;
  }

  extractFromStack(stack: string): CodeFrame[] {
    const frames: CodeFrame[] = [];
    const parsedFrames = this.parseStackTrace(stack);

    for (const frame of parsedFrames) {
      if (!frame.file || !frame.line) {
        continue;
      }

      const resolvedFrame = this.resolveSourceMap(frame);
      const codeFrame = this.extractCodeFrame(resolvedFrame);

      if (codeFrame) {
        frames.push(codeFrame);
        if (frames.length >= 3) break;
      }
    }

    return frames;
  }

  private parseStackTrace(stack: string): StackFrame[] {
    const frames: StackFrame[] = [];
    const lines = stack.split('\n');

    for (const line of lines) {
      const frame = this.parseStackLine(line);
      if (frame) {
        frames.push(frame);
      }
    }

    return frames;
  }

  private parseStackLine(line: string): StackFrame | null {
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
        } else if (match.length === 4) {
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

  private resolveSourceMap(frame: StackFrame): StackFrame {
    if (!frame.file) return frame;

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
        const originalFile = path.resolve(
          path.dirname(frame.file),
          sourceMap.sources[0]
        );
        
        if (fs.existsSync(originalFile)) {
          return { ...frame, file: originalFile };
        }
      }
    } catch (e) {
    }

    return frame;
  }

  private extractCodeFrame(frame: StackFrame): CodeFrame | null {
    if (!frame.file || !frame.line) return null;

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

      const before: string[] = [];
      for (let i = startLine; i < focusLine; i++) {
        before.push(lines[i]);
      }

      const focus = lines[focusLine];

      const after: string[] = [];
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
    } catch (e) {
      return null;
    }
  }

  formatCodeFrame(codeFrame: CodeFrame): string {
    const lines: string[] = [];
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
