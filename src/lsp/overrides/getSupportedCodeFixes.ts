import { LSOverrideFactory } from '../LSOverrideContext';
import { CODE_FIX_DEFINITIONS } from '../codeFixes';

const getSupportedCodeFixesLSOverride: LSOverrideFactory<'getSupportedCodeFixes'> = () => ({
  key: 'getSupportedCodeFixes',
  getOverride: languageService => fileName =>
    [
      ...languageService.getSupportedCodeFixes(fileName),
      ...CODE_FIX_DEFINITIONS.map(fix => fix.fixName)
    ]
});

export { getSupportedCodeFixesLSOverride };
