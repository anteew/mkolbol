import { readFileSync, existsSync, createReadStream } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as readline from 'readline';
const root = process.cwd();
const tmplPath = resolve(root, 'agent_template', 'agent_template.json');
const tmplSchemaPath = resolve(root, 'agent_template', 'schema', 'agent_template.schema.json');
const coreLogSchemaPath = resolve(root, 'agent_template', 'log_templates', 'core_sprint_log.schema.json');
const devexLogSchemaPath = resolve(root, 'agent_template', 'log_templates', 'devex_sprint_log.schema.json');
const coreLogExample = resolve(root, 'agent_template', 'log_templates', 'core_sprint_log.example.jsonl');
const devexLogExample = resolve(root, 'agent_template', 'log_templates', 'devex_sprint_log.example.jsonl');
function loadJSON(p) {
    return JSON.parse(readFileSync(p, 'utf8'));
}
async function validateJSONL(filePath, schemaPath, ajv) {
    if (!existsSync(filePath)) {
        console.error(`[template-validate] missing example: ${filePath}`);
        return false;
    }
    const schema = loadJSON(schemaPath);
    const validate = ajv.compile(schema);
    const rl = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let ok = true;
    let lineNo = 0;
    for await (const line of rl) {
        const t = line.trim();
        if (!t)
            continue;
        // examples should only contain JSON objects (no headings)
        lineNo++;
        try {
            const obj = JSON.parse(t);
            const valid = validate(obj);
            if (!valid) {
                ok = false;
                console.error(`[template-validate] ${filePath}:${lineNo} invalid:`);
                console.error(ajv.errorsText(validate.errors, { separator: '\n - ' }));
            }
        }
        catch (e) {
            ok = false;
            console.error(`[template-validate] ${filePath}:${lineNo} parse error: ${e.message}`);
        }
    }
    return ok;
}
async function main() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    // Validate template JSON
    if (!existsSync(tmplPath)) {
        console.error('[template-validate] agent_template/agent_template.json not found');
        process.exit(1);
    }
    if (!existsSync(tmplSchemaPath)) {
        console.error('[template-validate] agent_template/schema/agent_template.schema.json not found');
        process.exit(1);
    }
    const schema = loadJSON(tmplSchemaPath);
    const validate = ajv.compile(schema);
    const tmpl = loadJSON(tmplPath);
    const valid = validate(tmpl);
    let ok = true;
    if (!valid) {
        ok = false;
        console.error('[template-validate] template invalid:');
        console.error(ajv.errorsText(validate.errors, { separator: '\n - ' }));
    }
    else {
        console.log('[template-validate] agent_template.json OK');
    }
    // Validate log example files against their schemas
    if (!existsSync(coreLogSchemaPath) || !existsSync(devexLogSchemaPath)) {
        ok = false;
        if (!existsSync(coreLogSchemaPath))
            console.error('[template-validate] missing core log schema');
        if (!existsSync(devexLogSchemaPath))
            console.error('[template-validate] missing devex log schema');
    }
    else {
        const coreOk = await validateJSONL(coreLogExample, coreLogSchemaPath, ajv);
        const devOk = await validateJSONL(devexLogExample, devexLogSchemaPath, ajv);
        ok = ok && coreOk && devOk;
    }
    if (!ok)
        process.exit(1);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=validate-template.js.map