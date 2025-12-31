import type TS from 'typescript';

const getTypeArgumentCountDiagnostic = (
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  node: TS.CallExpression,
  errorCode: number,
  typeArgumentCount: number
): TS.Diagnostic | null =>
  node.typeArguments == null || node.typeArguments.length !== typeArgumentCount
    ? {
        category: ts.DiagnosticCategory.Error,
        code: errorCode,
        file: sourceFile,
        start: node.expression.getStart(),
        length: node.expression.getWidth(),
        messageText: `"${node.expression.getText()}" must be called with exactly ${typeArgumentCount} type argument(s)!`
      }
    : null;

export { getTypeArgumentCountDiagnostic };
