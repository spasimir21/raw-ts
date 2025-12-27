import { RawTypeAnalysis } from './analysis';
import type TS from 'typescript';

declare module 'typescript' {
  interface SourceFile {
    rawTypeAnalysisCache?: Map<number, RawTypeAnalysis>;
  }
}

function cacheRawTypeAnalysis(
  sourceFile: TS.SourceFile,
  typeId: number,
  analysisResult: RawTypeAnalysis
) {
  if (sourceFile.rawTypeAnalysisCache == null)
    sourceFile.rawTypeAnalysisCache = new Map<number, RawTypeAnalysis>();
  sourceFile.rawTypeAnalysisCache.set(typeId, analysisResult);
}

function getCachedRawTypeAnalysis(
  sourceFile: TS.SourceFile,
  typeId: number
): RawTypeAnalysis | null {
  return sourceFile.rawTypeAnalysisCache?.get(typeId) ?? null;
}

export { cacheRawTypeAnalysis, getCachedRawTypeAnalysis };
