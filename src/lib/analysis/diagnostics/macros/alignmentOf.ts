import { RAW_TS_DIAGNOSTIC_CODES } from '../../../constants';
import { getTypeArgumentCountDiagnostic } from '../helpers';
import { analyzeRawType } from '../../analysis';
import type TS from 'typescript';

function getDiagnosticForAlignmentOfMacro(
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

  const typeNode = callNode.typeArguments![0]!;

  const type = typeChecker.getTypeAtLocation(typeNode);
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

  return null;
}

export { getDiagnosticForAlignmentOfMacro };
