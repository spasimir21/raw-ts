import { getDiagnosticForMacro } from './macros/macroDiagnostics';
import type TS from 'typescript';

function getRawTsDiagnosticsForFile(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile
) {
  const diagnostics: TS.Diagnostic[] = [];

  const visitor = (node: TS.Node): TS.Node => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression))
      return ts.visitEachChild(node, visitor, undefined);

    const diagnostic = getDiagnosticForMacro(ts, typeChecker, sourceFile, node.expression, node);
    if (diagnostic != null) diagnostics.push(diagnostic);

    return node;
  };

  ts.visitNode(sourceFile, visitor, undefined);

  return diagnostics;
}

export { getRawTsDiagnosticsForFile };
