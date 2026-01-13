import { USE_RAW_TS_DIRECTIVE, USE_RAW_TS_EXPORT_SYMBOL } from '../constants';
import type TS from 'typescript';

function getUseRawDirectiveFromFile(ts: typeof TS, sourceFile: TS.SourceFile) {
  const firstStatement = sourceFile.statements[0];
  if (firstStatement == null) return null;

  if (sourceFile.isDeclarationFile) {
    if (!ts.isVariableStatement(firstStatement)) return null;
    const name = firstStatement.declarationList.declarations[0]?.name;

    return name && ts.isIdentifier(name) && name.text === USE_RAW_TS_EXPORT_SYMBOL ? name : null;
  }

  return ts.isExpressionStatement(firstStatement) &&
    ts.isStringLiteral(firstStatement.expression) &&
    firstStatement.expression.text == USE_RAW_TS_DIRECTIVE
    ? firstStatement.expression
    : null;
}

export { getUseRawDirectiveFromFile };
