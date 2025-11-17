import { RAW_TS_IMPORT_PATH, RAW_TS_DIAGNOSTIC_CODES, USE_RAW_TS_DIRECTIVE } from '../../common';
import { getUseRawDirectiveFromFile } from '../useRawDirective';
import { isRawType } from '../type/rawType';
import type TS from 'typescript';

function getNoUseRawDiagnostic(
  ts: typeof TS,
  typeChecker: TS.TypeChecker,
  sourceFile: TS.SourceFile
): TS.Diagnostic | null {
  for (const statement of sourceFile.statements) {
    if (
      (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) ||
      statement.moduleSpecifier == null
    )
      continue;

    const isExport = ts.isExportDeclaration(statement);

    if (
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith(RAW_TS_IMPORT_PATH)
    )
      return {
        category: ts.DiagnosticCategory.Warning,
        code: RAW_TS_DIAGNOSTIC_CODES.MISSING_USE_RAW_DIRECTIVE,
        file: sourceFile,
        start: statement.moduleSpecifier.getStart(),
        length: statement.moduleSpecifier.getWidth(),
        // prettier-ignore
        messageText: `This file ${isExport ? 'exports' : 'imports'} raw-ts, yet lacks a "${USE_RAW_TS_DIRECTIVE}" directive. Did you forget to add one?`
      };

    const moduleSymbol = typeChecker.getSymbolAtLocation(statement.moduleSpecifier);
    if (moduleSymbol == null) continue;

    const targetFile = moduleSymbol.valueDeclaration ?? moduleSymbol.declarations?.[0];
    if (
      targetFile == null ||
      !ts.isSourceFile(targetFile) ||
      !getUseRawDirectiveFromFile(ts, targetFile)
    )
      continue;

    const namedImportsOrExports =
      (statement as TS.ImportDeclaration).importClause?.namedBindings ??
      (statement as TS.ExportDeclaration).exportClause;

    if (
      namedImportsOrExports == null ||
      ts.isNamespaceImport(namedImportsOrExports) ||
      ts.isNamespaceExport(namedImportsOrExports)
    )
      return {
        category: ts.DiagnosticCategory.Warning,
        code: RAW_TS_DIAGNOSTIC_CODES.MISSING_USE_RAW_DIRECTIVE,
        file: sourceFile,
        start: statement.getStart(),
        length: statement.getWidth(),
        // prettier-ignore
        messageText: `This file might be ${isExport ? 'exporting' : 'importing'} raw types, yet lacks a "${USE_RAW_TS_DIRECTIVE}" directive. Did you forget to add one?`
      };

    for (const element of namedImportsOrExports.elements) {
      const name = element.propertyName ?? element.name;

      let importedSymbol = typeChecker.getSymbolAtLocation(name);
      if (importedSymbol == null) continue;

      importedSymbol = typeChecker.getAliasedSymbol(importedSymbol) ?? importedSymbol;

      if (
        isRawType(typeChecker.getDeclaredTypeOfSymbol(importedSymbol)) ||
        isRawType(typeChecker.getTypeOfSymbol(importedSymbol))
      )
        return {
          category: ts.DiagnosticCategory.Warning,
          code: RAW_TS_DIAGNOSTIC_CODES.MISSING_USE_RAW_DIRECTIVE,
          file: sourceFile,
          start: name.getStart(),
          length: name.getWidth(),
          // prettier-ignore
          messageText: `This file ${isExport ? 'exports' : 'imports'} a raw type, yet lacks a "${USE_RAW_TS_DIRECTIVE}" directive. Did you forget to add one?`
        };
    }
  }

  return null;
}

export { getNoUseRawDiagnostic };
