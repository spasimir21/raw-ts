import { getDisableRawPragmaSpanFromFile } from '../../analysis/disableRawPragma';
import { analyzeRawType, isRawType } from '../../analysis/analysis';
import { LSOverrideFactory } from '../LSOverrideContext';
import { getNodeAtPosition } from '../getNodeAtPosition';
import { CACHE_KEYS } from '../cacheKeys';
import {
  DISABLE_RAW_TS_PRAGMA,
  RAW_TS_MACRO_NAMES,
  RAW_TS_MACROS_NAME_SET,
  USE_RAW_TS_DIRECTIVE
} from '../../constants';
import { RawTypeKind } from '../../types';

const getQuickInfoAtPositionLSOverride: LSOverrideFactory<'getQuickInfoAtPosition'> = ({
  ts,
  cache
}) => ({
  key: 'getQuickInfoAtPosition',
  getOverride: languageService => (fileName, position, maximumLength) => {
    const quickInfo = languageService.getQuickInfoAtPosition(fileName, position, maximumLength);

    const program = languageService.getProgram();
    if (program == null) return quickInfo;

    const typeChecker = program.getTypeChecker();

    const sourceFile = program.getSourceFile(fileName);
    if (sourceFile == null) return quickInfo;

    if (position <= sourceFile.getLeadingTriviaWidth()) {
      // prettier-ignore
      const disableRawPragmaSpan = cache.get(CACHE_KEYS.PRAGMA_SPAN, fileName, () => getDisableRawPragmaSpanFromFile(sourceFile));

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

    const node = getNodeAtPosition(ts, sourceFile, position);
    if (node == null) return quickInfo;

    if (
      ts.isStringLiteral(node) &&
      node.text === USE_RAW_TS_DIRECTIVE &&
      sourceFile.statements[0] === node.parent
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

    if (!quickInfo || !quickInfo.displayParts || !ts.isIdentifier(node)) return quickInfo;

    if (ts.isCallExpression(node.parent) && RAW_TS_MACROS_NAME_SET.has(node.text))
      return {
        ...quickInfo,
        displayParts: quickInfo.displayParts.map(part =>
          part.text === 'alias'
            ? {
                text: 'macro',
                kind: part.kind
              }
            : part
        )
      };

    const type = typeChecker.getTypeAtLocation(node);
    if (isRawType(sourceFile, type)) {
      const analysis = analyzeRawType(ts, sourceFile, typeChecker, type);
      if (analysis.descriptor == null) return quickInfo;

      const descriptor = analysis.descriptor;

      return {
        ...quickInfo,
        displayParts: [
          {
            text: `[Size: ${descriptor.size}${
              descriptor.hasDynamicSize ? ' + dynamic' : ''
            } bytes, Alignment: ${descriptor.alignment}${
              descriptor.kind === RawTypeKind.Struct
                ? `, Padding: ${descriptor.totalPaddingSize} bytes`
                : ''
            }] `,
            kind: 'text'
          },
          ...quickInfo.displayParts
        ]
      };
    }

    return quickInfo;
  }
});

export { getQuickInfoAtPositionLSOverride };
