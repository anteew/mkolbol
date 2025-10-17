import { createLogger } from './logger.js';

const logger = createLogger('demo', 'demo.case');

logger.beginCase('setup');
logger.emit('test.step', {
  lvl: 'info',
  phase: 'execution',
  payload: { step: 1, action: 'initialize' },
});
logger.emit('test.assertion', {
  lvl: 'info',
  phase: 'verification',
  payload: { expected: true, actual: true, passed: true },
});
logger.endCase('teardown', { duration: 42, status: 'passed' });
logger.close();

console.log('Smoke test complete. Check reports/demo/demo.case.jsonl');
