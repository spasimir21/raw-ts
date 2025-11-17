import { ProgramOverrideContext, ProgramOverrideFactory } from './ProgramOverrideContext';
import { PluginConfig, ProgramTransformerExtras } from 'ts-patch';
import { getEmitProgramOverride } from './overrides/emit';
import { createObjectWithOverrides } from '../common';
import type ts from 'typescript';

declare module 'typescript' {
  interface Program {
    __isRawTsTransformerLoaded?: boolean;
  }
}

const PROGRAM_OVERRIDE_FACTORIES: ProgramOverrideFactory[] = [getEmitProgramOverride];

function createRawTsProgramTransformer(
  program: ts.Program,
  host: ts.CompilerHost | undefined,
  _options: PluginConfig,
  { ts }: ProgramTransformerExtras
): ts.Program {
  if (program.__isRawTsTransformerLoaded === true) return program;

  const overrideCtx: ProgramOverrideContext = {
    host,
    ts
  };

  const newProgram = createObjectWithOverrides(
    program,
    PROGRAM_OVERRIDE_FACTORIES.map(factory => factory(overrideCtx))
  );

  newProgram.__isRawTsTransformerLoaded = true;

  return newProgram;
}

export default createRawTsProgramTransformer;
