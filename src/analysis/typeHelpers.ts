import type TS from 'typescript';

function getPropertyTypeFromType(
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  key: string
): TS.Type | null {
  const propertySymbol = type.getProperty(key);
  if (propertySymbol == null) return null;

  return typeChecker.getTypeOfSymbol(propertySymbol);
}

export { getPropertyTypeFromType };
