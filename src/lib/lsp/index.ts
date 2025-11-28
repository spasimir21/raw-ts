import { getEncodedSemanticClassificationsLSOverride } from './overrides/getEncodedSemanticClassifications';
import { getCompletionEntryDetailsLSOverride } from './overrides/getCompletionEntryDetails';
import { getCompletionsAtPositionLSOverride } from './overrides/getCompletionsAtPosition';
import { getQuickInfoAtPositionLSOverride } from './overrides/getQuickInfoAtPosition';
import { getSemanticDiagnosticsLSOverride } from './overrides/getSemanticDiagnostics';
import { getCodeFixesAtPositionLSOverride } from './overrides/getCodeFixesAtPosition';
import { getSupportedCodeFixesLSOverride } from './overrides/getSupportedCodeFixes';
import { RAW_TS_CACHE_CLEANUP_INTERVAL_MS, RAW_TS_LOG_ID } from '../constants';
import { LSOverrideContext, LSOverrideFactory } from './LSOverrideContext';
import { createObjectWithOverrides } from '../utils/override';
import { CODE_FIX_DEFINITIONS } from './codeFixes';
import { createWorkCache } from './workCache';
import type TS from 'typescript';

declare module 'typescript' {
  interface LanguageService {
    __isRawTsLSPLoaded?: boolean;
  }
}

const LS_OVERRIDE_FACTORIES: LSOverrideFactory[] = [
  getEncodedSemanticClassificationsLSOverride,
  getQuickInfoAtPositionLSOverride,
  getSemanticDiagnosticsLSOverride,
  getCodeFixesAtPositionLSOverride,
  getSupportedCodeFixesLSOverride,
  getCompletionsAtPositionLSOverride,
  getCompletionEntryDetailsLSOverride
];

function createRawTsLSPlugin({
  typescript: ts
}: {
  typescript: typeof TS;
}): TS.server.PluginModule {
  return {
    create: ({ languageService, languageServiceHost, project, serverHost, session }) => {
      if (languageService.__isRawTsLSPLoaded === true) return languageService;

      const overrideCtx: LSOverrideContext = {
        host: languageServiceHost,
        project,
        serverHost,
        session,
        ts,
        log: message => project.log(`[${RAW_TS_LOG_ID}] ${message}`),
        cache: createWorkCache({
          host: languageServiceHost,
          cleanupIntervalMs: RAW_TS_CACHE_CLEANUP_INTERVAL_MS
        })
      };

      // Typescript's source code is absolute hell, so we have to do this hack in order to register new quick fixes for custom diagnostics
      // I found this by complete accident when looking at the Effect LSP code a day prior to implementing this, so thank you 🙏 (https://github.com/Effect-TS/language-service/blob/main/src/index.ts#L39)
      // Also if your quick fixes aren't getting updated, do a full "Reload Window", not just a "Restart TS Server", because the former doesn't load them for some reason 🙃
      try {
        (ts as any).codefix.registerCodeFix({
          errorCodes: CODE_FIX_DEFINITIONS.map(fix => fix.errorCode),
          getCodeActions: () => []
        });
      } catch {}

      const newLanguageService = createObjectWithOverrides(
        languageService,
        LS_OVERRIDE_FACTORIES.map(factory => factory(overrideCtx))
      );

      newLanguageService.__isRawTsLSPLoaded = true;

      return newLanguageService;
    }
  };
}

export = createRawTsLSPlugin;
