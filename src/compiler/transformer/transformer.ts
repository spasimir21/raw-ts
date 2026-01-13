import { getConflictingDirectiveAndPragmaError } from '../../analysis/diagnostics/getConflictingDirectiveAndPragmaError';
import { getNoUseRawDiagnostic } from '../../analysis/diagnostics/getNoUseRawDiagnostics';
import { getDisableRawPragmaSpanFromFile } from '../../analysis/disableRawPragma';
import { getUseRawDirectiveFromFile } from '../../analysis/useRawDirective';
import { transformPropertyAccess } from './transformPropertyAccess';
import { transformMacro } from './transformMacro';
import type TS from 'typescript';
import {
  RAW_TS_RUNTIME_IMPORT_PATH,
  RAW_TS_RUNTIME_IMPORT_PATH_PRAGMA,
  RAW_TS_RUNTIME_OBJECT
} from '../../constants';

const RAW_TS_RUNTIME_IMPORT_PATH_PRAGMA_REGEX = new RegExp(
  `${RAW_TS_RUNTIME_IMPORT_PATH_PRAGMA}\\((.+?)\\)`
);

function transformRawTsFile(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext
): TS.SourceFile {
  sourceFile.rawTsDiagnostics = [];

  const disableRawPragma = getDisableRawPragmaSpanFromFile(sourceFile);
  const useRawDirective = getUseRawDirectiveFromFile(ts, sourceFile);

  if (disableRawPragma != null) {
    if (useRawDirective != null)
      sourceFile.rawTsDiagnostics!.push(
        getConflictingDirectiveAndPragmaError(ts, sourceFile, useRawDirective)
      );

    return sourceFile;
  }

  if (useRawDirective == null) {
    const noDirectiveDiagnostic = getNoUseRawDiagnostic(ts, typeChecker, sourceFile);
    if (noDirectiveDiagnostic) sourceFile.rawTsDiagnostics!.push(noDirectiveDiagnostic);
    return sourceFile;
  }

  const visit = (node: TS.Node) => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      return transformPropertyAccess(sourceFile, ts, typeChecker, ctx, node, visit, true);

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression))
      return transformMacro(sourceFile, ts, typeChecker, ctx, node, node.expression, visit);

    return ts.visitEachChild(node, visit, ctx);
  };

  sourceFile = ts.visitNode(sourceFile, visit) as TS.SourceFile;
  const f = ctx.factory;

  const trivia = sourceFile.getFullText().slice(0, sourceFile.getLeadingTriviaWidth());

  const runtimeImportPath =
    trivia.match(RAW_TS_RUNTIME_IMPORT_PATH_PRAGMA_REGEX)?.[1] ?? RAW_TS_RUNTIME_IMPORT_PATH;

  return ctx.factory.updateSourceFile(
    sourceFile,
    [
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          undefined,
          undefined,
          f.createNamespaceImport(f.createIdentifier(RAW_TS_RUNTIME_OBJECT))
        ),
        f.createStringLiteral(runtimeImportPath),
        undefined
      ),
      ...sourceFile.statements
    ],
    sourceFile.isDeclarationFile,
    sourceFile.referencedFiles,
    sourceFile.typeReferenceDirectives,
    sourceFile.hasNoDefaultLib,
    sourceFile.libReferenceDirectives
  );
}

const createRawTsTransformer =
  (ts: typeof TS, typeChecker: TS.TypeChecker) =>
  (ctx: TS.TransformationContext) =>
  (sourceFile: TS.SourceFile) =>
    transformRawTsFile(sourceFile, ts, typeChecker, ctx);

export { createRawTsTransformer };
