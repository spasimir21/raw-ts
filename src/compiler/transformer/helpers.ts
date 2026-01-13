import { generateId } from '../../utils/id';
import type TS from 'typescript';

const createErrorExpression = (ts: typeof TS, f: TS.NodeFactory, message: string) =>
  f.createCallExpression(
    f.createParenthesizedExpression(
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        f.createBlock(
          [
            f.createThrowStatement(
              f.createNewExpression(f.createIdentifier('Error'), undefined, [
                f.createStringLiteral(message)
              ])
            )
          ],
          false
        )
      )
    ),
    undefined,
    []
  );

function createExpressionForJSValue(
  ts: typeof TS,
  f: TS.NodeFactory,
  value: any
): TS.CallExpression {
  const idMap = new Map<any, string>();

  const collectObjects = (value: any) => {
    if (typeof value !== 'object' || value == null || idMap.has(value)) return;

    idMap.set(value, generateId());

    if (Array.isArray(value)) for (const element of value) collectObjects(element);
    else for (const key in value) collectObjects(value[key]);
  };

  collectObjects(value);

  const getExpressionForValue = (value: any) => {
    switch (typeof value) {
      case 'undefined':
        return f.createIdentifier('undefined');
      case 'boolean':
        return value ? f.createTrue() : f.createFalse();
      case 'bigint':
        return f.createCallExpression(f.createIdentifier('BigInt'), undefined, [
          f.createStringLiteral(value.toString())
        ]);
      case 'number':
        const literal = f.createNumericLiteral(Math.abs(value));
        return value >= 0 ? literal : f.createPrefixMinus(literal);
      case 'string':
        return f.createStringLiteral(value);
      default:
        return f.createNull();
    }
  };

  const declarations: TS.VariableDeclaration[] = [];

  for (const [value, id] of idMap.entries())
    declarations.push(
      f.createVariableDeclaration(
        id,
        undefined,
        undefined,
        Array.isArray(value)
          ? f.createArrayLiteralExpression(value.map(getExpressionForValue))
          : f.createObjectLiteralExpression(
              Object.entries(value).map(([key, value]) =>
                f.createPropertyAssignment(key, getExpressionForValue(value))
              )
            )
      )
    );

  const statements: TS.Statement[] = [];

  for (const [value, id] of idMap.entries()) {
    if (Array.isArray(value))
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'object' || value[i] == null) continue;

        statements.push(
          f.createExpressionStatement(
            f.createBinaryExpression(
              f.createElementAccessExpression(f.createIdentifier(id), i),
              f.createToken(ts.SyntaxKind.EqualsToken),
              f.createIdentifier(idMap.get(value[i])!)
            )
          )
        );
      }
    else
      for (const key in value) {
        if (typeof value[key] !== 'object' || value[key] == null) continue;

        statements.push(
          f.createExpressionStatement(
            f.createBinaryExpression(
              f.createElementAccessExpression(f.createIdentifier(id), f.createStringLiteral(key)),
              f.createToken(ts.SyntaxKind.EqualsToken),
              f.createIdentifier(idMap.get(value[key])!)
            )
          )
        );
      }
  }

  return f.createCallExpression(
    f.createParenthesizedExpression(
      f.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        undefined,
        f.createBlock([
          f.createVariableStatement(undefined, f.createVariableDeclarationList(declarations)),
          ...statements,
          f.createReturnStatement(f.createIdentifier(idMap.get(value)!))
        ])
      )
    ),
    undefined,
    []
  );
}

export { createErrorExpression, createExpressionForJSValue };
