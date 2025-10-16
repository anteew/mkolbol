# Contributing Guide for Early Adopters

Welcome to mkolbol! This guide is specifically for **early adopters** who want to share feedback, report bugs, or contribute improvements. We've designed this process to be as frictionless as possible while ensuring we receive high-quality, actionable feedback.

---

## Table of Contents

1. [For Early Adopters](#for-early-adopters)
2. [Sharing Minimal Repros](#sharing-minimal-repros)
3. [Which Logs to Attach](#which-logs-to-attach)
4. [Best Practices](#best-practices)
5. [Getting Help](#getting-help)
6. [Code Review Process](#code-review-process)
7. [Issue Template Checklist](#issue-template-checklist)

---

## For Early Adopters

Thank you for being an early adopter! Your feedback is invaluable in shaping mkolbol's development. Here's how you can participate effectively:

### What We're Looking For

- **Bug reports** - Issues you encountered during installation, testing, or development
- **Feature requests** - Missing features or improvements that would make mkolbol more useful
- **Documentation gaps** - Unclear or missing documentation
- **Integration challenges** - Difficulties integrating with your existing toolchain
- **Performance issues** - Slow tests, high memory usage, or other performance concerns

### How to Get Started

1. **Read the [Early Adopter Guide](docs/devex/early-adopter-guide.md)** - Understand mkolbol's architecture in 5 minutes
2. **Follow the [Quickstart](README.md#quickstart)** - Install and run your first tests
3. **Try the demos** - Run example topologies to see mkolbol in action
4. **Report your experience** - File issues using our templates (see below)

### What Makes Good Feedback

**Good feedback is:**
- **Specific** - "The lam summary command fails with Error X" vs. "Laminar doesn't work"
- **Reproducible** - Include steps or a repo link so we can reproduce the issue
- **Contextual** - Include environment details (OS, Node version, etc.)
- **Constructive** - Suggest improvements when possible

**Examples:**

✅ **Good**: "Running `npx lam run --lane auto` on Ubuntu 22.04 with Node 20.11.0 fails with ENOENT error. Here's the full stack trace: [paste]. Reproducible repo: [link]"

❌ **Bad**: "Laminar doesn't work on my machine"

---

## Sharing Minimal Repros

A **minimal reproducible example** (repro) is the fastest way to get your issue resolved. Here's how to create one:

### When to Create a GitHub Repo

Create a separate GitHub repository if:
- The issue requires multiple files or a specific directory structure
- You're using custom configuration files (vitest.config.ts, laminar.config.json, etc.)
- The issue involves build/compilation steps
- You want to demonstrate an integration with other tools

**Template for minimal repo:**

```
your-mkolbol-repro/
├── package.json          # Minimal dependencies
├── vitest.config.ts      # Only if needed
├── laminar.config.json   # Only if needed
├── tests/
│   └── repro.spec.ts     # Single test that reproduces the issue
└── README.md             # Steps to reproduce
```

**Steps to create:**

1. **Initialize a new repo:**
   ```bash
   mkdir mkolbol-issue-123
   cd mkolbol-issue-123
   git init
   npm init -y
   ```

2. **Install minimal dependencies:**
   ```bash
   npm install mkolbol vitest
   ```

3. **Add a single test file** that reproduces the issue:
   ```typescript
   // tests/repro.spec.ts
   import { describe, it, expect } from 'vitest';
   import { Kernel } from 'mkolbol';

   describe('Repro for issue #123', () => {
     it('demonstrates the bug', async () => {
       const kernel = new Kernel();
       // Minimal code that triggers the bug
     });
   });
   ```

4. **Add a README** with repro steps:
   ```markdown
   # Repro for mkolbol issue #123

   ## Setup
   npm install

   ## Reproduce
   npm test

   ## Expected
   Test should pass

   ## Actual
   Test fails with error: [paste error]
   ```

5. **Push to GitHub** and link in your issue

### When to Use an Inline Example

Use an inline code snippet if:
- The issue can be reproduced with <20 lines of code
- No custom configuration is needed
- The issue is a simple API misuse or unexpected behavior

**Example:**

```typescript
import { Kernel } from 'mkolbol';

const kernel = new Kernel();
const pipe = kernel.createPipe();

// This throws an unexpected error
pipe.write('test');  // TypeError: Cannot read property 'write' of undefined
```

### What to Include

Your minimal repro should include:

#### Code
- **Only the code necessary to reproduce the issue** - Remove unrelated logic
- **Use default configurations** - Avoid custom configs unless they're part of the issue
- **Isolate the problem** - One test case that fails, not an entire test suite

#### Configuration
Include configuration files only if they're relevant:
- `package.json` - Only dependencies needed for the repro
- `vitest.config.ts` - Only if custom config triggers the issue
- `laminar.config.json` - Only if digest rules or config affect the issue

#### Commands
Document the exact commands to reproduce:
```bash
# Install
npm install

# Build (if needed)
npm run build

# Reproduce the issue
npm test
# OR
npx lam run --lane auto
```

### How to Make It Minimal

**Start with your real code, then:**

1. **Remove unrelated tests** - Keep only the failing test
2. **Remove unrelated modules** - Delete code that doesn't affect the issue
3. **Simplify test logic** - Remove setup that doesn't contribute to the failure
4. **Use hardcoded values** - Replace dynamic data with static test data
5. **Remove external dependencies** - Avoid databases, APIs, or third-party services

**Before (not minimal):**
```typescript
describe('Complex integration test suite', () => {
  let db, cache, api, kernel, executor, stateManager;

  beforeEach(async () => {
    db = await setupDatabase();
    cache = await setupRedis();
    api = await startMockServer();
    kernel = new Kernel();
    executor = new Executor(kernel);
    stateManager = new StateManager(kernel);
    // ... 50 more lines of setup
  });

  it('fails when loading topology from database', async () => {
    const topology = await db.getTopology(123);
    await executor.load(topology);
    // ... test logic
  });
});
```

**After (minimal):**
```typescript
import { Executor, Kernel } from 'mkolbol';

it('fails when loading invalid topology', async () => {
  const kernel = new Kernel();
  const executor = new Executor(kernel);

  const topology = { nodes: [], connections: [{ from: 'invalid', to: 'invalid' }] };
  await executor.load(topology);  // Throws error
});
```

---

## Which Logs to Attach

mkolbol integrates with **Laminar** for structured test observability. When reporting issues, attaching the right logs dramatically speeds up diagnosis.

### Reports Directory Overview

After running tests with Laminar, you'll see:

```
reports/
├── summary.jsonl                 # All test results (one line per test)
├── index.json                    # Manifest of artifacts
├── <suite>/
│   ├── <case>.jsonl             # Per-test event stream (JSONL)
│   └── <case>.digest.json       # Failure analysis (if digest was run)
└── stability-report.json         # Flake detection results (if enabled)
```

### What to Attach for Bug Reports

#### 1. Summary Output (`reports/summary.jsonl`)

**When to attach**: Always

**What it contains**:
- Pass/fail status for all tests
- Durations
- Error messages (if failed)
- Artifact URIs (paths to detailed logs)

**How to generate**:
```bash
npx lam summary > summary.txt
```

Paste the output in your issue or attach `reports/summary.jsonl`.

#### 2. Per-Case Logs (`reports/<suite>/<case>.jsonl`)

**When to attach**: For failing tests

**What it contains**:
- Full event stream for the test case
- Setup, run, and teardown phases
- stdout/stderr output
- Assertion failures
- Error stack traces

**How to find**:
```bash
# List all case logs
ls reports/*/*.jsonl

# View a specific case
cat reports/kernel.spec/connect_moves_data_1_1.jsonl
```

**What to include in issue**:
- Attach the `.jsonl` file as a file attachment, OR
- Paste relevant excerpts (first 50 lines, or events around the failure)

#### 3. Terminal Output (Full stderr/stdout)

**When to attach**: Always

**What it contains**:
- Raw console output from your command
- Error messages in their original format
- Stack traces
- Warnings and debug output

**How to capture**:
```bash
# Redirect both stdout and stderr to a file
npm test > test-output.log 2>&1

# Or for Laminar
npx lam run --lane auto > lam-output.log 2>&1
```

**What to include in issue**:
Paste the full output in a `<details>` block:

```markdown
<details>
<summary>Full Terminal Output</summary>

```
[paste output here]
```

</details>
```

#### 4. Laminar Digest (`reports/<suite>/<case>.digest.json`)

**When to attach**: If you ran `npx lam digest`

**What it contains**:
- Filtered/sliced view of the failing test
- Events around assertion failures
- Structured failure summary

**How to generate**:
```bash
npx lam digest
```

**What to include in issue**:
Attach the `.digest.json` file(s) for failing tests.

#### 5. System Info

**When to attach**: Always

**What to include**:
```bash
# Node.js version
node --version

# npm version
npm --version

# OS version
uname -a     # Linux/macOS
ver          # Windows

# mkolbol version
npm list mkolbol
```

Paste this information in the "Environment" section of the bug report.

### Example: Complete Log Attachment

**Scenario**: Test `kernel.spec/connect_moves_data_1_1` failed

**What to attach**:

1. **Summary**:
   ```bash
   npx lam summary > reports/SUMMARY.txt
   ```
   Attach `reports/SUMMARY.txt`

2. **Case log**:
   Attach `reports/kernel.spec/connect_moves_data_1_1.jsonl`

3. **Terminal output**:
   ```bash
   npx lam run --lane auto > lam-run.log 2>&1
   ```
   Paste `lam-run.log` in a `<details>` block

4. **System info**:
   ```
   Node: v20.11.0
   npm: 10.2.4
   OS: Ubuntu 22.04 LTS
   mkolbol: 0.2.0
   ```

### How to Attach Files to GitHub Issues

1. **Drag and drop** - Drag `.jsonl`, `.json`, `.log`, or `.txt` files directly into the issue comment box
2. **Click "Attach files"** - GitHub's interface at the bottom of the comment box
3. **Paste text** - For smaller logs, paste directly in code blocks
4. **Use gists** - For very large logs, create a GitHub Gist and link it

**Tips**:
- Compress large files: `tar czf reports.tar.gz reports/`
- Use `.txt` extension for better GitHub preview: `mv output.log output.txt`

---

## Best Practices

Follow these best practices to ensure your feedback is actionable:

### 1. Use Code Blocks, Not Screenshots

**❌ Don't do this:**
![screenshot of error message]

**✅ Do this:**
```
Error: Cannot find module 'mkolbol'
  at Function.Module._resolveFilename (internal/modules/cjs/loader.js:889:15)
  at Function.Module._load (internal/modules/cjs/loader.js:745:27)
  ...
```

**Why**: Code blocks are searchable, copy-pasteable, and accessible. Screenshots are not.

**Exception**: UI/rendering bugs where a visual is necessary. In that case, include both a screenshot AND the relevant code/logs.

### 2. Include Full Error Messages

**❌ Partial error:**
```
Error: Invalid config
```

**✅ Full stack trace:**
```
Error: Invalid config: 'nodes' is required
  at Executor.load (/srv/repos0/mkolbol/dist/src/executor/Executor.js:42:15)
  at async Object.<anonymous> (/srv/repos0/mkolbol/examples/config-runner.js:12:3)
  at async Promise.all (index 0)
  at async run (/srv/repos0/mkolbol/node_modules/vitest/dist/chunks/index.js:234:9)
```

**Why**: Stack traces reveal the exact location of the failure and the call chain leading to it.

### 3. Tag Issues Appropriately

When creating an issue, use labels to categorize it:

**Bug reports:**
- `devex` - DevEx-related issue
- `bug` - Confirmed bug
- `needs-repro` - Waiting for reproducible example

**Feature requests:**
- `devex` - DevEx-related request
- `feature-request` - New feature
- `enhancement` - Improvement to existing feature

**Documentation:**
- `docs` - Documentation issue/request
- `examples` - Example code request

**Good practice**: Start with `devex` + one other label. Maintainers will add more as needed.

### 4. Link Related Issues

If your issue is related to another issue or PR, link it:

```markdown
Related to #42
Depends on #37
Fixes #18
```

**Why**: Helps maintainers understand context and dependencies.

### 5. Provide Context

Don't just say "it doesn't work" - explain:
- What you were trying to accomplish
- What you expected to happen
- What actually happened
- What you've already tried

**Example:**

> I'm trying to run PTY-based tests on Ubuntu 22.04 using `npm run test:pty`. I expected all tests to pass (they pass locally on macOS), but in CI they fail with "Operation not permitted" errors. I've tried running with `--pool=forks` and without, same result. Attached are the full CI logs and the failing test case logs.

---

## Getting Help

If you're stuck or need help before filing an issue, here are your options:

### GitHub Discussions

**Best for**: Questions, brainstorming, general feedback

**How to access**: [GitHub Discussions](https://github.com/anteew/mkolbol/discussions)

**Topics**:
- **Q&A** - Ask questions about usage, APIs, or best practices
- **Show and Tell** - Share what you've built with mkolbol
- **Ideas** - Propose features or improvements (before creating a formal issue)

### FAQ and Documentation

**Check these resources first:**
- [Early Adopter Guide](docs/devex/early-adopter-guide.md) - 5-minute intro
- [Quickstart](README.md#quickstart) - Installation and first steps
- [Laminar Workflow Guide](docs/devex/laminar-workflow.md) - Test observability
- [Stream Kernel RFC](docs/rfcs/stream-kernel/00-index.md) - Architecture deep dive
- [Testing CI Guide](docs/testing/ci.md) - CI integration

**Common questions:**
- **Installation issues** → [README Installation](README.md#installation)
- **Test failures** → [Laminar Workflow](docs/devex/laminar-workflow.md)
- **PTY/process mode** → [Process Mode CI](docs/testing/process-mode-ci.md)
- **Topology configuration** → [Config Examples](examples/configs/)

### Discord/Slack (if applicable)

**Status**: Not currently available (check README for updates)

If a community chat is added in the future, it will be linked in the README.

### Direct Issue Filing

If you've:
- Checked existing issues and docs
- Have a reproducible bug or clear feature request
- Can provide the necessary logs/context

Then go ahead and **[create an issue](https://github.com/anteew/mkolbol/issues/new/choose)** using one of our templates!

---

## Code Review Process

If you're contributing code (PRs), here's what to expect:

### Review Timeline

- **Initial response**: 1-3 business days
- **First review**: 3-7 days for small PRs, 1-2 weeks for large changes
- **Follow-up reviews**: 1-3 days after you address feedback

**Note**: These are estimates. Complex changes or RFCs may take longer.

### What Reviewers Look For

1. **Correctness** - Does the code work as intended? Are there edge cases?
2. **Tests** - Are there tests for new functionality or bug fixes?
3. **Documentation** - Are public APIs documented? Is there an example?
4. **Code style** - Does it follow existing conventions?
5. **Breaking changes** - Are they justified? Is there a migration path?

### How Contributions Are Reviewed

1. **Automated checks** - CI runs tests (threads + forks lanes), linting, and type checking
2. **Code review** - Maintainers review for correctness, style, and design
3. **Discussion** - Feedback may include questions, suggestions, or requested changes
4. **Approval** - Once approved, the PR is merged

### Tips for Faster Reviews

- **Keep PRs small** - <300 lines of code change when possible
- **Write clear commit messages** - Explain *why*, not just *what*
- **Add tests** - Reviewers prioritize tested code
- **Link to issues** - Reference the issue your PR addresses
- **Respond to feedback** - Engage constructively with reviewer comments

### Example PR Description

```markdown
## Summary
Fixes #123 - Add support for custom ANSI escape sequences in AnsiParser

## Changes
- Extended AnsiParserModule to handle custom CSI sequences
- Added configurable parser hooks for unknown sequences
- Updated tests to cover new functionality

## Test Plan
- [x] Added unit tests for custom sequence handling
- [x] Verified existing tests still pass
- [x] Tested with real PTY output (attached example in issue #123)

## Breaking Changes
None

## Documentation
- Updated AnsiParserModule JSDoc
- Added example in examples/ansi-parser-custom.ts
```

### How to Follow Up

If your PR hasn't received feedback in the expected timeframe:
1. **Add a polite comment** - "Friendly ping - any feedback on this PR?"
2. **Check CI status** - Ensure all checks are passing
3. **Be patient** - Maintainers may be busy; they'll get to it

---

## Issue Template Checklist

We provide two issue templates to streamline feedback:

### When to Use `devex_bug.md`

Use this template when:
- You encountered an error or unexpected behavior
- Tests are failing
- Installation or setup failed
- Commands produce incorrect output
- Performance is degraded

**Required fields:**
- Bug description
- Steps to reproduce
- Expected vs. actual behavior
- Environment (OS, Node.js, npm versions)
- Reproducible example (repo link OR inline code)
- Failing command(s)
- Full error messages and logs

**Optional fields:**
- Laminar reports (if using Laminar)
- Additional context

### When to Use `devex_request.md`

Use this template when:
- You want a new feature
- You have an idea for improvement
- Documentation is missing or unclear
- Integration with another tool would be helpful

**Required fields:**
- Feature summary
- Motivation (why is this needed?)
- Proposed solution (if you have one)
- Alternatives considered
- Pain point addressed
- Related documentation/RFCs

**Optional fields:**
- Implementation considerations
- Related issues
- Example workflow

### Which Fields Are Optional vs Required

#### Bug Report (`devex_bug.md`)

**Required** (issue may be closed if missing):
- [x] Bug description
- [x] Steps to reproduce
- [x] Expected vs. actual behavior
- [x] Environment (OS, Node.js, npm)
- [x] Reproducible example (repo link OR inline)
- [x] Failing command(s)
- [x] Full error message

**Optional** (nice to have):
- [ ] Laminar summary output
- [ ] Laminar per-case logs
- [ ] Digest output
- [ ] Additional context

**Checklist items** (required):
- [x] Read Early Adopter Guide
- [x] Checked for duplicates
- [x] Provided minimal repro
- [x] Included full error message

#### Feature Request (`devex_request.md`)

**Required**:
- [x] Feature summary
- [x] Motivation (why needed?)
- [x] Pain point addressed

**Optional**:
- [ ] Proposed solution
- [ ] Alternatives considered
- [ ] Related docs/RFCs
- [ ] Implementation considerations
- [ ] Related issues

**Checklist items** (required):
- [x] Read Early Adopter Guide
- [x] Checked for duplicates
- [x] Described motivation clearly

---

## Final Tips for Early Adopters

### Do:
- ✅ Read the Early Adopter Guide before diving in
- ✅ Try the Quickstart examples to understand the basics
- ✅ Provide minimal, reproducible examples
- ✅ Include logs, errors, and system info
- ✅ Be specific and constructive in feedback
- ✅ Use the issue templates

### Don't:
- ❌ File duplicate issues (search first!)
- ❌ Provide vague descriptions ("doesn't work")
- ❌ Skip the reproducible example
- ❌ Use screenshots for error messages
- ❌ Expect instant responses (maintainers are humans too!)

### Remember:
Your feedback shapes mkolbol's future. Even "small" bugs or suggestions are valuable. We appreciate your time and effort in helping us improve!

---

**Ready to contribute?** [Create an issue](https://github.com/anteew/mkolbol/issues/new/choose) or start a [discussion](https://github.com/anteew/mkolbol/discussions)!
