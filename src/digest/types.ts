export interface DigestEvent {
  ts: number;
  lvl: 'debug' | 'info' | 'warn' | 'error';
  case: string;
  phase?: string;
  evt: string;
  id?: string;
  corr?: string;
  path?: string;
  payload?: unknown;
}

export interface DigestAction {
  type: 'include' | 'exclude' | 'slice' | 'codeframe';
  window?: number;
}

export interface DigestRuleMatch {
  lvl?: 'debug' | 'info' | 'warn' | 'error';
  evt?: string | string[];
  pattern?: string | RegExp;
}

export interface DigestRule {
  match: DigestRuleMatch;
  actions: DigestAction[];
  priority?: number;
}

export interface RedactionConfig {
  enabled?: boolean;
  secrets?: boolean;
  optOut?: boolean;
}

export interface BudgetConfig {
  kb?: number;
  lines?: number;
}

export interface DigestConfig {
  enabled: boolean;
  input?: string;
  output?: string;
  rules?: DigestRule[];
  format?: 'json' | 'markdown' | 'text';
  includeMetadata?: boolean;
  redaction?: RedactionConfig;
  budget?: BudgetConfig;
}

export interface DigestOutput {
  metadata: {
    generated: number;
    source: string;
    eventCount: number;
    filteredCount: number;
  };
  events: DigestEvent[];
  summary: {
    totalEvents: number;
    byLevel: Record<DigestEvent['lvl'], number>;
    byEventType: Record<string, number>;
    redactedFields: number;
    includedEvents: number;
  };
}
