function generateErrorCodes<T extends string>(
  errorNamespace: number,
  errors: T[]
): { [E in T]: number } {
  // Shift the error "namespace" number by the N zeros required to fit all error codes in the least significant digits
  // ex. 1 for < 10 errors, 2 for < 100 errors, etc.
  // ex. 123 with 56 errors becomes 12300
  const shiftedErrorNamespace = errorNamespace * 10 ** Math.ceil(Math.log10(errors.length + 1));

  return Object.fromEntries(
    errors.map((error, i) => [error, shiftedErrorNamespace + i + 1])
  ) as any;
}

export { generateErrorCodes };
