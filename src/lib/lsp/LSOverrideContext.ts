import { Override } from '../utils/override';
import { WorkCache } from './workCache';
import type TS from 'typescript';

type LSOverrideContext = {
  host: TS.LanguageServiceHost;
  serverHost: TS.server.ServerHost;
  project: TS.server.Project;
  session?: TS.server.Session<unknown> | undefined;
  ts: typeof TS;
  log: (message: string) => void;
  cache: WorkCache;
};

type LSOverrideFactory<K extends keyof TS.LanguageService = keyof TS.LanguageService> = (
  overrideCtx: LSOverrideContext
) => Override<TS.LanguageService, K>;

export { LSOverrideContext, LSOverrideFactory };
