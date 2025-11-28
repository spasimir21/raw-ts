import { getConflictingDirectiveAndPragmaError } from '../../analysis/diagnostics/getConflictingDirectiveAndPragmaError';
import { getNoUseRawDiagnostic } from '../../analysis/diagnostics/getNoUseRawDiagnostics';
import { getDisableRawPragmaSpanFromFile } from '../../analysis/disableRawPragma';
import { getUseRawDirectiveFromFile } from '../../analysis/useRawDirective';
import { LSOverrideFactory } from '../LSOverrideContext';
import { CACHE_KEYS } from '../cacheKeys';

const getSemanticDiagnosticsLSOverride: LSOverrideFactory<'getSemanticDiagnostics'> = ({
  ts,
  cache,
  log
}) => ({
  key: 'getSemanticDiagnostics',
  getOverride: languageService => fileName => {
    const diagnostics = languageService.getSemanticDiagnostics(fileName);

    const program = languageService.getProgram();
    if (program == null) return diagnostics;

    const file = program.getSourceFile(fileName);
    if (file == null) return diagnostics;

    // prettier-ignore
    const disablePragma = cache.get(CACHE_KEYS.PRAGMA_SPAN, fileName, () => getDisableRawPragmaSpanFromFile(file));
    const useRawDirective = getUseRawDirectiveFromFile(ts, file);

    if (disablePragma != null)
      return useRawDirective
        ? [...diagnostics, getConflictingDirectiveAndPragmaError(ts, file, useRawDirective)]
        : diagnostics;

    if (useRawDirective == null) {
      const startTimeMs = performance.now();
      // prettier-ignore
      const noDirectiveDiagnostic = cache.get(CACHE_KEYS.NO_DIRECTIVE_DIAGNOSTIC, fileName, () => getNoUseRawDiagnostic(ts, program.getTypeChecker(), file));
      const durationMs = performance.now() - startTimeMs;

      if (durationMs >= 3)
        log(`SLOW getNoUseRawDiagnostic!!! ${durationMs.toFixed(2)}ms ${fileName}`);

      return noDirectiveDiagnostic ? [...diagnostics, noDirectiveDiagnostic] : diagnostics;
    }

    return diagnostics;
  }
});

export { getSemanticDiagnosticsLSOverride };
