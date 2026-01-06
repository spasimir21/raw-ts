import { getPropertyAccessDiagnostic } from '../../analysis/diagnostics/getPropertyAccessDiagnostic';
import { isRawType } from '../../analysis/analysis';
import type TS from 'typescript';

function transformPropertyAccess(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.PropertyAccessExpression | TS.ElementAccessExpression,
  visit: (node: TS.Node) => TS.Node
): TS.Node {
  const type = typeChecker.getTypeAtLocation(node.expression);
  if (!isRawType(type)) return ts.visitEachChild(node, visit, ctx);

  const diagnostic = getPropertyAccessDiagnostic(ts, typeChecker, sourceFile, node);
  if (diagnostic != null) sourceFile.rawTsDiagnostics!.push(diagnostic);

  return ts.visitEachChild(node, visit, ctx);
}

export { transformPropertyAccess };
