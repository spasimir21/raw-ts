import { RAW_TS_DIAGNOSTIC_CODES, RAW_TS_MACRO_NAMES } from '../../../constants';
import { getTypeArgumentCountDiagnostic } from '../helpers';
import { analyzeRawType } from '../../analysis';
import { RawTypeKind } from '../../../types';
import type TS from 'typescript';

function getDiagnosticForOffsetOfMacro(
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
    2
  );

  if (typeArgDiagnostic != null) return typeArgDiagnostic;

  const typeNode = callNode.typeArguments![0]!;
  const fieldNameNode = callNode.typeArguments![1]!;

  const type = typeChecker.getTypeAtLocation(typeNode);
  const fieldNameType = typeChecker.getTypeAtLocation(fieldNameNode);

  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (analysis.descriptor == null)
    return {
      category: ts.DiagnosticCategory.Error,
      code: analysis.errorCode,
      file: sourceFile,
      start: typeNode.getStart(),
      length: typeNode.getWidth(),
      messageText: analysis.errorMessage
    };

  const descriptor = analysis.descriptor;

  if (descriptor.kind !== RawTypeKind.Struct)
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
      file: sourceFile,
      start: typeNode.getStart(),
      length: typeNode.getWidth(),
      messageText: `The type provided to "${RAW_TS_MACRO_NAMES.OFFSET_OF}" must be a struct!`
    };

  if (!fieldNameType.isStringLiteral() || !(fieldNameType.value in descriptor.fieldDescriptors))
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
      file: sourceFile,
      start: fieldNameNode.getStart(),
      length: fieldNameNode.getWidth(),
      messageText: `The field name provided to "${RAW_TS_MACRO_NAMES.OFFSET_OF}" must be a valid string literal and a field of the struct!`
    };

  return null;
}

export { getDiagnosticForOffsetOfMacro };
