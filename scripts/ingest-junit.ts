import * as fs from 'node:fs';
import * as path from 'node:path';

export interface JUnitTestCase {
  name: string;
  classname: string;
  time: number;
  failure?: {
    message: string;
    type: string;
    content: string;
  };
  error?: {
    message: string;
    type: string;
    content: string;
  };
  skipped?: {
    message?: string;
  };
}

export interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number;
  testcases: JUnitTestCase[];
}

export interface LaminarTestEvent {
  ts: number;
  lvl: string;
  case?: string;
  phase?: string;
  evt: string;
  payload?: any;
}

/**
 * Parse JUnit XML format to structured test data.
 * Uses basic regex parsing to avoid external XML dependencies.
 */
export function parseJUnitXML(xmlContent: string): JUnitTestSuite[] {
  const suites: JUnitTestSuite[] = [];
  
  // Extract all <testsuite> elements (including nested)
  const testsuiteRegex = /<testsuite\s([^>]*)>([\s\S]*?)<\/testsuite>/g;
  let suiteMatch;
  
  while ((suiteMatch = testsuiteRegex.exec(xmlContent)) !== null) {
    const suiteAttrs = suiteMatch[1];
    const suiteContent = suiteMatch[2];
    
    const suite: JUnitTestSuite = {
      name: extractAttr(suiteAttrs, 'name') || 'unknown',
      tests: parseInt(extractAttr(suiteAttrs, 'tests') || '0', 10),
      failures: parseInt(extractAttr(suiteAttrs, 'failures') || '0', 10),
      errors: parseInt(extractAttr(suiteAttrs, 'errors') || '0', 10),
      skipped: parseInt(extractAttr(suiteAttrs, 'skipped') || '0', 10),
      time: parseFloat(extractAttr(suiteAttrs, 'time') || '0'),
      testcases: []
    };
    
    // Extract all <testcase> elements within this suite
    const testcaseRegex = /<testcase([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let caseMatch;
    
    while ((caseMatch = testcaseRegex.exec(suiteContent)) !== null) {
      const caseAttrs = caseMatch[1];
      const caseContent = caseMatch[2] || '';
      
      const testcase: JUnitTestCase = {
        name: extractAttr(caseAttrs, 'name') || 'unknown',
        classname: extractAttr(caseAttrs, 'classname') || suite.name,
        time: parseFloat(extractAttr(caseAttrs, 'time') || '0')
      };
      
      // Check for failure
      const failureMatch = /<failure([^>]*?)>([\s\S]*?)<\/failure>/.exec(caseContent);
      if (failureMatch) {
        testcase.failure = {
          message: extractAttr(failureMatch[1], 'message') || 'Test failed',
          type: extractAttr(failureMatch[1], 'type') || 'AssertionError',
          content: decodeXmlEntities(failureMatch[2].trim())
        };
      }
      
      // Check for error
      const errorMatch = /<error([^>]*?)>([\s\S]*?)<\/error>/.exec(caseContent);
      if (errorMatch) {
        testcase.error = {
          message: extractAttr(errorMatch[1], 'message') || 'Test error',
          type: extractAttr(errorMatch[1], 'type') || 'Error',
          content: decodeXmlEntities(errorMatch[2].trim())
        };
      }
      
      // Check for skipped
      const skippedMatch = /<skipped([^>]*?)(\/>|>([\s\S]*?)<\/skipped>)/.exec(caseContent);
      if (skippedMatch) {
        testcase.skipped = {
          message: extractAttr(skippedMatch[1], 'message')
        };
      }
      
      suite.testcases.push(testcase);
    }
    
    suites.push(suite);
  }
  
  return suites;
}

/**
 * Extract attribute value from XML attributes string
 */
function extractAttr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}=["']([^"']*)["']`).exec(attrs);
  return match ? match[1] : undefined;
}

/**
 * Decode basic XML entities
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Convert JUnit test suites to Laminar format
 */
export function convertToLaminar(suites: JUnitTestSuite[]): {
  events: LaminarTestEvent[];
  summary: Array<{ status: string; duration: number; location: string; artifactURI: string; testName: string; errorMessage?: string }>;
} {
  const laminarEvents: LaminarTestEvent[] = [];
  const summary: Array<{ status: string; duration: number; location: string; artifactURI: string; testName: string; errorMessage?: string }> = [];
  
  const baseTimestamp = Date.now();
  let currentOffset = 0;
  
  for (const suite of suites) {
    for (const testcase of suite.testcases) {
      const caseId = `${suite.name}/${testcase.name}`;
      const startTs = baseTimestamp + currentOffset;
      const duration = Math.round(testcase.time * 1000); // Convert seconds to milliseconds
      const endTs = startTs + duration;
      
      // Test begin event
      laminarEvents.push({
        ts: startTs,
        lvl: 'info',
        case: caseId,
        phase: 'setup',
        evt: 'case.begin',
        payload: {
          suite: suite.name,
          classname: testcase.classname,
          testName: testcase.name
        }
      });
      
      // Test run event
      laminarEvents.push({
        ts: startTs + 1,
        lvl: 'info',
        case: caseId,
        phase: 'execution',
        evt: 'test.run'
      });
      
      // Determine status and add appropriate events
      let status = 'pass';
      let errorMessage: string | undefined;
      
      if (testcase.failure) {
        status = 'fail';
        errorMessage = testcase.failure.message;
        laminarEvents.push({
          ts: endTs - 2,
          lvl: 'error',
          case: caseId,
          phase: 'execution',
          evt: 'test.error',
          payload: {
            message: testcase.failure.message,
            type: testcase.failure.type,
            stack: testcase.failure.content
          }
        });
      } else if (testcase.error) {
        status = 'fail';
        errorMessage = testcase.error.message;
        laminarEvents.push({
          ts: endTs - 2,
          lvl: 'error',
          case: caseId,
          phase: 'execution',
          evt: 'test.error',
          payload: {
            message: testcase.error.message,
            type: testcase.error.type,
            stack: testcase.error.content
          }
        });
      } else if (testcase.skipped) {
        status = 'skip';
        errorMessage = testcase.skipped.message;
        laminarEvents.push({
          ts: endTs - 2,
          lvl: 'info',
          case: caseId,
          phase: 'execution',
          evt: 'test.skip',
          payload: {
            message: testcase.skipped.message || 'Test skipped'
          }
        });
      }
      
      // Test end event
      laminarEvents.push({
        ts: endTs,
        lvl: status === 'fail' ? 'error' : 'info',
        case: caseId,
        phase: 'teardown',
        evt: 'case.end',
        payload: {
          duration,
          status: status === 'pass' ? 'passed' : status === 'skip' ? 'skipped' : 'failed'
        }
      });
      
      // Add to summary
      const location = testcase.classname;
      const artifactURI = `reports/${suite.name}/${sanitizeFileName(testcase.name)}.jsonl`;
      
      summary.push({
        status,
        duration,
        location,
        artifactURI,
        testName: caseId,
        ...(errorMessage && { errorMessage })
      });
      
      currentOffset = endTs - baseTimestamp + 10; // Add small gap between tests
    }
  }
  
  return { events: laminarEvents, summary };
}

/**
 * Sanitize test name for use as filename
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Write Laminar output to reports directory
 */
export function writeOutput(
  laminarEvents: LaminarTestEvent[],
  summary: Array<{ status: string; duration: number; location: string; artifactURI: string; testName: string; errorMessage?: string }>
): void {
  fs.mkdirSync('reports', { recursive: true });
  
  // Group events by test case
  const caseGroups = new Map<string, LaminarTestEvent[]>();
  for (const evt of laminarEvents) {
    if (evt.case) {
      if (!caseGroups.has(evt.case)) {
        caseGroups.set(evt.case, []);
      }
      caseGroups.get(evt.case)!.push(evt);
    }
  }
  
  // Write per-case JSONL files
  for (const [caseId, events] of caseGroups) {
    const parts = caseId.split('/');
    const suiteName = parts[0];
    const testName = parts.slice(1).join('/');
    
    const suiteDir = path.join('reports', suiteName);
    fs.mkdirSync(suiteDir, { recursive: true });
    
    const caseFile = path.join(suiteDir, `${sanitizeFileName(testName)}.jsonl`);
    fs.writeFileSync(caseFile, events.map(e => JSON.stringify(e)).join('\n') + '\n');
  }
  
  // Write summary.jsonl
  const summaryPath = 'reports/summary.jsonl';
  fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');
}

/**
 * Main ingest function for JUnit XML
 */
export function ingestJUnit(xmlContent: string): void {
  const suites = parseJUnitXML(xmlContent);
  const { events, summary } = convertToLaminar(suites);
  writeOutput(events, summary);
  
  const totalTests = suites.reduce((sum, s) => sum + s.tests, 0);
  const totalFailures = suites.reduce((sum, s) => sum + s.failures, 0);
  const totalErrors = suites.reduce((sum, s) => sum + s.errors, 0);
  const totalSkipped = suites.reduce((sum, s) => sum + s.skipped, 0);
  
  console.log(`Ingested ${suites.length} test suite(s)`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${totalTests - totalFailures - totalErrors - totalSkipped}`);
  console.log(`Failed: ${totalFailures + totalErrors}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Generated ${summary.length} test case artifacts`);
  console.log(`Wrote artifacts to reports/`);
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tsx scripts/ingest-junit.ts <junit-xml-file>');
    console.error('   or: cat junit.xml | tsx scripts/ingest-junit.ts -');
    process.exit(1);
  }
  
  const inputSource = args[0];
  let xmlContent: string;
  
  if (inputSource === '-') {
    // Read from stdin
    const chunks: Buffer[] = [];
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      xmlContent = Buffer.concat(chunks).toString('utf-8');
      ingestJUnit(xmlContent);
    });
  } else {
    // Read from file
    if (!fs.existsSync(inputSource)) {
      console.error(`Error: File not found: ${inputSource}`);
      process.exit(1);
    }
    
    xmlContent = fs.readFileSync(inputSource, 'utf-8');
    ingestJUnit(xmlContent);
  }
}
