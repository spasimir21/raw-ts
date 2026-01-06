import { RAW_TS_DIAGNOSTIC_CODES, RAW_TYPE_INFO_PROPERTY_NAME } from '../constants';
import { cacheRawTypeAnalysis, getCachedRawTypeAnalysis } from './analysisCache';
import { getPropertyTypeFromType } from './typeHelpers';
import type TS from 'typescript';
import {
  ArrayDescriptor,
  BoolDescriptor,
  Float16Descriptor,
  Float32Descriptor,
  Float64Descriptor,
  Int16Descriptor,
  Int32Descriptor,
  Int64Descriptor,
  Int8Descriptor,
  JSPointerDescriptor,
  RawPointerDescriptor,
  RawTypeDescriptor,
  RawTypeKind,
  StructDescriptor,
  StructFieldDescriptor,
  UInt16Descriptor,
  UInt32Descriptor,
  UInt64Descriptor,
  UInt8Descriptor,
  UnionDescriptor,
  VoidDescriptor
} from '../types';

type RawTypeAnalysis =
  | {
      descriptor: RawTypeDescriptor;
      errorMessage: null;
      errorCode: null;
    }
  | {
      descriptor: null;
      errorMessage: string;
      errorCode: number;
    };

const analysisWithDescriptor = (descriptor: RawTypeDescriptor) =>
  ({
    descriptor,
    errorMessage: null,
    errorCode: null
  } satisfies RawTypeAnalysis);

const analysisWithError = (errorMessage: string, errorCode: number) =>
  ({
    descriptor: null,
    errorMessage,
    errorCode
  } satisfies RawTypeAnalysis);

const INVALID_RAW_TYPE = analysisWithError(
  'Invalid raw type!',
  RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
);

const SELF_REFERENTIAL_RAW_TYPE = analysisWithError(
  'This type references itself!',
  RAW_TS_DIAGNOSTIC_CODES.SELF_REFERENTIAL_RAW_TYPE
);

