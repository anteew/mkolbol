import { readFileSync, existsSync, createReadStream } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as readline from 'readline';
const root = process.cwd();
const schemaDir = resolve(root, 'agent_template', 'schema');
const logsDir = resolve(root, 'agent_template', 'log_templates');
function loadJSON(p) {
    return JSON.parse(readFileSync(p, 'utf8'));
}
async function validateJSONL(filePath, schemaPath, ajv) {
    if (!existsSync(filePath))
        return { ok: true, count: 0 };
    const schema = loadJSON(schemaPath);
    const validate = ajv.compile(schema);
    const rl = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let lineNo = 0;
    let ok = true;
    for await (const line of rl) {
        if (!line.trim())
            continue;
        lineNo++;
        try {
            const obj = JSON.parse(line);
            const valid = validate(obj);
            if (!valid) {
                ok = false;
                console.error(`[log-validate] ${filePath}:${lineNo} invalid:`);
                console.error(ajv.errorsText(validate.errors, { separator: '\n - ' }));
            }
        }
        catch (e) {
            ok = false;
            console.error(`[log-validate] ${filePath}:${lineNo} parse error: ${e.message}`);
        }
    }
    return { ok, count: lineNo };
}
async function main() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const sprintSchemaPath = resolve(schemaDir, 'sprint_file.schema.json');
    const templateSchemaPath = resolve(schemaDir, 'agent_template.schema.json');
    const coreLogSchema = resolve(logsDir, 'core_sprint_log.schema.json');
    const devexLogSchema = resolve(logsDir, 'devex_sprint_log.schema.json');
    // Validate sprint files if present
    const targets = [
        { name: 'ampcode.json', path: resolve(root, 'ampcode.json') },
        { name: 'devex.json', path: resolve(root, 'devex.json') }
    ];
    let overallOk = true;
    for (const t of targets) {
        if (!existsSync(t.path))
            continue;
        const data = loadJSON(t.path);
        const sprintSchema = loadJSON(sprintSchemaPath);
        const validate = ajv.compile(sprintSchema);
        const valid = validate(data);
        if (!valid) {
            overallOk = false;
            console.error(`[sprint-validate] ${t.name} invalid:`);
            console.error(ajv.errorsText(validate.errors, { separator: '\n - ' }));
        }
        else {
            console.log(`[sprint-validate] ${t.name} OK`);
        }
    }
    // Validate logs (JSONL)
    const coreLog = resolve(root, 'ampcode.log');
    const devexLog = resolve(root, 'devex.log');
    const coreRes = await validateJSONL(coreLog, coreLogSchema, ajv);
    const devexRes = await validateJSONL(devexLog, devexLogSchema, ajv);
    if (!coreRes.ok || !devexRes.ok)
        overallOk = false;
    if (!overallOk)
        process.exit(1);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=validate-sprints.js.map