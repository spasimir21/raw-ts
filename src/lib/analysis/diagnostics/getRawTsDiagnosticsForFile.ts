import { getPropertyAccessDiagnostic } from './getPropertyAccessDiagnostic';
import { getDiagnosticForMacro } from './macros/macroDiagnostics';
import type TS from 'typescript';

function getRawTsDiagnosticsForFile(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile
) {
  const diagnostics: TS.Diagnostic[] = [];

  const visitor = (node: TS.Node): TS.Node => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const diagnostic = getPropertyAccessDiagnostic(ts, typeChecker, sourceFile, node);
      if (diagnostic != null) diagnostics.push(diagnostic);
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const diagnostic = getDiagnosticForMacro(ts, typeChecker, sourceFile, node.expression, node);
      if (diagnostic != null) diagnostics.push(diagnostic);
    }

    return ts.visitEachChild(node, visitor, undefined);
  };

  ts.visitNode(sourceFile, visitor, undefined);

  return diagnostics;
}

export { getRawTsDiagnosticsForFile };
