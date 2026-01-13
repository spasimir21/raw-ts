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

const getArgumentCountDiagnostic = (
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  node: TS.CallExpression,
  errorCode: number,
  argumentCount: number
): TS.Diagnostic | null =>
  node.arguments.length !== argumentCount
    ? {
        category: ts.DiagnosticCategory.Error,
        code: errorCode,
        file: sourceFile,
        start: node.expression.getStart(),
        length: node.expression.getWidth(),
        messageText: `"${node.expression.getText()}" must be called with exactly ${argumentCount} argument(s)!`
      }
    : null;

const ASSIGNMENT_OPERATOR_KIND_SET = Symbol('ASSIGNMENT_OPERATOR_KIND_SET');

const getAssignmentOperatorKindSet = (ts: typeof TS): Set<number> => {
  if ((ts as any)[ASSIGNMENT_OPERATOR_KIND_SET] == null)
    (ts as any)[ASSIGNMENT_OPERATOR_KIND_SET] = new Set([
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.PlusEqualsToken,
      ts.SyntaxKind.MinusEqualsToken,
      ts.SyntaxKind.AsteriskEqualsToken,
      ts.SyntaxKind.AsteriskAsteriskEqualsToken,
      ts.SyntaxKind.SlashEqualsToken,
      ts.SyntaxKind.PercentEqualsToken,
      ts.SyntaxKind.LessThanLessThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.AmpersandEqualsToken,
      ts.SyntaxKind.BarEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken,
      ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
      ts.SyntaxKind.CaretEqualsToken
    ]);

  return (ts as any)[ASSIGNMENT_OPERATOR_KIND_SET];
};

const isAssignmentOperator = (ts: typeof TS, token: TS.BinaryOperatorToken) =>
  getAssignmentOperatorKindSet(ts).has(token.kind);

const isLefthandInAssignment = (ts: typeof TS, node: TS.Node) =>
  ts.isBinaryExpression(node.parent) &&
  node.parent.left === node &&
  isAssignmentOperator(ts, node.parent.operatorToken);

export { getTypeArgumentCountDiagnostic, getArgumentCountDiagnostic, isLefthandInAssignment };
