import { createCacheKey } from './workCache';

const CACHE_KEYS = {
  PRAGMA_SPAN: createCacheKey('pragmaSpan'),
  NO_DIRECTIVE_DIAGNOSTIC: createCacheKey('noDirective'),
  RAW_TS_DIAGNOSTICS: createCacheKey('rawTsDiagnostics')
} as const;

export { CACHE_KEYS };
