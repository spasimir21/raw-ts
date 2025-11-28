import { LSOverrideFactory } from '../LSOverrideContext';
import { DISABLE_RAW_TS_PRAGMA } from '../../constants';

const getCompletionsAtPositionLSOverride: LSOverrideFactory<'getCompletionsAtPosition'> = ({
  ts
}) => ({
  key: 'getCompletionsAtPosition',
  getOverride: languageService => (fileName, position, options, formattingSettings) => {
    const completions = languageService.getCompletionsAtPosition(
      fileName,
      position,
      options,
      formattingSettings
    );

    const file = languageService.getProgram()?.getSourceFile(fileName);
    if (
      file == null ||
      position > file.getLeadingTriviaWidth() ||
      options?.triggerCharacter !== '@'
    )
      return completions;

    languageService.getCompletionEntryDetails;

    return {
      ...(completions ?? {}),
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries: [
        ...(completions?.entries ?? []),
        {
          name: DISABLE_RAW_TS_PRAGMA,
          kind: ts.ScriptElementKind.unknown,
          insertText: DISABLE_RAW_TS_PRAGMA.slice(1),
          sortText: '0',
          labelDetails: {
            description: 'pragma'
          }
        }
      ]
    };
  }
});

export { getCompletionsAtPositionLSOverride };
