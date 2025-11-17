import { DISABLE_RAW_TS_PRAGMA } from '../common';
import type TS from 'typescript';

function getDisableRawPragmaSpanFromFile(sourceFile: TS.SourceFile): TS.TextSpan | null {
  const trivia = sourceFile.getFullText().slice(0, sourceFile.getLeadingTriviaWidth());
  const matchIndex = trivia.indexOf(DISABLE_RAW_TS_PRAGMA);
  if (matchIndex === -1) return null;

  return {
    start: matchIndex,
    length: DISABLE_RAW_TS_PRAGMA.length
  };
}

export { getDisableRawPragmaSpanFromFile };
