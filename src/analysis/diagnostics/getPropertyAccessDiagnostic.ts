import { RAW_TS_DIAGNOSTIC_CODES, RAW_TYPE_INFO_PROPERTY_NAME } from '../../constants';
import { analyzeRawType, isRawType } from '../analysis';
import { isLefthandInAssignment } from './helpers';
import { RawTypeKind } from '../../types';
import type TS from 'typescript';

function getPropertyAccessDiagnostic(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile,
  node: TS.PropertyAccessExpression | TS.ElementAccessExpression
): TS.Diagnostic | null {
  if (ts.isPropertyAccessExpression(node) && node.name.text === RAW_TYPE_INFO_PROPERTY_NAME)
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
      file: sourceFile,
      start: node.name.getStart(),
      length: node.name.getWidth(),
      messageText: `The property "${RAW_TYPE_INFO_PROPERTY_NAME}" is an internal, type-only property and cannot be used in code!`
    };

  const type = typeChecker.getTypeAtLocation(node.expression);

  if (node.questionDotToken != null && type.isUnion() && type.types.some(isRawType))
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
      file: sourceFile,
      start: node.getStart(),
      length: node.getWidth(),
      messageText: `Optional chaining cannot be used with raw types!`
    };

  if (!isRawType(type)) return null;

  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);
  if (analysis.descriptor == null)
    return {
      category: ts.DiagnosticCategory.Error,
      code: analysis.errorCode,
      file: sourceFile,
      start: node.expression.getStart(),
      length: node.expression.getWidth(),
      messageText: analysis.errorMessage
    };

  const descriptor = analysis.descriptor;

  const isInAssignment = isLefthandInAssignment(ts, node);

  if (ts.isElementAccessExpression(node)) {
    if (descriptor.kind !== RawTypeKind.Array)
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.argumentExpression.getStart(),
        length: node.argumentExpression.getWidth(),
        messageText: `Dynamic property access can only be used on arrays!`
      };

    const elementType = typeChecker.getTypeAtLocation(node.argumentExpression);
    if (
      (elementType.flags & ts.TypeFlags.NumberLike) === 0 ||
      (elementType.isNumberLiteral() &&
        (elementType.value < 0 || !Number.isInteger(elementType.value)))
    )
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.argumentExpression.getStart(),
        length: node.argumentExpression.getWidth(),
        messageText: `Raw arrays can only be indexed using positive integers!`
      };

    if (isInAssignment && !descriptor.elementDescriptor.isValueType)
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.getStart(),
        length: node.getWidth(),
        messageText: `Array elements cannot be assigned to as they hold a non-value type!`
      };

    return null;
  }

  if (descriptor.kind === RawTypeKind.Array)
    return {
      category: ts.DiagnosticCategory.Error,
      code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
      file: sourceFile,
      start: node.name.getStart(),
      length: node.name.getWidth(),
      messageText: `Raw array elements can only be accessed using an index!`
    };

  if (descriptor.kind === RawTypeKind.RawPointer) {
    if (node.name.text === 'value$' && isInAssignment && !descriptor.targetDescriptor.isValueType)
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.name.getStart(),
        length: node.name.getWidth(),
        messageText: `Pointer's value cannot be assigned to as it holds a non-value type!`
      };

    return null;
  }

  if (descriptor.kind === RawTypeKind.Union) {
    if (!(node.name.text in descriptor.variantDescriptors))
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.name.getStart(),
        length: node.name.getWidth(),
        messageText: `"${node.name.text}" is not a variant of this union!`
      };

    if (isInAssignment && !descriptor.variantDescriptors[node.name.text]!.isValueType)
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.name.getStart(),
        length: node.name.getWidth(),
        messageText: `"${node.name.text}" cannot be assigned to as it holds a non-value type!`
      };

    return null;
  }

  if (descriptor.kind === RawTypeKind.Struct) {
    if (!(node.name.text in descriptor.fieldDescriptors))
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.name.getStart(),
        length: node.name.getWidth(),
        messageText: `"${node.name.text}" is not a field of this struct!`
      };

    if (isInAssignment && !descriptor.fieldDescriptors[node.name.text]!.valueDescriptor.isValueType)
      return {
        category: ts.DiagnosticCategory.Error,
        code: RAW_TS_DIAGNOSTIC_CODES.INVALID_PROPERTY_ACCESS,
        file: sourceFile,
        start: node.name.getStart(),
        length: node.name.getWidth(),
        messageText: `"${node.name.text}" cannot be assigned to as it holds a non-value type!`
      };

    return null;
  }

  return null;
}

export { getPropertyAccessDiagnostic };
