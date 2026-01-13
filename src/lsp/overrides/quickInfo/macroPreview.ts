import { analyzeRawType } from '../../../analysis/analysis';
import { RAW_TS_MACRO_NAMES } from '../../../constants';
import { RawTypeKind } from '../../../types';
import type TS from 'typescript';
import { inspect } from 'util';

function getTypeDescriptorOfPreview(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  callNode: TS.CallExpression
): string | null {
  if (callNode.typeArguments?.[0] == null) return null;

  const type = typeChecker.getTypeAtLocation(callNode.typeArguments[0]);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (analysis.descriptor == null) return null;

  const code = inspect(analysis.descriptor, { depth: null })
    .replace(/<ref\s+\*(\d+)>/g, '/* desc$1 */')
    .replace(/\[Circular\s+\*(\d+)\]/g, 'desc$1')
    .replace(/kind:\s+(\d+),/g, (_, n) => `kind: RawTypeKind.${RawTypeKind[n]},`);

  return code;
}

function getSizeOfPreview(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  callNode: TS.CallExpression
): string | null {
  if (callNode.typeArguments?.[0] == null) return null;

  const type = typeChecker.getTypeAtLocation(callNode.typeArguments[0]);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (analysis.descriptor == null) return null;

  return analysis.descriptor.size.toString();
}

function getAlignmentOfPreview(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  callNode: TS.CallExpression
): string | null {
  if (callNode.typeArguments?.[0] == null) return null;

  const type = typeChecker.getTypeAtLocation(callNode.typeArguments[0]);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (analysis.descriptor == null) return null;

  return analysis.descriptor.alignment.toString();
}

function getOffsetOfPreview(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  callNode: TS.CallExpression
): string | null {
  if (callNode.typeArguments?.[0] == null || callNode.typeArguments?.[1] == null) return null;

  const type = typeChecker.getTypeAtLocation(callNode.typeArguments[0]);
  const fieldNameType = typeChecker.getTypeAtLocation(callNode.typeArguments[1]);

  if (!fieldNameType.isStringLiteral()) return null;

  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  if (
    analysis.descriptor == null ||
    analysis.descriptor.kind !== RawTypeKind.Struct ||
    !(fieldNameType.value in analysis.descriptor.fieldDescriptors)
  )
    return null;

  return analysis.descriptor.fieldDescriptors[fieldNameType.value]!.offset.toString();
}

function getMacroPreviewForQuickInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  callNode: TS.CallExpression,
  macroName: string
): string | null {
  switch (macroName) {
    case RAW_TS_MACRO_NAMES.TYPE_DESCRIPTOR_OF:
      return getTypeDescriptorOfPreview(ts, sourceFile, typeChecker, callNode);
    case RAW_TS_MACRO_NAMES.SIZE_OF:
      return getSizeOfPreview(ts, sourceFile, typeChecker, callNode);
    case RAW_TS_MACRO_NAMES.ALIGNMENT_OF:
      return getAlignmentOfPreview(ts, sourceFile, typeChecker, callNode);
    case RAW_TS_MACRO_NAMES.OFFSET_OF:
      return getOffsetOfPreview(ts, sourceFile, typeChecker, callNode);
  }

  return null;
}

export { getMacroPreviewForQuickInfo };
