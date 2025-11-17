import { getUseRawDirectiveFromFile } from '../../analysis';
import { USE_RAW_TS_EXPORT_SYMBOL } from '../../common';
import type TS from 'typescript';

function transformRawTsDeclarationFile(
  sourceFileOrBundle: TS.SourceFile | TS.Bundle,
  ts: typeof TS,
  program: TS.Program,
  { factory }: TS.TransformationContext
): TS.SourceFile | TS.Bundle {
  const updateSourceFile = (sourceFile: TS.SourceFile) => {
    const nonDeclarationFile = program.getSourceFile(sourceFile.fileName);

    const directive = getUseRawDirectiveFromFile(ts, nonDeclarationFile ?? sourceFile);
    if (directive == null) return sourceFile;

    return factory.updateSourceFile(
      sourceFile,
      [
        factory.createVariableStatement(
          [
            factory.createToken(ts.SyntaxKind.ExportKeyword),
            factory.createToken(ts.SyntaxKind.DeclareKeyword)
          ],
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                factory.createIdentifier(USE_RAW_TS_EXPORT_SYMBOL),
                undefined,
                factory.createLiteralTypeNode(factory.createTrue()),
                undefined
              )
            ],
            ts.NodeFlags.Const
          )
        ),
        ...sourceFile.statements
      ],
      sourceFile.isDeclarationFile,
      sourceFile.referencedFiles,
      sourceFile.typeReferenceDirectives,
      sourceFile.hasNoDefaultLib,
      sourceFile.libReferenceDirectives
    );
  };

  return ts.isSourceFile(sourceFileOrBundle)
    ? updateSourceFile(sourceFileOrBundle)
    : factory.updateBundle(
        sourceFileOrBundle,
        sourceFileOrBundle.sourceFiles.map(updateSourceFile)
      );
}

const createRawTsDeclarationTransformer =
  (ts: typeof TS, program: TS.Program) =>
  (ctx: TS.TransformationContext) =>
  (sourceFileOrBundle: TS.SourceFile | TS.Bundle) =>
    transformRawTsDeclarationFile(sourceFileOrBundle, ts, program, ctx);

export { createRawTsDeclarationTransformer };
