import { DISABLE_RAW_TS_PRAGMA, RAW_TS_DIAGNOSTIC_CODES, USE_RAW_TS_DIRECTIVE } from '../../common';
import type TS from 'typescript';

const getConflictingDirectiveAndPragmaError = (
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  directive: TS.Node
): TS.Diagnostic => ({
  category: ts.DiagnosticCategory.Error,
  code: RAW_TS_DIAGNOSTIC_CODES.CONFLICTING_DIRECTIVE_AND_PRAGMA,
  file: sourceFile,
  start: directive.getStart(),
  length: directive.getWidth(),
  messageText: `This file contains both ${DISABLE_RAW_TS_PRAGMA} and "${USE_RAW_TS_DIRECTIVE}", which have opposite meanings!`
});

export { getConflictingDirectiveAndPragmaError };
