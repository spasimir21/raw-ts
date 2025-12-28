import { getDiagnosticForTypeDescriptorOfMacro } from './macros/typeDescriptorOf';
import { RAW_TS_MACRO_NAMES } from '../../constants';
import type TS from 'typescript';

function getDiagnosticForMacro(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile,
  node: TS.Identifier,
  callNode: TS.CallExpression
) {
  switch (node.text) {
    case RAW_TS_MACRO_NAMES.TYPE_DESCRIPTOR_OF:
      return getDiagnosticForTypeDescriptorOfMacro(ts, typeChecker, sourceFile, callNode);
  }

  return null;
}

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
