import { createCacheKey } from './workCache';

const CACHE_KEYS = {
  PRAGMA_SPAN: createCacheKey('pragmaSpan'),
  NO_DIRECTIVE_DIAGNOSTIC: createCacheKey('noDirective')
} as const;

export { CACHE_KEYS };
