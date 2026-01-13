import type TS from 'typescript';

const IS_CACHE_KEY = Symbol('IS_CACHE_KEY');

type CacheKey = string & { [IS_CACHE_KEY]: true };

type WorkCache = {
  get: <T>(key: CacheKey, fileName: string, compute: () => T) => T;
  clear: () => void;
};

const createCacheKey = (name: string) => name as CacheKey;

function createWorkCache({
  host,
  cleanupIntervalMs
}: {
  host: TS.LanguageServiceHost;
  cleanupIntervalMs: number;
}): WorkCache {
  const cache = new Map<string, [string, any]>();
  let lastCleanupTime = Date.now();

  return {
    get: (key, fileName, compute) => {
      const currentTime = Date.now();
      if (currentTime - lastCleanupTime >= cleanupIntervalMs) {
        cache.clear(); // NUKE 💣 the cache to reduce the chance of memory leaks (dumb, but works and is super simple)
        lastCleanupTime = currentTime;
      }

      const scriptVersion = host.getScriptVersion(fileName);

      const cacheEntry = cache.get(`${key}:${fileName}`);
      if (cacheEntry == null) {
        const value = compute();
        cache.set(`${key}:${fileName}`, [scriptVersion, value]);
        return value;
      }

      if (cacheEntry[0] !== scriptVersion) {
        cacheEntry[0] = scriptVersion;
        cacheEntry[1] = compute();
      }

      return cacheEntry[1];
    },
    clear: () => cache.clear()
  };
}

export { createCacheKey, CacheKey, createWorkCache, WorkCache };
