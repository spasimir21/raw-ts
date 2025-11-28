import { getConflictingDirectiveAndPragmaError } from '../../analysis/diagnostics/getConflictingDirectiveAndPragmaError';
import { getNoUseRawDiagnostic } from '../../analysis/diagnostics/getNoUseRawDiagnostics';
import { getDisableRawPragmaSpanFromFile } from '../../analysis/disableRawPragma';
import { getUseRawDirectiveFromFile } from '../../analysis/useRawDirective';
import type TS from 'typescript';

function transformRawTsFile(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext
): TS.SourceFile {
  const disableRawPragma = getDisableRawPragmaSpanFromFile(sourceFile);
  const useRawDirective = getUseRawDirectiveFromFile(ts, sourceFile);

  if (disableRawPragma != null) {
    if (useRawDirective != null)
      sourceFile.rawTsDiagnostics = [
        getConflictingDirectiveAndPragmaError(ts, sourceFile, useRawDirective)
      ];

    return sourceFile;
  }

  if (useRawDirective == null) {
    const noDirectiveDiagnostic = getNoUseRawDiagnostic(ts, typeChecker, sourceFile);
    if (noDirectiveDiagnostic) sourceFile.rawTsDiagnostics = [noDirectiveDiagnostic];
    return sourceFile;
  }

  sourceFile.rawTsDiagnostics = [];

  const visit = (node: TS.Node) => {
    return ts.visitEachChild(node, visit, ctx);
  };

  return ts.visitNode(sourceFile, visit) as TS.SourceFile;
}

const createRawTsTransformer =
  (ts: typeof TS, typeChecker: TS.TypeChecker) =>
  (ctx: TS.TransformationContext) =>
  (sourceFile: TS.SourceFile) =>
    transformRawTsFile(sourceFile, ts, typeChecker, ctx);

export { createRawTsTransformer };
