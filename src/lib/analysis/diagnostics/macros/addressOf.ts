import { RAW_TS_DIAGNOSTIC_CODES, RAW_TS_MACRO_NAMES } from '../../../constants';
import { analyzeRawType } from '../../analysis';
import { getArgumentCountDiagnostic } from '../helpers';
import type TS from 'typescript';

function getDiagnosticForAddressOfMacro(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile,
  callNode: TS.CallExpression
): TS.Diagnostic | null {
  const argDiagnostic = getArgumentCountDiagnostic(
    ts,
    sourceFile,
    callNode,
    RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
    1
  );

  if (argDiagnostic != null) return argDiagnostic;

  let argumentNode = callNode.arguments[0]!;

  const type = typeChecker.getTypeAtLocation(argumentNode);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (analysis.descriptor == null)
    return {
      category: ts.DiagnosticCategory.Error,
      code: analysis.errorCode,
      file: sourceFile,
      start: argumentNode.getStart(),
      length: argumentNode.getWidth(),
      messageText: analysis.errorMessage
    };

  const descriptor = analysis.descriptor;

  if (!descriptor.isValueType) return null;

  while (ts.isAsExpression(argumentNode) || ts.isNonNullExpression(argumentNode))
    argumentNode = argumentNode.expression;

  if (!ts.isPropertyAccessExpression(argumentNode) && !ts.isElementAccessExpression(argumentNode))
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
      file: sourceFile,
      start: argumentNode.getStart(),
      length: argumentNode.getWidth(),
      messageText: `"${RAW_TS_MACRO_NAMES.ADDRESS_OF}" cannot be called with a value type that isn't referenced through a struct, union, array or pointer!`
    };

  return null;
}

export { getDiagnosticForAddressOfMacro };
