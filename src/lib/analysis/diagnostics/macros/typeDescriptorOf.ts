import { RAW_TS_DIAGNOSTIC_CODES, RAW_TS_MACRO_NAMES } from '../../../constants';
import { analyzeRawType } from '../../analysis';
import type TS from 'typescript';

function getDiagnosticForTypeDescriptorOfMacro(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile,
  callNode: TS.CallExpression
): TS.Diagnostic | null {
  const typeArguments = callNode.typeArguments;

  if (typeArguments == null || typeArguments.length !== 1)
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_MACRO_CALL,
      file: sourceFile,
      start: callNode.expression.getStart(),
      length: callNode.expression.getWidth(),
      messageText: `The "${RAW_TS_MACRO_NAMES.TYPE_DESCRIPTOR_OF}" macro must be called with exactly one type argument!`
    };

  const type = typeChecker.getTypeAtLocation(typeArguments[0]!);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (analysis.descriptor == null)
    return {
      category: ts.DiagnosticCategory.Error,
      code: analysis.errorCode,
      file: sourceFile,
      start: typeArguments[0]!.getStart(),
      length: typeArguments[0]!.getWidth(),
      messageText: analysis.errorMessage
    };

  return null;
}

export { getDiagnosticForTypeDescriptorOfMacro };
