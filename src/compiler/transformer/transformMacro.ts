import { getDiagnosticForMacro } from '../../analysis/diagnostics/macros/macroDiagnostics';
import { createErrorExpression, createExpressionForJSValue } from './helpers';
import { transformPropertyAccess } from './transformPropertyAccess';
import { analyzeRawType } from '../../analysis/analysis';
import { RAW_TS_MACRO_NAMES } from '../../constants';
import { StructDescriptor } from '../../types';
import type TS from 'typescript';

function transformTypeDescriptorOfMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression
): TS.Node {
  const type = typeChecker.getTypeAtLocation(node.typeArguments![0]!);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  return createExpressionForJSValue(ts, ctx.factory, analysis.descriptor!);
}

function transformSizeOfMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression
): TS.Node {
  const type = typeChecker.getTypeAtLocation(node.typeArguments![0]!);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  return ctx.factory.createNumericLiteral(analysis.descriptor!.size);
}

function transformAlignmentOfMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression
): TS.Node {
  const type = typeChecker.getTypeAtLocation(node.typeArguments![0]!);
  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  return ctx.factory.createNumericLiteral(analysis.descriptor!.alignment);
}

function transformOffsetOfMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression
): TS.Node {
  const type = typeChecker.getTypeAtLocation(node.typeArguments![0]!);
  const fieldNameType = typeChecker.getTypeAtLocation(
    node.typeArguments![1]!
  ) as TS.StringLiteralType;

  const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);

  return ctx.factory.createNumericLiteral(
    (analysis.descriptor as StructDescriptor).fieldDescriptors[fieldNameType.value]!.offset
  );
}

function transformAddressOfMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  node: TS.CallExpression,
  visit: (node: TS.Node) => TS.Node
): TS.Node {
  let argumentNode = node.arguments[0];
  if (argumentNode == null) return node;

  while (ts.isAsExpression(argumentNode) || ts.isNonNullExpression(argumentNode))
    argumentNode = argumentNode.expression;

  if (ts.isPropertyAccessExpression(argumentNode) || ts.isElementAccessExpression(argumentNode))
    return transformPropertyAccess(sourceFile, ts, typeChecker, ctx, argumentNode, visit, false);

  return ts.visitNode(argumentNode, visit);
}

function transformMacro(
  sourceFile: TS.SourceFile,
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  ctx: TS.TransformationContext,
  callNode: TS.CallExpression,
  node: TS.Identifier,
  visit: (node: TS.Node) => TS.Node
): TS.Node {
  const diagnostic = getDiagnosticForMacro(ts, typeChecker, sourceFile, node, callNode);
  if (diagnostic != null) {
    sourceFile.rawTsDiagnostics!.push(diagnostic);
    return createErrorExpression(ts, ctx.factory, diagnostic.messageText as string);
  }

  switch (node.text) {
    case RAW_TS_MACRO_NAMES.TYPE_DESCRIPTOR_OF:
      return transformTypeDescriptorOfMacro(sourceFile, ts, typeChecker, ctx, callNode);
    case RAW_TS_MACRO_NAMES.SIZE_OF:
      return transformSizeOfMacro(sourceFile, ts, typeChecker, ctx, callNode);
    case RAW_TS_MACRO_NAMES.ALIGNMENT_OF:
      return transformAlignmentOfMacro(sourceFile, ts, typeChecker, ctx, callNode);
    case RAW_TS_MACRO_NAMES.OFFSET_OF:
      return transformOffsetOfMacro(sourceFile, ts, typeChecker, ctx, callNode);
    case RAW_TS_MACRO_NAMES.ADDRESS_OF:
      return transformAddressOfMacro(sourceFile, ts, typeChecker, ctx, callNode, visit);
    case RAW_TS_MACRO_NAMES.POINTER_CAST:
    case RAW_TS_MACRO_NAMES.REFERENCE_CAST:
      return ts.visitNode(callNode.arguments[0]!, visit);
  }

  return ts.visitEachChild(callNode, visit, ctx);
}

export { transformMacro };
