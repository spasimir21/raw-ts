import { Override } from '../common';
import type TS from 'typescript';

type ProgramOverrideContext = {
  host: TS.CompilerHost | undefined;
  ts: typeof TS;
};

type ProgramOverrideFactory<K extends keyof TS.Program = keyof TS.Program> = (
  overrideCtx: ProgramOverrideContext
) => Override<TS.Program, K>;

export { ProgramOverrideContext, ProgramOverrideFactory };
