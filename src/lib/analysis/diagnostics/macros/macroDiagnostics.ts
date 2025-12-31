import { getDiagnosticForTypeDescriptorOfMacro } from './typeDescriptorOf';
import { getDiagnosticForAlignmentOfMacro } from './alignmentOf';
import { getDiagnosticForOffsetOfMacro } from './offsetOf';
import { RAW_TS_MACRO_NAMES } from '../../../constants';
import { getDiagnosticForSizeOfMacro } from './sizeOf';
import type TS from 'typescript';

function getDiagnosticForMacro(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile,
  node: TS.Identifier,
  callNode: TS.CallExpression
) {
  switch (node.text) {
    case RAW_TS_MACRO_NAMES.TYPE_DESCRIPTOR_OF:
      return getDiagnosticForTypeDescriptorOfMacro(ts, typeChecker, sourceFile, callNode);
    case RAW_TS_MACRO_NAMES.SIZE_OF:
      return getDiagnosticForSizeOfMacro(ts, typeChecker, sourceFile, callNode);
    case RAW_TS_MACRO_NAMES.ALIGNMENT_OF:
      return getDiagnosticForAlignmentOfMacro(ts, typeChecker, sourceFile, callNode);
    case RAW_TS_MACRO_NAMES.OFFSET_OF:
      return getDiagnosticForOffsetOfMacro(ts, typeChecker, sourceFile, callNode);
  }

  return null;
}

export { getDiagnosticForMacro };
