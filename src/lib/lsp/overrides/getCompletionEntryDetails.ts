import { LSOverrideFactory } from '../LSOverrideContext';
import { DISABLE_RAW_TS_PRAGMA } from '../../common';

const getCompletionEntryDetailsLSOverride: LSOverrideFactory<'getCompletionEntryDetails'> = ({
  ts
}) => ({
  key: 'getCompletionEntryDetails',
  getOverride:
    languageService =>
    (fileName, position, entryName, formatOptions, source, preferences, data) => {
      const details = languageService.getCompletionEntryDetails(
        fileName,
        position,
        entryName,
        formatOptions,
        source,
        preferences,
        data
      );

      if (entryName === DISABLE_RAW_TS_PRAGMA)
        return {
          name: entryName,
          kind: ts.ScriptElementKind.unknown,
          kindModifiers: '',
          displayParts: [
            {
              text: 'Disables raw-ts compilation and validation for the file.',
              kind: 'text'
            }
          ]
        };

      return details;
    }
});

export { getCompletionEntryDetailsLSOverride };
