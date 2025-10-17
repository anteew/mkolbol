import fs from 'node:fs/promises';
import path from 'node:path';
export async function generatePromptSnippet() {
    const sections = [];
    sections.push('# MKolbol Project State');
    sections.push('');
    sections.push('**Generated for LLM context**');
    sections.push('');
    const topologySummary = await loadTopologySummary();
    sections.push('## Topology Summary');
    sections.push('');
    sections.push('```json');
    sections.push(JSON.stringify(topologySummary, null, 2));
    sections.push('```');
    sections.push('');
    const recentErrors = await loadRecentErrors();
    if (recentErrors.length > 0) {
        sections.push('## Recent Errors');
        sections.push('');
        sections.push('```json');
        sections.push(JSON.stringify(recentErrors, null, 2));
        sections.push('```');
        sections.push('');
    }
    const modules = await loadModuleList();
    sections.push('## Available Modules');
    sections.push('');
    sections.push('```json');
    sections.push(JSON.stringify(modules, null, 2));
    sections.push('```');
    sections.push('');
    const buildStatus = await checkBuildStatus();
    sections.push('## Build Status');
    sections.push('');
    sections.push('```json');
    sections.push(JSON.stringify(buildStatus, null, 2));
    sections.push('```');
    sections.push('');
    return sections.join('\n');
}
async function loadTopologySummary() {
    const snapshotPath = path.resolve(process.cwd(), 'reports', 'router-endpoints.json');
    try {
        const data = await fs.readFile(snapshotPath, 'utf-8');
        const endpoints = JSON.parse(data);
        const uniqueNodes = new Set();
        let connectionCount = 0;
        if (Array.isArray(endpoints)) {
            for (const ep of endpoints) {
                if (ep.id) {
                    const nodeId = ep.id.split('.')[0];
                    uniqueNodes.add(nodeId);
                }
            }
            connectionCount = endpoints.length;
        }
        return {
            nodes: uniqueNodes.size,
            connections: connectionCount,
            pipes: endpoints.length,
        };
    }
    catch {
        return {
            nodes: 0,
            connections: 0,
            pipes: 0,
        };
    }
}
async function loadRecentErrors() {
    const errorLogPath = path.resolve(process.cwd(), '.mk', 'state', 'errors.json');
    try {
        const data = await fs.readFile(errorLogPath, 'utf-8');
        const errors = JSON.parse(data);
        if (Array.isArray(errors)) {
            return errors.slice(-5);
        }
    }
    catch {
        // No errors file
    }
    return [];
}
async function loadModuleList() {
    const modulesDir = path.resolve(process.cwd(), 'src', 'modules');
    try {
        const entries = await fs.readdir(modulesDir);
        const modules = [];
        for (const entry of entries) {
            if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
                const moduleName = entry.replace('.ts', '');
                let moduleType = 'transform';
                if (moduleName.includes('sink') || moduleName.includes('output')) {
                    moduleType = 'output';
                }
                else if (moduleName.includes('source') ||
                    moduleName.includes('input') ||
                    moduleName.includes('timer') ||
                    moduleName.includes('keyboard')) {
                    moduleType = 'input';
                }
                modules.push({
                    name: moduleName,
                    type: moduleType,
                    path: `src/modules/${entry}`,
                });
            }
        }
        modules.sort((a, b) => a.name.localeCompare(b.name));
        return modules;
    }
    catch {
        return [];
    }
}
async function checkBuildStatus() {
    const distPath = path.resolve(process.cwd(), 'dist');
    try {
        const stats = await fs.stat(distPath);
        return {
            status: 'built',
            lastBuild: stats.mtime.toISOString(),
        };
    }
    catch {
        return {
            status: 'not-built',
        };
    }
}
export async function isPromptDisabled() {
    const flagPath = path.resolve(process.cwd(), '.mk', 'state', 'prompt-disabled');
    try {
        await fs.access(flagPath);
        return true;
    }
    catch {
        return false;
    }
}
export async function disablePrompt() {
    const flagPath = path.resolve(process.cwd(), '.mk', 'state', 'prompt-disabled');
    const stateDir = path.dirname(flagPath);
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(flagPath, new Date().toISOString(), 'utf-8');
}
export async function enablePrompt() {
    const flagPath = path.resolve(process.cwd(), '.mk', 'state', 'prompt-disabled');
    try {
        await fs.unlink(flagPath);
    }
    catch {
        // Already enabled or doesn't exist
    }
}
//# sourceMappingURL=prompt.js.map