const RAW_TYPE_DESCRIPTOR_MAP = new Map([
  [
    RawTypeKind.UInt8,
    {
      kind: RawTypeKind.UInt8,
      size: 1,
      alignment: 1,
      isValueType: true,
      hasDynamicSize: false
    } satisfies UInt8Descriptor
  ],
  [
    RawTypeKind.Int8,
    {
      kind: RawTypeKind.Int8,
      size: 1,
      alignment: 1,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Int8Descriptor
  ],
  [
    RawTypeKind.UInt16,
    {
      kind: RawTypeKind.UInt16,
      size: 2,
      alignment: 2,
      isValueType: true,
      hasDynamicSize: false
    } satisfies UInt16Descriptor
  ],
  [
    RawTypeKind.Int16,
    {
      kind: RawTypeKind.Int16,
      size: 2,
      alignment: 2,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Int16Descriptor
  ],
  [
    RawTypeKind.UInt32,
    {
      kind: RawTypeKind.UInt32,
      size: 4,
      alignment: 4,
      isValueType: true,
      hasDynamicSize: false
    } satisfies UInt32Descriptor
  ],
  [
    RawTypeKind.Int32,
    {
      kind: RawTypeKind.Int32,
      size: 4,
      alignment: 4,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Int32Descriptor
  ],
  [
    RawTypeKind.UInt64,
    {
      kind: RawTypeKind.UInt64,
      size: 8,
      alignment: 8,
      isValueType: true,
      hasDynamicSize: false
    } satisfies UInt64Descriptor
  ],
  [
    RawTypeKind.Int64,
    {
      kind: RawTypeKind.Int64,
      size: 8,
      alignment: 8,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Int64Descriptor
  ],
  [
    RawTypeKind.Float16,
    {
      kind: RawTypeKind.Float16,
      size: 2,
      alignment: 2,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Float16Descriptor
  ],
  [
    RawTypeKind.Float32,
    {
      kind: RawTypeKind.Float32,
      size: 4,
      alignment: 4,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Float32Descriptor
  ],
  [
    RawTypeKind.Float64,
    {
      kind: RawTypeKind.Float64,
      size: 8,
      alignment: 8,
      isValueType: true,
      hasDynamicSize: false
    } satisfies Float64Descriptor
  ],
  [
    RawTypeKind.Bool,
    {
      kind: RawTypeKind.Bool,
      size: 1,
      alignment: 1,
      isValueType: true,
      hasDynamicSize: false
    } satisfies BoolDescriptor
  ],
  [
    RawTypeKind.JSPointer,
    {
      kind: RawTypeKind.JSPointer,
      size: 4,
      alignment: 4,
      isValueType: true,
      hasDynamicSize: false,
      targetType: null
    } satisfies JSPointerDescriptor<any>
  ]
]);

const isRawType = (type: TS.Type) => type.getProperty(RAW_TYPE_INFO_PROPERTY_NAME) != null;

function analyzeVoidTypeInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  infoType: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysis {
  const alignmentType = getPropertyTypeFromType(typeChecker, infoType, 'alignment');
  if (
    alignmentType == null ||
    !alignmentType.isNumberLiteral() ||
    (alignmentType.value !== 1 &&
      alignmentType.value !== 2 &&
      alignmentType.value !== 4 &&
      alignmentType.value !== 8)
  )
    return analysisWithError(`Invalid alignment!`, RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE);

  const sizeType = getPropertyTypeFromType(typeChecker, infoType, 'size');
  if (
    sizeType == null ||
    (sizeType.flags & ts.TypeFlags.NumberLike) === 0 ||
    (sizeType.isNumberLiteral() &&
      (!Number.isFinite(sizeType.value) || sizeType.value < 0 || sizeType.value > 64_000_000))
  )
    return analysisWithError(
      `Invalid or indeterminite size!`,
      RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
    );

  return analysisWithDescriptor({
    kind: RawTypeKind.Void,
    size: sizeType.isNumberLiteral() ? sizeType.value : 0,
    alignment: alignmentType.value,
    isValueType: false,
    hasDynamicSize: !sizeType.isNumberLiteral()
  } satisfies VoidDescriptor);
}

function analyzeRawPointerTypeInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  infoType: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysis {
  const targetType = getPropertyTypeFromType(typeChecker, infoType, 'target');
  if (targetType == null)
    return analysisWithError('Invalid pointer target!', RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE);

  let targetDescriptor = circularDescriptors.get(targetType.id) ?? null;
  if (targetDescriptor == null) {
    const targetAnalysis = analyzeRawType(
      ts,
      sourceFile,
      typeChecker,
      targetType,
      circularDescriptors
    );

    if (targetAnalysis.descriptor == null)
      return analysisWithError(
        `In pointer target,\n${targetAnalysis.errorMessage}`,
        targetAnalysis.errorCode
      );

    targetDescriptor = targetAnalysis.descriptor;
  }

  return analysisWithDescriptor({
    kind: RawTypeKind.RawPointer,
    size: 4,
    alignment: 4,
    isValueType: true,
    hasDynamicSize: false,
    targetDescriptor
  } satisfies RawPointerDescriptor);
}

function analyzeRawArrayTypeInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  infoType: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysis {
  if (circularDescriptors.has(type.id)) return SELF_REFERENTIAL_RAW_TYPE;

  const elementType = getPropertyTypeFromType(typeChecker, infoType, 'element');
  if (elementType == null)
    return analysisWithError('Missing element type!', RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE);

  const lengthType = getPropertyTypeFromType(typeChecker, infoType, 'length');
  if (
    lengthType == null ||
    (lengthType.flags & ts.TypeFlags.NumberLike) === 0 ||
    (lengthType.isNumberLiteral() &&
      (!Number.isFinite(lengthType.value) || lengthType.value < 0 || lengthType.value > 64_000_000))
  )
    return analysisWithError(
      `Invalid or indeterminite length!`,
      RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
    );

  const descriptor: ArrayDescriptor = {
    kind: RawTypeKind.Array,
    size: 0,
    alignment: 1,
    isValueType: false,
    hasDynamicSize: !lengthType.isNumberLiteral(),
    hasFixedLength: lengthType.isNumberLiteral(),
    length: lengthType.isNumberLiteral() ? lengthType.value : 0,
    elementDescriptor: null as any
  };

  circularDescriptors.set(type.id, descriptor);

  const elementAnalysis = analyzeRawType(
    ts,
    sourceFile,
    typeChecker,
    elementType,
    circularDescriptors
  );

  circularDescriptors.delete(type.id);

  if (elementAnalysis.descriptor == null)
    return analysisWithError(
      `In element type,\n${elementAnalysis.errorMessage}`,
      elementAnalysis.errorCode
    );

  const elementDescriptor = elementAnalysis.descriptor;
  if (elementDescriptor.hasDynamicSize)
    return analysisWithError(
      `Element type cannot have a dynamic size!`,
      RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
    );

  descriptor.elementDescriptor = elementDescriptor;
  descriptor.alignment = elementDescriptor.alignment;
  if (lengthType.isNumberLiteral()) descriptor.size = lengthType.value * elementDescriptor.size;

  return analysisWithDescriptor(descriptor);
}

function analyzeRawUnionTypeInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  infoType: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysis {
  if (circularDescriptors.has(type.id)) return SELF_REFERENTIAL_RAW_TYPE;

  const variantsType = getPropertyTypeFromType(typeChecker, infoType, 'variants');
  if (variantsType == null) return INVALID_RAW_TYPE;

  const variantSymbols = variantsType.getProperties();
  if (variantSymbols.length > 128)
    return analysisWithError(
      'Unions cannot have more than 128 variants!',
      RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
    );

  const descriptor: UnionDescriptor = {
    kind: RawTypeKind.Union,
    size: 0,
    alignment: 1,
    isValueType: false,
    hasDynamicSize: false,
    variantDescriptors: {}
  };

  circularDescriptors.set(type.id, descriptor);

  for (const variantSymbol of variantSymbols) {
    const variantType = typeChecker.getTypeOfSymbol(variantSymbol);
    const variantAnalysis = analyzeRawType(
      ts,
      sourceFile,
      typeChecker,
      variantType,
      circularDescriptors
    );

    if (variantAnalysis.descriptor == null) {
      circularDescriptors.delete(type.id);

      return analysisWithError(
        `In variant "${variantSymbol.name}",\n${variantAnalysis.errorMessage}`,
        variantAnalysis.errorCode
      );
    }

    const variantDescriptor = variantAnalysis.descriptor;

    if (variantDescriptor.hasDynamicSize) descriptor.hasDynamicSize = true;
    else if (variantDescriptor.size > descriptor.size) descriptor.size = variantDescriptor.size;

    if (variantDescriptor.alignment > descriptor.alignment)
      descriptor.alignment = variantDescriptor.alignment;

    descriptor.variantDescriptors[variantSymbol.name] = variantDescriptor;
  }

  circularDescriptors.delete(type.id);

  return analysisWithDescriptor(descriptor);
}

function analyzeRawStructTypeInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  infoType: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysis {
  if (circularDescriptors.has(type.id)) return SELF_REFERENTIAL_RAW_TYPE;

  const fieldsType = getPropertyTypeFromType(typeChecker, infoType, 'fields');
  if (fieldsType == null) return INVALID_RAW_TYPE;

  const fieldSymbols = fieldsType.getProperties();
  if (fieldSymbols.length > 128)
    return analysisWithError(
      'Structs cannot have more than 128 fields!',
      RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
    );

  const descriptor: StructDescriptor = {
    kind: RawTypeKind.Struct,
    size: 0,
    alignment: 1,
    isValueType: false,
    hasDynamicSize: false,
    totalPaddingSize: 0,
    fieldDescriptors: {}
  };

  circularDescriptors.set(type.id, descriptor);

  let lastFieldDescriptor: StructFieldDescriptor | null = null;
  let offset = 0;

  for (let i = 0; i < fieldSymbols.length; i++) {
    const fieldSymbol = fieldSymbols[i]!;

    const valueType = typeChecker.getTypeOfSymbol(fieldSymbol);
    const valueAnalysis = analyzeRawType(
      ts,
      sourceFile,
      typeChecker,
      valueType,
      circularDescriptors
    );

    if (valueAnalysis.descriptor == null) {
      circularDescriptors.delete(type.id);

      return analysisWithError(
        `In field "${fieldSymbol.name}":\n${valueAnalysis.errorMessage}`,
        valueAnalysis.errorCode
      );
    }

    const valueDescriptor = valueAnalysis.descriptor;

    if (valueDescriptor.hasDynamicSize && i !== fieldSymbols.length - 1) {
      circularDescriptors.delete(type.id);

      return analysisWithError(
        `Only the last field in a struct may have a dynamic size!`,
        RAW_TS_DIAGNOSTIC_CODES.INVALID_RAW_TYPE
      );
    }

    if (lastFieldDescriptor != null && offset % valueDescriptor.alignment !== 0) {
      const paddingSize = valueDescriptor.alignment - (offset % valueDescriptor.alignment);

      lastFieldDescriptor.paddingSize = paddingSize;
      descriptor.totalPaddingSize += paddingSize;
      offset += paddingSize;
    }

    const fieldDescriptor: StructFieldDescriptor = {
      index: i,
      name: fieldSymbol.name,
      offset,
      paddingSize: 0,
      valueDescriptor
    };

    offset += valueDescriptor.size;

    if (valueDescriptor.hasDynamicSize) descriptor.hasDynamicSize = true;
    if (valueDescriptor.alignment > descriptor.alignment)
      descriptor.alignment = valueDescriptor.alignment;

    descriptor.fieldDescriptors[fieldSymbol.name] = fieldDescriptor;
    lastFieldDescriptor = fieldDescriptor;
  }

  circularDescriptors.delete(type.id);

  if (!descriptor.hasDynamicSize && offset % descriptor.alignment !== 0) {
    const paddingSize = descriptor.alignment - (offset % descriptor.alignment);

    if (lastFieldDescriptor != null) lastFieldDescriptor.paddingSize = paddingSize;
    descriptor.totalPaddingSize += paddingSize;
    offset += paddingSize;
  }

  descriptor.size = offset;

  return analysisWithDescriptor(descriptor);
}

function analyzeRawTypeInfo(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  infoType: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysis {
  const kindType = getPropertyTypeFromType(typeChecker, infoType, 'kind');
  if (kindType == null || !kindType.isNumberLiteral()) return INVALID_RAW_TYPE;

  switch (kindType.value) {
    case RawTypeKind.Void:
      return analyzeVoidTypeInfo(ts, sourceFile, typeChecker, infoType, circularDescriptors);
    case RawTypeKind.RawPointer:
      return analyzeRawPointerTypeInfo(ts, sourceFile, typeChecker, infoType, circularDescriptors);
    case RawTypeKind.Array:
      return analyzeRawArrayTypeInfo(
        ts,
        sourceFile,
        typeChecker,
        type,
        infoType,
        circularDescriptors
      );
    case RawTypeKind.Union:
      return analyzeRawUnionTypeInfo(
        ts,
        sourceFile,
        typeChecker,
        type,
        infoType,
        circularDescriptors
      );
    case RawTypeKind.Struct:
      return analyzeRawStructTypeInfo(
        ts,
        sourceFile,
        typeChecker,
        type,
        infoType,
        circularDescriptors
      );
  }

  const descriptor = RAW_TYPE_DESCRIPTOR_MAP.get(kindType.value) ?? null;
  if (descriptor != null) return analysisWithDescriptor(descriptor);

  return INVALID_RAW_TYPE;
}

function analyzeRawType(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor> = new Map()
): RawTypeAnalysis {
  const cachedAnalysis = getCachedRawTypeAnalysis(sourceFile, type.id);
  if (cachedAnalysis) return cachedAnalysis;

  const infoSymbol = type.getProperty(RAW_TYPE_INFO_PROPERTY_NAME);

  let analysis = infoSymbol
    ? analyzeRawTypeInfo(
        ts,
        sourceFile,
        typeChecker,
        type,
        typeChecker.getTypeOfSymbol(infoSymbol),
        circularDescriptors
      )
    : analysisWithError(`This type is not a raw type!`, RAW_TS_DIAGNOSTIC_CODES.NOT_A_RAW_TYPE);

  if (analysis.descriptor == null)
    analysis = analysisWithError(
      `In type \`${typeChecker.typeToString(type)}\`,\n${analysis.errorMessage}`,
      analysis.errorCode
    );

  cacheRawTypeAnalysis(sourceFile, type.id, analysis);
  return analysis;
}

export { RawTypeAnalysis, isRawType, analyzeRawType };
