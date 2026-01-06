import { getArgumentCountDiagnostic, getTypeArgumentCountDiagnostic } from '../helpers';
import { RAW_TS_DIAGNOSTIC_CODES, RAW_TS_MACRO_NAMES } from '../../../constants';
import { analyzeRawType } from '../../analysis';
import { RawTypeKind } from '../../../types';
import type TS from 'typescript';

function getDiagnosticForPointerCastMacro(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile,
  callNode: TS.CallExpression
): TS.Diagnostic | null {
  const typeArgDiagnostic = getTypeArgumentCountDiagnostic(
    ts,
    sourceFile,
    callNode,
    RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
    1
  );

  if (typeArgDiagnostic != null) return typeArgDiagnostic;

  const argDiagnostic = getArgumentCountDiagnostic(
    ts,
    sourceFile,
    callNode,
    RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
    1
  );

  if (argDiagnostic != null) return argDiagnostic;

  const typeNode = callNode.typeArguments![0]!;

  const typeAnalysis = analyzeRawType(
    ts,
    sourceFile,
    typeChecker,
    typeChecker.getTypeAtLocation(typeNode)
  );

  if (typeAnalysis.descriptor == null)
    return {
      category: ts.DiagnosticCategory.Error,
      code: typeAnalysis.errorCode,
      file: sourceFile,
      start: typeNode.getStart(),
      length: typeNode.getWidth(),
      messageText: typeAnalysis.errorMessage
    };

  const valueNode = callNode.arguments[0]!;
  const valueType = typeChecker.getTypeAtLocation(valueNode);

  if ((valueType.flags & ts.TypeFlags.NumberLike) !== 0) return null;

  const valueTypeAnalysis = analyzeRawType(ts, sourceFile, typeChecker, valueType);

  if (valueTypeAnalysis.descriptor == null)
    return {
      category: ts.DiagnosticCategory.Error,
      code: valueTypeAnalysis.errorCode,
      file: sourceFile,
      start: valueNode.getStart(),
      length: valueNode.getWidth(),
      messageText: valueTypeAnalysis.errorMessage
    };

  if (valueTypeAnalysis.descriptor.kind !== RawTypeKind.RawPointer)
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
      file: sourceFile,
      start: valueNode.getStart(),
      length: valueNode.getWidth(),
      messageText: `The value provided to "${RAW_TS_MACRO_NAMES.POINTER_CAST}" must be a raw pointer!`
    };

  if (typeAnalysis.descriptor.alignment > valueTypeAnalysis.descriptor.targetDescriptor.alignment)
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
      file: sourceFile,
      start: callNode.expression.getStart(),
      length: callNode.expression.getWidth(),
      messageText: 'Cannot safely cast a pointer into a pointer of a type with a greater alignment!'
    };

  return null;
}

export { getDiagnosticForPointerCastMacro };
