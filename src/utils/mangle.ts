import type { TransformerExtras, PluginConfig } from 'ts-patch';
import ts from 'typescript';

declare module 'typescript' {
  interface Symbol {
    id: number;
  }

  interface Type {
    id: number;
    members: Map<string, ts.Symbol>;
  }
}

const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateMangledName(index: number): string {
  if (index < charset.length) return charset.charAt(index);
  return (
    charset.charAt(Math.floor(index / charset.length) - 1) + charset.charAt(index % charset.length)
  );
}

const $MANGLED_PROPS_MAP = new Map<number, Map<string, string>>();

function transformFile(
  sourceFile: ts.SourceFile,
  ts: TransformerExtras['ts'],
  program: ts.Program,
  factory: ts.NodeFactory,
  ctx: ts.TransformationContext
) {
  const typeChecker = program.getTypeChecker();

  const visitAll = <T extends ts.Node>(node: T): T => ts.visitEachChild(node, visitNode, ctx);

  function visitNode(node: ts.Node): ts.Node {
    if (ts.isClassDeclaration(node)) {
      const trivia = node.getFullText().slice(0, node.getLeadingTriviaWidth());
      if (!trivia.includes('@mangle') || node.name == null) return visitAll(node);

      const exclude = (trivia.match(/!exclude([^*]*)/)?.[1] ?? '')
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const only = (trivia.match(/!only([^*]*)/)?.[1] ?? '')
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const type = typeChecker.getTypeAtLocation(node.name);

      const nameMap = new Map<string, string>();

      let index = 0;
      for (const name of type.members.keys()) {
        if ((only.length > 0 && !only.includes(name)) || exclude.includes(name)) continue;
        nameMap.set(name, generateMangledName(index));
        index++;
      }

      $MANGLED_PROPS_MAP.set(type.symbol?.id ?? type.id, nameMap);

      return factory.createClassDeclaration(
        node.modifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        node.members.map(node => {
          if (ts.isPropertyDeclaration(node))
            node = factory.createPropertyDeclaration(
              node.modifiers,
              nameMap.get(node.name.getText()) ?? node.name,
              node.questionToken ?? node.exclamationToken,
              node.type,
              node.initializer
            );

          if (ts.isMethodDeclaration(node))
            node = factory.createMethodDeclaration(
              node.modifiers,
              node.asteriskToken,
              nameMap.get(node.name.getText()) ?? node.name,
              node.questionToken,
              node.typeParameters,
              node.parameters,
              node.type,
              node.body
            );

          if (ts.isGetAccessorDeclaration(node))
            node = factory.createGetAccessorDeclaration(
              node.modifiers,
              nameMap.get(node.name.getText()) ?? node.name,
              node.parameters,
              node.type,
              node.body
            );

          if (ts.isSetAccessorDeclaration(node))
            node = factory.createSetAccessorDeclaration(
              node.modifiers,
              nameMap.get(node.name.getText()) ?? node.name,
              node.parameters,
              node.body
            );

          if (ts.isConstructorDeclaration(node)) {
            const parameterRenameMap = new Map<ts.ParameterDeclaration, string>();

            const parameters = node.parameters.map(parameter => {
              if (!parameter.modifiers || parameter.modifiers.length === 0) return parameter;

              const newName = nameMap.get(parameter.name.getText());
              if (newName == null) return parameter;

              parameterRenameMap.set(parameter, newName);

              return factory.createParameterDeclaration(
                parameter.modifiers,
                parameter.dotDotDotToken,
                newName,
                parameter.questionToken,
                parameter.type,
                parameter.initializer
              );
            });

            function walkConstructor(node: ts.Node) {
              if (ts.isIdentifier(node)) {
                const symbol = typeChecker.getSymbolAtLocation(node)!;

                const p = symbol.declarations!.find(d => parameterRenameMap.has(d as any));
                if (p == null) return ts.visitEachChild(node, walkConstructor, ctx);

                return factory.createIdentifier(parameterRenameMap.get(p as any)!);
              }

              return ts.visitEachChild(node, walkConstructor, ctx);
            }

            node = factory.createConstructorDeclaration(
              node.modifiers,
              parameters,
              node.body && ts.visitEachChild(node.body, walkConstructor, ctx)
            );
          }

          return visitAll(node);
        })
      );
    }

    if (ts.isPropertyAccessExpression(node)) {
      const type = typeChecker.getTypeAtLocation(node.expression);

      const nameMap = $MANGLED_PROPS_MAP.get(type.symbol?.id ?? type.id);
      if (nameMap == null) return visitAll(node);

      return factory.createPropertyAccessExpression(
        node.expression,
        nameMap.get(node.name.getText()) ?? node.name
      );
    }

    return visitAll(node);
  }

  return ts.visitNode(sourceFile, visitNode);
}

export default (program: ts.Program, _pluginConfig: PluginConfig, { ts }: TransformerExtras) =>
  (ctx: ts.TransformationContext) =>
  (sourceFile: ts.SourceFile) =>
    transformFile(sourceFile, ts, program, ctx.factory, ctx);
