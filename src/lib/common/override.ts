type Override<T, K extends keyof T> = {
  key: K;
  getOverride: (originalObject: T, objectWithOverrides: T) => T[K];
};

function createObjectWithOverrides<T extends object>(
  originalObject: T,
  overrides: Override<T, keyof T>[]
): T {
  const objectWithOverrides: any = {};

  for (const [key, value] of Object.entries(originalObject))
    objectWithOverrides[key] = typeof value === 'function' ? value.bind(originalObject) : value;

  for (const { key, getOverride } of overrides)
    objectWithOverrides[key] = getOverride(originalObject, objectWithOverrides);

  return objectWithOverrides;
}

export { createObjectWithOverrides, Override };
