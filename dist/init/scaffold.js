import * as fs from 'node:fs';
const TEMPLATES = {
    'node-defaults': {
        enabled: true,
        budget: {
            kb: 10,
            lines: 200,
        },
        rules: [
            {
                match: { lvl: 'error' },
                actions: [{ type: 'include' }, { type: 'codeframe', contextLines: 2 }],
                priority: 10,
            },
            {
                match: { evt: 'assert.fail' },
                actions: [
                    { type: 'include' },
                    { type: 'slice', window: 10 },
                    { type: 'codeframe', contextLines: 2 },
                ],
                priority: 9,
            },
            {
                match: { evt: ['worker.ready', 'worker.exit', 'worker.error'] },
                actions: [{ type: 'include' }],
                priority: 7,
            },
        ],
    },
    'go-defaults': {
        enabled: true,
        budget: {
            kb: 10,
            lines: 200,
        },
        rules: [
            {
                match: { lvl: 'error' },
                actions: [{ type: 'include' }, { type: 'codeframe', contextLines: 2 }],
                priority: 10,
            },
            {
                match: { evt: 'test.fail' },
                actions: [
                    { type: 'include' },
                    { type: 'slice', window: 10 },
                    { type: 'codeframe', contextLines: 2 },
                ],
                priority: 9,
            },
            {
                match: { phase: ['teardown', 'cleanup'] },
                actions: [{ type: 'include' }],
                priority: 6,
            },
        ],
    },
    minimal: {
        enabled: true,
        budget: {
            kb: 10,
            lines: 200,
        },
        rules: [
            {
                match: { lvl: 'error' },
                actions: [{ type: 'include' }],
                priority: 10,
            },
        ],
    },
};
export function scaffold(options = {}) {
    const template = options.template || 'node-defaults';
    const configPath = 'laminar.config.json';
    const dryRun = options.dryRun ?? false;
    const force = options.force ?? false;
    const silent = options.silent ?? false;
    // Check if config already exists
    if (fs.existsSync(configPath) && !force) {
        return {
            success: false,
            configPath,
            configContent: '',
            gitignoreUpdated: false,
            message: `${configPath} already exists. Use --force to overwrite.`,
        };
    }
    // Get template content
    const templateData = TEMPLATES[template];
    if (!templateData) {
        return {
            success: false,
            configPath,
            configContent: '',
            gitignoreUpdated: false,
            message: `Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(', ')}`,
        };
    }
    const configContent = JSON.stringify(templateData, null, 2);
    // Dry run: just show what would be created
    if (dryRun) {
        return {
            success: true,
            configPath,
            configContent,
            gitignoreUpdated: false,
            message: `[DRY RUN] Would create ${configPath} with template: ${template}`,
        };
    }
    // Write config file
    try {
        fs.writeFileSync(configPath, configContent + '\n', 'utf-8');
    }
    catch (err) {
        return {
            success: false,
            configPath,
            configContent,
            gitignoreUpdated: false,
            message: `Failed to write ${configPath}: ${err}`,
        };
    }
    // Update .gitignore if needed
    let gitignoreUpdated = false;
    const gitignorePath = '.gitignore';
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        const entries = gitignoreContent.split('\n');
        const needsReports = !entries.some(line => line.trim() === 'reports/' || line.trim() === 'reports');
        if (needsReports) {
            const updatedContent = gitignoreContent.trimEnd() + '\nreports/\n';
            fs.writeFileSync(gitignorePath, updatedContent, 'utf-8');
            gitignoreUpdated = true;
        }
    }
    const messages = [`Created ${configPath} with template: ${template}`];
    if (gitignoreUpdated) {
        messages.push('Updated .gitignore to include reports/');
    }
    if (!silent) {
        console.log(`✓ ${messages.join('\n✓ ')}`);
    }
    return {
        success: true,
        configPath,
        configContent,
        gitignoreUpdated,
        message: messages.join('\n'),
    };
}
export function printScaffoldPreview(result) {
    if (result.success && result.configContent) {
        console.log(`\n=== ${result.configPath} ===`);
        console.log(result.configContent);
        console.log('');
    }
    console.log(result.message);
}
//# sourceMappingURL=scaffold.js.map