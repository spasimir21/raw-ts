import { DISABLE_RAW_TS_PRAGMA, RAW_TS_DIAGNOSTIC_CODES, USE_RAW_TS_DIRECTIVE } from '../constants';
import { getDisableRawPragmaSpanFromFile } from '../analysis/disableRawPragma';
import { getUseRawDirectiveFromFile } from '../analysis/useRawDirective';
import type TS from 'typescript';

type CodeFixDefinition = {
  fixName: string;
  errorCode: number;
  description: string;
  getTextChanges: (
    ts: typeof TS,
    sourceFile: TS.SourceFile,
    start: number,
    end: number
  ) => TS.TextChange[];
};

const CODE_FIX_DEFINITIONS: CodeFixDefinition[] = [
  {
    fixName: 'addUseRawDirective',
    errorCode: RAW_TS_DIAGNOSTIC_CODES.MISSING_USE_RAW_DIRECTIVE,
    description: `Add a "${USE_RAW_TS_DIRECTIVE}" directive to the top of the file`,
    getTextChanges: (_ts, sourceFile) => [
      {
        span: { start: sourceFile.getLeadingTriviaWidth(), length: 0 },
        newText: `"${USE_RAW_TS_DIRECTIVE}";\n\n`
      }
    ]
  },
  {
    fixName: 'addDisableRawPragma',
    errorCode: RAW_TS_DIAGNOSTIC_CODES.MISSING_USE_RAW_DIRECTIVE,
    description: `Add a ${DISABLE_RAW_TS_PRAGMA} pragma to the top of the file`,
    getTextChanges: () => [
      {
        span: { start: 0, length: 0 },
        newText: `/* ${DISABLE_RAW_TS_PRAGMA} */\n\n`
      }
    ]
  },
  {
    fixName: 'removeUseRawDirective',
    errorCode: RAW_TS_DIAGNOSTIC_CODES.CONFLICTING_DIRECTIVE_AND_PRAGMA,
    description: `Remove the "${USE_RAW_TS_DIRECTIVE}" directive`,
    getTextChanges: (ts, sourceFile) => {
      const directiveStatement = getUseRawDirectiveFromFile(ts, sourceFile)!.parent;

      return [
        {
          span: { start: directiveStatement.getStart(), length: directiveStatement.getWidth() },
          newText: ''
        }
      ];
    }
  },
  {
    fixName: 'removeDisableRawPragma',
    errorCode: RAW_TS_DIAGNOSTIC_CODES.CONFLICTING_DIRECTIVE_AND_PRAGMA,
    description: `Remove the ${DISABLE_RAW_TS_PRAGMA} pragma`,
    getTextChanges: (_ts, sourceFile) => [
      {
        span: getDisableRawPragmaSpanFromFile(sourceFile)!,
        newText: ''
      }
    ]
  }
];

export { CodeFixDefinition, CODE_FIX_DEFINITIONS };
