import { getPropertyAccessDiagnostic } from '../../analysis/diagnostics/getPropertyAccessDiagnostic';
import { createErrorExpression, createExpressionForJSValue } from './helpers';
import { analyzeRawType, isRawType } from '../../analysis/analysis';
import { Alignment, RawTypeDescriptor, RawTypeKind, ReferenceRawTypeKind } from '../../types';
import { RAW_TS_RUNTIME_OBJECT } from '../../constants';
import { createEnum } from '../../utils/enum';
import type TS from 'typescript';

const MEMORY = createEnum(
  'M_U8',
  'M_I8',
  'M_U16',
  'M_I16',
  'M_U32',
  'M_I32',
  'M_U64',
  'M_I64',
  'M_F16',
  'M_F32',
  'M_F64',
  'M_JS'
);

const TYPE_KIND_TO_MEMORY_MAP = {
  [RawTypeKind.UInt8]: MEMORY.M_U8,
  [RawTypeKind.Int8]: MEMORY.M_I8,
  [RawTypeKind.UInt16]: MEMORY.M_U16,
  [RawTypeKind.Int16]: MEMORY.M_I16,
  [RawTypeKind.UInt32]: MEMORY.M_U32,
  [RawTypeKind.Int32]: MEMORY.M_I32,
  [RawTypeKind.UInt64]: MEMORY.M_U64,
  [RawTypeKind.Int64]: MEMORY.M_I64,
  [RawTypeKind.Float16]: MEMORY.M_F16,
  [RawTypeKind.Float32]: MEMORY.M_F32,
  [RawTypeKind.Float64]: MEMORY.M_F64,
  [RawTypeKind.Bool]: MEMORY.M_U8,
  [RawTypeKind.RawPointer]: MEMORY.M_U32,
  [RawTypeKind.JSPointer]: MEMORY.M_U32
} as const;

enum PropertyAccessOperationKind {
  ARRAY_INDEX,
  STRUCT_FIELD,
  UNION_VARIANT,
  RAW_POINTER_DEREF,
  JS_POINTER_DEREF
}

type PropertyAccessOperation =
  | {
      kind: Exclude<
        PropertyAccessOperationKind,
        PropertyAccessOperationKind.ARRAY_INDEX | PropertyAccessOperationKind.STRUCT_FIELD
      >;
    }
  | {
      kind: PropertyAccessOperationKind.ARRAY_INDEX;
      elementSize: number;
      indexExpression: TS.Expression;
    }
  | {
      kind: PropertyAccessOperationKind.STRUCT_FIELD;
      offset: number;
    };

type PropertyAccessChain = {
  expression: TS.Expression;
  operations: PropertyAccessOperation[];
  descriptor: RawTypeDescriptor | null;
};

function getPropertyAccessChain(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  initialNode: TS.PropertyAccessExpression | TS.ElementAccessExpression
): PropertyAccessChain | string | null {
  const operations: PropertyAccessOperation[] = [];
  let node: TS.Expression = initialNode;

  while (true) {
    if (ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
      node = node.expression;
      continue;
    }

    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) break;

    const diagnostic = getPropertyAccessDiagnostic(ts, typeChecker, sourceFile, node);
    if (diagnostic != null) {
      sourceFile.rawTsDiagnostics!.push(diagnostic);
      return diagnostic.messageText as string;
    }

    const type = typeChecker.getTypeAtLocation(node.expression);
    if (!isRawType(type)) break;

    const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);
    if (analysis.descriptor == null) break;

    const descriptor = analysis.descriptor;

    if (ts.isElementAccessExpression(node)) {
      if (descriptor.kind !== RawTypeKind.Array) break;

      operations.push({
        kind: PropertyAccessOperationKind.ARRAY_INDEX,
        elementSize: descriptor.elementDescriptor.size,
        indexExpression: node.argumentExpression
      });

      node = node.expression;
      continue;
    }

    if (descriptor.kind === RawTypeKind.Struct) {
      const fieldName = node.name.text;
      if (!(fieldName in descriptor.fieldDescriptors)) break;

      operations.push({
        kind: PropertyAccessOperationKind.STRUCT_FIELD,
        offset: descriptor.fieldDescriptors[fieldName]!.offset
      });

      node = node.expression;
      continue;
    }

    if (descriptor.kind === RawTypeKind.Union) {
      const variantName = node.name.text;
      if (!(variantName in descriptor.variantDescriptors)) break;

      operations.push({ kind: PropertyAccessOperationKind.UNION_VARIANT });

      node = node.expression;
      continue;
    }

    if (descriptor.kind === RawTypeKind.RawPointer && node.name.text === 'value$') {
      operations.push({ kind: PropertyAccessOperationKind.RAW_POINTER_DEREF });

      node = node.expression;
      continue;
    }

    if (descriptor.kind === RawTypeKind.JSPointer && node.name.text === 'value$') {
      operations.push({ kind: PropertyAccessOperationKind.JS_POINTER_DEREF });

      node = node.expression;
      continue;
    }

    break;
  }

  if (operations.length === 0) return null;
  operations.reverse();

  return {
    expression: node,
    operations,
    descriptor:
      analyzeRawType(ts, sourceFile, typeChecker, typeChecker.getTypeAtLocation(initialNode))
        .descriptor ?? null
  };
}

