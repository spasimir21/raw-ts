interface MemoryConfig {
  initialRawMemorySize: number;
  rawMemoryScaleFactor: number;

  initialJsValueMemorySize: number;
  jsValueMemoryScaleFactor: number;
}

let MEMORY_CONFIG: MemoryConfig = Object.freeze({
  initialRawMemorySize: 1024 * 1024, // 1mb
  rawMemoryScaleFactor: 2,
  initialJsValueMemorySize: 128,
  jsValueMemoryScaleFactor: 2
});

let IS_MEMORY_INITIALIZED = false;

function configureMemory(overrides: Partial<MemoryConfig>) {
  MEMORY_CONFIG = Object.freeze({ ...MEMORY_CONFIG, ...overrides });
}

function initializeMemory(overrides?: Partial<MemoryConfig>) {
  if (IS_MEMORY_INITIALIZED) {
    console.warn('Memory was already initialized!');
    return;
  }

  IS_MEMORY_INITIALIZED = true;

  if (overrides) configureMemory(overrides);

  resizeRawMemory(MEMORY_CONFIG.initialRawMemorySize);
  resizeJSValueMemory(MEMORY_CONFIG.initialJsValueMemorySize);
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

const M_JS: any[] = [];

function resizeRawMemory(newSize?: number) {
  M.resize(newSize ?? Math.floor(M.byteLength * MEMORY_CONFIG.rawMemoryScaleFactor));

  console.log(`Raw memory resized to ${M.byteLength} bytes.`);
}

function resizeJSValueMemory(newSize?: number) {
  M_JS.length = newSize ?? Math.floor(M_JS.length * MEMORY_CONFIG.jsValueMemoryScaleFactor);

  console.log(`JS value memory resized to ${M_JS.length} entries.`);
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
  resizeRawMemory,
  resizeJSValueMemory
};
