export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TestEventEnvelope<T = unknown> {
  ts: number;
  lvl: LogLevel;
  case: string;
  phase?: string;
  evt: string;
  id?: string;
  corr?: string;
  path?: string;
  payload?: T;
}

export function createEvent<T = unknown>(
  evt: string,
  caseName: string,
  options: {
    lvl?: LogLevel;
    phase?: string;
    id?: string;
    corr?: string;
    path?: string;
    payload?: T;
  } = {},
): TestEventEnvelope<T> {
  return {
    ts: Date.now(),
    lvl: options.lvl || 'info',
    case: caseName,
    phase: options.phase,
    evt,
    id: options.id,
    corr: options.corr,
    path: options.path,
    payload: options.payload,
  };
}