function createResolveValueExpression(
  ts: typeof TS,
  f: TS.NodeFactory,
  expression: TS.Expression,
  typeKind: RawTypeKind,
  typeAlignment: Alignment
): TS.Expression {
  if (!(typeKind in TYPE_KIND_TO_MEMORY_MAP)) return expression;

  // prettier-ignore
  const shift = 
      typeAlignment === 1 ? 0
    : typeAlignment === 2 ? 1
    : typeAlignment === 4 ? 2
    : 3;

  const valueExpression = f.createElementAccessExpression(
    f.createPropertyAccessExpression(
      f.createIdentifier(RAW_TS_RUNTIME_OBJECT),
      f.createIdentifier(TYPE_KIND_TO_MEMORY_MAP[typeKind as keyof typeof TYPE_KIND_TO_MEMORY_MAP])
    ),
    shift === 0
      ? expression
      : f.createBinaryExpression(
          expression,
          f.createToken(ts.SyntaxKind.GreaterThanGreaterThanToken),
          f.createNumericLiteral(shift)
        )
  );

  if (typeKind !== RawTypeKind.Bool) return valueExpression;

  return f.createBinaryExpression(
    valueExpression,
    f.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
    f.createNumericLiteral('0')
  );
}

function transformPropertyAccess(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.PropertyAccessExpression | TS.ElementAccessExpression,
  visit: (node: TS.Node) => TS.Node,
  shouldResolveValue: boolean
): TS.Node {
  const chainOrError = getPropertyAccessChain(sourceFile, ts, typeChecker, node);
  if (chainOrError == null) return ts.visitEachChild(node, visit, ctx);

  if (typeof chainOrError === 'string') return createErrorExpression(ts, ctx.factory, chainOrError);

  const chain = chainOrError;
  const f = ctx.factory;

  let expression = ts.visitEachChild(chain.expression, visit, ctx);
  let offset = 0;

  const resetOffsetAndUpdateExpression = () => {
    if (offset === 0) return;

    expression = f.createBinaryExpression(
      expression,
      f.createToken(ts.SyntaxKind.PlusToken),
      f.createNumericLiteral(offset)
    );

    offset = 0;
  };

  for (let i = 0; i < chain.operations.length; i++) {
    const operation = chain.operations[i]!;

    switch (operation.kind) {
      case PropertyAccessOperationKind.STRUCT_FIELD:
        offset += operation.offset;
        continue;
      case PropertyAccessOperationKind.ARRAY_INDEX:
        const indexType = typeChecker.getTypeAtLocation(operation.indexExpression);

        if (indexType.isNumberLiteral()) {
          offset += indexType.value * operation.elementSize;
          continue;
        }

        expression = f.createBinaryExpression(
          expression,
          f.createToken(ts.SyntaxKind.PlusToken),
          f.createBinaryExpression(
            operation.indexExpression,
            f.createToken(ts.SyntaxKind.AsteriskToken),
            f.createNumericLiteral(operation.elementSize)
          )
        );

        continue;
      case PropertyAccessOperationKind.UNION_VARIANT:
        continue;
      case PropertyAccessOperationKind.RAW_POINTER_DEREF:
      case PropertyAccessOperationKind.JS_POINTER_DEREF:
        if (i !== 0) {
          resetOffsetAndUpdateExpression();
          expression = createResolveValueExpression(ts, f, expression, RawTypeKind.RawPointer, 4);
        }

        if (operation.kind === PropertyAccessOperationKind.JS_POINTER_DEREF)
          expression = f.createElementAccessExpression(
            f.createPropertyAccessExpression(
              f.createIdentifier(RAW_TS_RUNTIME_OBJECT),
              MEMORY.M_JS
            ),
            expression
          );

        continue;
    }
  }

  resetOffsetAndUpdateExpression();

  return shouldResolveValue && chain.descriptor != null
    ? createResolveValueExpression(
        ts,
        f,
        expression,
        chain.descriptor.kind,
        chain.descriptor.alignment
      )
    : expression;
}

export { transformPropertyAccess };
