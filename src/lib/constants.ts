const RAW_TS_IMPORT_PATH = './lib'; // TODO: Use real raw-ts import path

const RAW_TS_DIAGNOSTIC_CODES = {
  MISSING_USE_RAW_DIRECTIVE: 69420,
  CONFLICTING_DIRECTIVE_AND_PRAGMA: 69421
} as const;

const DISABLE_RAW_TS_PRAGMA = '@disable-raw';
const USE_RAW_TS_DIRECTIVE = 'use raw';

const USE_RAW_TS_EXPORT_SYMBOL = '__USE_RAW$$';

const RAW_TS_LOG_ID = 'raw-ts';
const RAW_TS_CACHE_CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const RAW_TYPE_INFO_PROPERTY_NAME = 'z__RAW_TYPE_INFO$$';

enum RawTypeKind {
  UInt8,
  Int8,
  UInt16,
  Int16,
  UInt32,
  Int32,
  UInt64,
  Int64,
  Float16,
  Float32,
  Float64,
  Bool,
  Void,
  RawPointer,
  JSPointer,
  Array,
  Union,
  Struct
}

export {
  RAW_TS_IMPORT_PATH,
  RAW_TS_DIAGNOSTIC_CODES,
  DISABLE_RAW_TS_PRAGMA,
  USE_RAW_TS_DIRECTIVE,
  USE_RAW_TS_EXPORT_SYMBOL,
  RAW_TS_LOG_ID,
  RAW_TS_CACHE_CLEANUP_INTERVAL_MS,
  RAW_TYPE_INFO_PROPERTY_NAME,
  RawTypeKind
};
