import { getDisableRawPragmaSpanFromFile } from '../../analysis';
import { LSOverrideFactory } from '../LSOverrideContext';
import { CACHE_KEYS } from '../cacheKeys';

const getEncodedSemanticClassificationsLSOverride: LSOverrideFactory<
  'getEncodedSemanticClassifications'
> = ({ ts, cache }) => ({
  key: 'getEncodedSemanticClassifications',
  getOverride: languageService => (fileName, span, format) => {
    const classifications = languageService.getEncodedSemanticClassifications(
      fileName,
      span,
      format
    );

    const file = languageService.getProgram()?.getSourceFile(fileName);
    if (file == null || span.start > file.getLeadingTriviaWidth()) return classifications;

    // prettier-ignore
    const pragmaSpan = cache.get(CACHE_KEYS.PRAGMA_SPAN, fileName, () => getDisableRawPragmaSpanFromFile(file));
    if (
      pragmaSpan != null &&
      pragmaSpan.start >= span.start &&
      pragmaSpan.start + pragmaSpan.length <= span.start + span.length
    ) {
      const semanticClassId =
        format === ts.SemanticClassificationFormat.TwentyTwenty
          ? 11 << 8 // Function name, I think? The 11 comes from an internal TS TokenType enum (https://github.com/microsoft/TypeScript/blob/main/src/services/classifier2020.ts#L55) and the << 8 is some int packing to also include modifier bits (deprecated, static, etc.)
          : ts.ClassificationType.docCommentTagName;

      return {
        spans: [...classifications.spans, pragmaSpan.start, pragmaSpan.length, semanticClassId],
        endOfLineState: classifications.endOfLineState
      };
    }

    return classifications;
  }
});

export { getEncodedSemanticClassificationsLSOverride };
