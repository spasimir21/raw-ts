import { LSOverrideFactory } from '../LSOverrideContext';
import { CODE_FIX_DEFINITIONS } from '../codeFixes';

const getCodeFixesAtPositionLSOverride: LSOverrideFactory<'getCodeFixesAtPosition'> = ({ ts }) => ({
  key: 'getCodeFixesAtPosition',
  getOverride:
    languageService => (fileName, start, end, errorCodes, formatOptions, preferences) => {
      const fixes = languageService.getCodeFixesAtPosition(
        fileName,
        start,
        end,
        errorCodes,
        formatOptions,
        preferences
      );

      const file = languageService.getProgram()?.getSourceFile(fileName);
      if (file == null) return fixes;

      return [
        ...fixes,
        ...CODE_FIX_DEFINITIONS.filter(fix => errorCodes.includes(fix.errorCode)).map(fix => ({
          fixName: fix.fixName,
          description: fix.description,
          changes: [
            {
              fileName,
              textChanges: fix.getTextChanges(ts, file, start, end)
            }
          ]
        }))
      ];
    }
});

export { getCodeFixesAtPositionLSOverride };
