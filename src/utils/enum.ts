const createEnum = <T extends string>(...keys: T[]): { [K in T]: K } =>
  Object.fromEntries(keys.map(k => [k, k])) as any;

export { createEnum };
