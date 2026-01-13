import { createRawTsDeclarationTransformer } from '../transformer/declarationTransformer';
import { createRawTsTransformer } from '../transformer/transformer';
import { ProgramOverrideFactory } from '../ProgramOverrideContext';
import type TS from 'typescript';

declare module 'typescript' {
  interface SourceFile {
    rawTsDiagnostics?: TS.Diagnostic[];
  }
}

const getEmitProgramOverride: ProgramOverrideFactory<'emit'> = ({ ts }) => ({
  key: 'emit',
  getOverride: program => {
    const rawTsDeclarationTransformer = createRawTsDeclarationTransformer(ts, program);
    const rawTsTransformer = createRawTsTransformer(ts, program.getTypeChecker());

    return (sourceFile, writeFile, ct, emitDtsOnly, transformers) => {
      const result = program.emit(sourceFile, writeFile, ct, emitDtsOnly, {
        before: transformers?.before
          ? [...transformers.before, rawTsTransformer]
          : [rawTsTransformer],
        after: transformers?.after ?? [],
        afterDeclarations: transformers?.afterDeclarations
          ? [...transformers.afterDeclarations, rawTsDeclarationTransformer]
          : [rawTsDeclarationTransformer]
      });

      const files = sourceFile ? [sourceFile] : program.getSourceFiles();
      for (const file of files) {
        if (!file.rawTsDiagnostics || file.rawTsDiagnostics.length === 0) continue;
        (result.diagnostics as TS.Diagnostic[]).push(...file.rawTsDiagnostics);
      }

      return result;
    };
  }
});

export { getEmitProgramOverride };
