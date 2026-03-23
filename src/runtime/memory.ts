import { __DEV__ } from '../dev';

interface MemoryConfig {
  initialMemorySize: number;
  memoryScaleFactor: number;
}

let MEMORY_CONFIG: MemoryConfig = Object.freeze({
  initialMemorySize: 1024 * 1024, // 1mb
  memoryScaleFactor: 2
});

let IS_MEMORY_INITIALIZED = false;

function configureMemory(overrides: Partial<MemoryConfig>) {
  MEMORY_CONFIG = Object.freeze({ ...MEMORY_CONFIG, ...overrides });
}

function initializeMemory(overrides?: Partial<MemoryConfig>) {
  if (IS_MEMORY_INITIALIZED) {
    console.warn('[RAW-TS] Memory was already initialized!');
    return;
  }

  IS_MEMORY_INITIALIZED = true;

  if (overrides) configureMemory(overrides);

  if (__DEV__) resizeMemory(MEMORY_CONFIG.initialMemorySize);
}

const M = new ArrayBuffer(0, { maxByteLength: 4 * 1024 * 1024 * 1024 /* 4GB */ });

const M_U8 = new Uint8Array(M);
const M_I8 = new Int8Array(M);
const M_U16 = new Uint16Array(M);
const M_I16 = new Int16Array(M);
const M_U32 = new Uint32Array(M);
const M_I32 = new Int32Array(M);
const M_U64 = new BigUint64Array(M);
const M_I64 = new BigInt64Array(M);

let M_F16: Float16Array;
try {
  M_F16 = new Float16Array(M); // Float16Array is still not supported in some environments
} catch {}

const M_F32 = new Float32Array(M);
const M_F64 = new Float64Array(M);

const M_JS: any[] = [null];

function formatByteSize(byteSize: number) {
  if (byteSize < 1024) return `${byteSize} B`;
  byteSize /= 1024;

  if (byteSize < 1024) return `${Number.isInteger(byteSize) ? byteSize : byteSize.toFixed(2)} KB`;
  byteSize /= 1024;

  if (byteSize < 1024) return `${Number.isInteger(byteSize) ? byteSize : byteSize.toFixed(2)} MB`;
  byteSize /= 1024;

  return `${Number.isInteger(byteSize) ? byteSize : byteSize.toFixed(2)} GB`;
}

function resizeMemory(newSize?: number) {
  M.resize(newSize ?? (Math.floor(M.byteLength * MEMORY_CONFIG.memoryScaleFactor) + 7) & ~0b111);

  if (__DEV__) console.log(`[RAW-TS] Memory resized to ${formatByteSize(M.byteLength)}.`);
}

const memset = (start: number, value: number, size: number) => M_U8.fill(value, start, start + size);

const memmove = (dest: number, src: number, size: number) => M_U8.copyWithin(dest, src, src + size);

function memswap(src: number, dest: number, size: number) {
  let temp = 0;
  let a = src;
  let b = dest;

  for (let i = 0; i < size; i++) {
    temp = M_U8[a];
    M_U8[a] = M_U8[b];
    M_U8[b] = temp;

    a++;
    b++;
  }
}

export {
  MemoryConfig,
  MEMORY_CONFIG,
  IS_MEMORY_INITIALIZED,
  configureMemory,
  initializeMemory,
  M,
  M_U8,
  M_I8,
  M_U16,
  M_I16,
  M_U32,
  M_I32,
  M_U64,
  M_I64,
  M_F16,
  M_F32,
  M_F64,
  M_JS,
  resizeMemory,
  memset,
  memmove,
  memswap
};
