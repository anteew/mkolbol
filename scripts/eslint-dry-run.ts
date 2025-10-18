import { ESLint } from 'eslint';

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log('[eslint-dry-run] no staged JS/TS files');
    return;
  }

  const files = argv.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
  if (files.length === 0) {
    console.log('[eslint-dry-run] no relevant files');
    return;
  }

  const eslint = new ESLint({ fix: true, cache: false });
  const results = await eslint.lintFiles(files);

  let anyFixable = false;
  let anyErrors = false;
  let anyWarnings = false;

  for (const r of results) {
    const fixable =
      (r as any).fixableErrorCount + (r as any).fixableWarningCount > 0 || !!(r as any).output;
    const hasErr = r.errorCount > 0;
    const hasWarn = r.warningCount > 0;
    anyFixable = anyFixable || fixable;
    anyErrors = anyErrors || hasErr;
    anyWarnings = anyWarnings || hasWarn;
    if (fixable || hasErr || hasWarn) {
      const fx = (r as any).fixableErrorCount + (r as any).fixableWarningCount;
      console.log(
        `[eslint-dry-run] ${r.filePath}: errors=${r.errorCount} warnings=${r.warningCount} fixable=${fx}${(r as any).output ? ' (would write)' : ''}`,
      );
    }
  }

  if (anyFixable || anyErrors) {
    console.error('\n[eslint-dry-run] FAIL (early exit)');
    console.error(' - Fixable or error findings detected on staged files.');
    console.error(' - Run: npx eslint <staged-files> --fix');
    console.error(' - Or override once with: SKIP_ESLINT_DRYRUN=1 git commit -m "..."');
    process.exit(2);
  }

  if (anyWarnings) {
    console.log('[eslint-dry-run] WARN: warnings present (not blocking)');
  } else {
    console.log('[eslint-dry-run] OK');
  }
}

main().catch((e) => {
  console.error('[eslint-dry-run] error:', e);
  process.exit(1);
});
