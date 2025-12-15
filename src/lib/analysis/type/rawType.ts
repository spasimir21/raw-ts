import { RAW_TYPE_INFO_PROPERTY_NAME } from '../../constants';
import { RawTypeDescriptor } from '../../types';
import type TS from 'typescript';

type RawTypeAnalysisResult =
  | {
      type: 'success';
      descriptor: RawTypeDescriptor;
    }
  | {
      type: 'error';
      message: string;
      code: number;
    };

function cacheRawTypeAnalysisResult(
  sourceFile: TS.SourceFile,
  typeId: number,
  analysisResult: RawTypeAnalysisResult
) {
  if ((sourceFile as any).rawAnalysisResultCache == null)
    (sourceFile as any).rawAnalysisResultCache = new Map<number, RawTypeAnalysisResult>();
  (sourceFile as any).rawAnalysisResultCache.set(typeId, analysisResult);
}

function getCachedRawTypeAnalysisResult(
  sourceFile: TS.SourceFile,
  typeId: number
): RawTypeAnalysisResult | null {
  return (sourceFile as any).rawAnalysisResultCache?.get(typeId) ?? null;
}

const isRawType = (sourceFile: TS.SourceFile, type: TS.Type) =>
  getCachedRawTypeAnalysisResult(sourceFile, type.id) != null ||
  type.getProperty(RAW_TYPE_INFO_PROPERTY_NAME) != null;

function analyzeRawType(
  sourceFile: TS.SourceFile,
  typeChecker: TS.TypeChecker,
  type: TS.Type,
  circularDescriptors: Map<number, RawTypeDescriptor>
): RawTypeAnalysisResult | null {
  const cachedResult = getCachedRawTypeAnalysisResult(sourceFile, type.id);
  if (cachedResult) return cachedResult;

  const info = type.getProperty(RAW_TYPE_INFO_PROPERTY_NAME);
  if (info == null) return null;

  const result: RawTypeAnalysisResult = {} as any;
  cacheRawTypeAnalysisResult(sourceFile, type.id, result);

  return result;
}

export { RawTypeAnalysisResult, isRawType, analyzeRawType };
