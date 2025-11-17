import { DISABLE_RAW_TS_PRAGMA, USE_RAW_TS_DIRECTIVE } from '../../common';
import { getDisableRawPragmaSpanFromFile } from '../../analysis';
import { LSOverrideFactory } from '../LSOverrideContext';
import { getNodeAtPosition } from '../getNodeAtPosition';
import { CACHE_KEYS } from '../cacheKeys';

const getQuickInfoAtPositionLSOverride: LSOverrideFactory<'getQuickInfoAtPosition'> = ({
  ts,
  cache
}) => ({
  key: 'getQuickInfoAtPosition',
  getOverride: languageService => (fileName, position, maximumLength) => {
    const quickInfo = languageService.getQuickInfoAtPosition(fileName, position, maximumLength);

    const file = languageService.getProgram()?.getSourceFile(fileName);
    if (file == null) return quickInfo;

    if (position <= file.getLeadingTriviaWidth()) {
      // prettier-ignore
      const disableRawPragmaSpan = cache.get(CACHE_KEYS.PRAGMA_SPAN, fileName, () => getDisableRawPragmaSpanFromFile(file));

      if (
        disableRawPragmaSpan == null ||
        position < disableRawPragmaSpan.start ||
        position > disableRawPragmaSpan.start + disableRawPragmaSpan.length
      )
        return quickInfo;

      return {
        kind: ts.ScriptElementKind.string,
        kindModifiers: ts.ScriptElementKindModifier.none,
        textSpan: disableRawPragmaSpan,
        displayParts: [
          {
            text: `(pragma) ${DISABLE_RAW_TS_PRAGMA}`,
            kind: 'text'
          }
        ],
        documentation: [
          {
            text: 'Disables **raw-ts** _compilation_ and _validation_ for the file.',
            kind: 'text'
          }
        ]
      };
    }

    const node = getNodeAtPosition(ts, file, position);
    if (node == null) return quickInfo;

    if (
      ts.isStringLiteral(node) &&
      node.text === USE_RAW_TS_DIRECTIVE &&
      file.statements[0] === node.parent
    )
      return {
        kind: ts.ScriptElementKind.string,
        kindModifiers: ts.ScriptElementKindModifier.none,
        textSpan: {
          start: node.getStart(),
          length: node.getWidth()
        },
        displayParts: [
          {
            text: `(directive) "${USE_RAW_TS_DIRECTIVE}"`,
            kind: 'text'
          }
        ],
        documentation: [
          {
            text: 'Enables **raw-ts** _compilation_ and _validation_ for the file.',
            kind: 'text'
          }
        ]
      };

    return quickInfo;
  }
});

export { getQuickInfoAtPositionLSOverride };
