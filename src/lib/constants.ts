import { generateErrorCodes } from './utils/errorCodes';

const RAW_TS_IMPORT_PATH = './lib'; // TODO: Use real raw-ts import path

const RAW_TS_DIAGNOSTIC_CODES = generateErrorCodes(69420, [
  'MISSING_USE_RAW_DIRECTIVE',
  'CONFLICTING_DIRECTIVE_AND_PRAGMA',
  'NOT_A_RAW_TYPE',
  'INVALID_RAW_TYPE',
  'SELF_REFERENTIAL_RAW_TYPE',
  'INVALID_MACRO_CALL'
]);

const DISABLE_RAW_TS_PRAGMA = '@disable-raw';
const USE_RAW_TS_DIRECTIVE = 'use raw';

const USE_RAW_TS_EXPORT_SYMBOL = '__USE_RAW$$';

const RAW_TS_LOG_ID = 'raw-ts';
const RAW_TS_CACHE_CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const RAW_TYPE_INFO_PROPERTY_NAME = 'z__RAW_TYPE_INFO$$';

const RAW_TS_MACRO_NAMES = {
  TYPE_DESCRIPTOR_OF: 'typeDescriptorOf$',
  SIZE_OF: 'sizeOf$',
  ALIGNMENT_OF: 'alignmentOf$',
  OFFSET_OF: 'offsetOf$',
  POINTER_CAST: 'pointerCast$',
  REFERENCE_CAST: 'referenceCast$',
  ADDRESS_OF: 'addressOf$'
};

const RAW_TS_MACROS_NAME_SET = new Set(Object.values(RAW_TS_MACRO_NAMES));

export {
  RAW_TS_IMPORT_PATH,
  RAW_TS_DIAGNOSTIC_CODES,
  DISABLE_RAW_TS_PRAGMA,
  USE_RAW_TS_DIRECTIVE,
  USE_RAW_TS_EXPORT_SYMBOL,
  RAW_TS_LOG_ID,
  RAW_TS_CACHE_CLEANUP_INTERVAL_MS,
  RAW_TYPE_INFO_PROPERTY_NAME,
  RAW_TS_MACRO_NAMES,
  RAW_TS_MACROS_NAME_SET
};
