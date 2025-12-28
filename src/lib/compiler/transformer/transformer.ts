import { getConflictingDirectiveAndPragmaError } from '../../analysis/diagnostics/getConflictingDirectiveAndPragmaError';
import { getNoUseRawDiagnostic } from '../../analysis/diagnostics/getNoUseRawDiagnostics';
import { getDisableRawPragmaSpanFromFile } from '../../analysis/disableRawPragma';
import { getUseRawDirectiveFromFile } from '../../analysis/useRawDirective';
import { transformTypeDescriptorOfMacro } from './macros/typeDescriptorOf';
import { RAW_TS_MACRO_NAMES } from '../../constants';
import type TS from 'typescript';

function transformMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression,
  macroNode: string
): TS.Node {
  switch (macroNode) {
    case RAW_TS_MACRO_NAMES.TYPE_DESCRIPTOR_OF:
      return transformTypeDescriptorOfMacro(sourceFile, ts, typeChecker, ctx, node);
  }

  return node;
}

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
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression))
      return ts.visitEachChild(node, visit, ctx);

    return transformMacro(sourceFile, ts, typeChecker, ctx, node, node.expression.text);
  };

  return ts.visitNode(sourceFile, visit) as TS.SourceFile;
}

const createRawTsTransformer =
  (ts: typeof TS, typeChecker: TS.TypeChecker) =>
  (ctx: TS.TransformationContext) =>
  (sourceFile: TS.SourceFile) =>
    transformRawTsFile(sourceFile, ts, typeChecker, ctx);

export { createRawTsTransformer };
