import { getDiagnosticForTypeDescriptorOfMacro } from '../../../analysis/diagnostics/macros/typeDescriptorOf';
import { createErrorExpression, createExpressionForJSValue } from '../helpers';
import { analyzeRawType } from '../../../analysis/analysis';
import type TS from 'typescript';

function transformTypeDescriptorOfMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression
): TS.Node {
  const diagnostic = getDiagnosticForTypeDescriptorOfMacro(ts, typeChecker, sourceFile, node);
  if (diagnostic != null) {
    sourceFile.rawTsDiagnostics!.push(diagnostic);
    return createErrorExpression(ts, ctx.factory, diagnostic.messageText as string);
  }

  const type = typeChecker.getTypeAtLocation(node.typeArguments![0]!);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  return createExpressionForJSValue(ts, ctx.factory, analysis.descriptor!);
}

export { transformTypeDescriptorOfMacro };
