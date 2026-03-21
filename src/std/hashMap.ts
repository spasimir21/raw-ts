// @raw-ts-runtime-import-path(../runtime)

'use raw';

import {
  Alignment,
  AnyRawType,
  Float32,
  RawArray,
  RawPointer,
  Struct,
  UInt16,
  UInt32,
  UInt8,
  Void
} from '../types';
import { free, malloc, memmove, memset, memswap, NULL_PTR } from '../runtime';
import { addressOf$, pointerCast$, sizeOf$ } from '../macros';

type HashMapEntry = Struct<{
  probingDistance: UInt32;
  primaryHash: UInt32;
  secondaryHash: UInt32;
}>;

type HashMap<T extends AnyRawType = Void> = Struct<{
  log2Capacity: UInt8;
  valueSize: UInt16;
  size: UInt32;
  maxSize: UInt32;
  maxLoadFactor: Float32;
  entries: RawPointer<RawArray<HashMapEntry>>;
  values: RawPointer<Void>;
}> & { _dataType: T };

const HASH_MAP_SIZE = sizeOf$<HashMap>();

function hashMap_init(
  map: HashMap<AnyRawType>,
  log2Capacity: number,
  valueSize: number,
  maxLoadFactor: number
) {
  const capacity = 1 << log2Capacity;

  map.log2Capacity = log2Capacity as UInt8;
  map.valueSize = valueSize as UInt16;
  map.size = 0 as UInt32;
  map.maxSize = Math.ceil(capacity * maxLoadFactor) as UInt32;
  map.maxLoadFactor = maxLoadFactor as Float32;

  map.entries = malloc(sizeOf$<HashMapEntry>() * capacity, true);
  map.values = malloc(valueSize * capacity);
}

function _hashMap_getIndex(map: HashMap<AnyRawType>, primaryHash: number, secondaryHash: number) {
  const capacity = 1 << map.log2Capacity;
  const indexMask = capacity - 1;

  const entries = map.entries.value$;

  let index = primaryHash & indexMask;
  for (let i = 1; i <= capacity; i++) {
    const entry = entries[index];

    if (entry.probingDistance < i) return -1;

    if (entry.primaryHash === primaryHash && entry.secondaryHash === secondaryHash) return index;

    index = (index + 1) & indexMask;
  }

  return -1;
}

function hashMap_remove(map: HashMap<AnyRawType>, primaryHash: number, secondaryHash: number): boolean {
  let index = _hashMap_getIndex(map, primaryHash, secondaryHash);
  if (index === -1) return false;

  const indexMask = (1 << map.log2Capacity) - 1;

  const entries = map.entries.value$;
  const valueSize = map.valueSize;
  const values = map.values;

  let entry = entries[index];
  while (true) {
    const nextIndex = (index + 1) & indexMask;
    const nextEntry = entries[nextIndex];

    if (nextEntry.probingDistance <= 1) break;

    memmove(addressOf$(entry), addressOf$(nextEntry), sizeOf$<HashMapEntry>());
    memmove(values + index * valueSize, values + nextIndex * valueSize, valueSize);

    entry.probingDistance--;

    index = nextIndex;
    entry = nextEntry;
  }

  entry.probingDistance = 0 as UInt32;
  map.size--;

  return true;
}

function _hashMap_insert_unsafe(
  map: HashMap<AnyRawType>,
  primaryHash: number,
  secondaryHash: number,
  zeroAllocated: boolean
): RawPointer<Void> {
  if (map.size >= map.maxSize) hashMap_resize(map, map.log2Capacity + 1);

  const capacity = 1 << map.log2Capacity;
  const indexMask = capacity - 1;

  const valueSize = map.valueSize;

  const entries = map.entries.value$;
  const values = map.values;

  let insertedValuePointer: RawPointer<Void> = NULL_PTR;

  let index = primaryHash & indexMask;
  let probingDistance = 1;
  for (let i = 0; i < capacity; i++) {
    const entry = entries[index];
    if (entry.probingDistance < probingDistance) {
      let temp = entry.probingDistance;
      entry.probingDistance = probingDistance as UInt32;
      probingDistance = temp;

      temp = entry.primaryHash;
      entry.primaryHash = primaryHash as UInt32;
      primaryHash = temp;

      temp = entry.secondaryHash;
      entry.secondaryHash = secondaryHash as UInt32;
      secondaryHash = temp;

      if (insertedValuePointer === NULL_PTR)
        insertedValuePointer = pointerCast$<Void>(values + index * valueSize);
      else memswap(insertedValuePointer, values + index * valueSize, valueSize);

      if (probingDistance === 0) break;
    }

    index = (index + 1) & indexMask;
    probingDistance++;
  }

  if (insertedValuePointer !== NULL_PTR) {
    map.size++;
    if (zeroAllocated) memset(insertedValuePointer, 0, valueSize);
  }

  return insertedValuePointer;
}

function hashMap_get<T extends AnyRawType>(
  map: HashMap<T>,
  primaryHash: number,
  secondaryHash: number
): RawPointer<T> {
  const index = _hashMap_getIndex(map, primaryHash, secondaryHash);
  if (index === -1) return NULL_PTR;

  return (map.values + index * map.valueSize) as RawPointer<T>;
}

function hashMap_getOrInsert<T extends AnyRawType>(
  map: HashMap<T>,
  primaryHash: number,
  secondaryHash: number,
  zeroAllocated: boolean = false
): RawPointer<T> {
  const valuePointer = hashMap_get(map, primaryHash, secondaryHash);
  if (valuePointer !== NULL_PTR) return valuePointer;

  return _hashMap_insert_unsafe(map, primaryHash, secondaryHash, zeroAllocated) as RawPointer<T>;
}

function hashMap_insert<T extends AnyRawType>(
  map: HashMap<T>,
  primaryHash: number,
  secondaryHash: number,
  zeroAllocated: boolean = false
): RawPointer<T> {
  const index = _hashMap_getIndex(map, primaryHash, secondaryHash);
  if (index !== -1) return NULL_PTR;

  return _hashMap_insert_unsafe(map, primaryHash, secondaryHash, zeroAllocated) as RawPointer<T>;
}

function hashMap_resize(map: HashMap<AnyRawType>, log2Capacity: number) {
  const newCapacity = 1 << log2Capacity;
  const newMaxSize = Math.ceil(newCapacity * map.maxLoadFactor);

  if (map.size > newMaxSize)
    throw new Error(
      `Cannot shrink hash map with ${map.size} entries from 2^${map.log2Capacity} to 2^${log2Capacity} capacity as it would exceed the maximum load factor of ${map.maxLoadFactor.toFixed(2)}!`
    );

  const oldCapacity = 1 << map.log2Capacity;
  const oldEntries = map.entries.value$;
  const oldValues = map.values;

  const valueSize = map.valueSize;

  map.log2Capacity = log2Capacity as UInt8;
  map.maxSize = newMaxSize as UInt32;
  map.size = 0 as UInt32;
  map.entries = malloc(sizeOf$<HashMapEntry>() * newCapacity, true);
  map.values = malloc(valueSize * newCapacity);

  for (let i = 0; i < oldCapacity; i++) {
    const entry = oldEntries[i];
    if (entry.probingDistance === 0) continue;

    const valuePointer = _hashMap_insert_unsafe(map, entry.primaryHash, entry.secondaryHash, false);
    memmove(valuePointer, oldValues + i * valueSize, valueSize);
  }

  free(addressOf$(oldEntries));
  free(oldValues);
}

function hashMap_iterate<T extends AnyRawType>(
  map: HashMap<T>,
  callback: (value: RawPointer<T>, primaryHash: number, secondaryHash: number) => void
) {
  const capacity = 1 << map.log2Capacity;
  const valueSize = map.valueSize;

  const entries = map.entries.value$;
  const values = map.values;

  for (let i = 0; i < capacity; i++) {
    const entry = entries[i];
    if (entry.probingDistance === 0) continue;

    callback((values + i * valueSize) as RawPointer<T>, entry.primaryHash, entry.secondaryHash);
  }
}

const hashMap_getLoadFactor = (map: HashMap<AnyRawType>) => map.size / (1 << map.log2Capacity);

function hashMap_deinit(map: HashMap<AnyRawType>) {
  free(map.entries);
  free(map.values);

  memset(addressOf$(map), 0, HASH_MAP_SIZE);
}

interface ProbingAnalysis {
  loadFactor: number;
  nEntries: number;
  maxProbingDistance: number;
  meanProbingDistance: number;
  nEntriesOfProbingDistance: [number, number][];
}

function hashMap_analyzeProbing(map: HashMap<AnyRawType>): ProbingAnalysis {
  const capacity = 1 << map.log2Capacity;
  const entries = map.entries.value$;

  const distances: number[] = [];

  for (let i = 0; i < capacity; i++) {
    const entry = entries[i];
    if (entry.probingDistance === 0) continue;
    distances.push(entry.probingDistance);
  }

  const nOfDistance = new Map<number, number>();
  for (const distance of distances) nOfDistance.set(distance, (nOfDistance.get(distance) ?? 0) + 1);

  return {
    loadFactor: hashMap_getLoadFactor(map),
    nEntries: map.size,
    maxProbingDistance: distances.reduce((a, b) => (a > b ? a : b), 0),
    meanProbingDistance: distances.length === 0 ? 0 : distances.reduce((a, b) => a + b, 0) / distances.length,
    nEntriesOfProbingDistance: Array.from(nOfDistance.entries()).sort((a, b) => a[0] - b[0])
  };
}

export {
  HashMap,
  HASH_MAP_SIZE,
  hashMap_init,
  hashMap_remove,
  hashMap_get,
  hashMap_getOrInsert,
  hashMap_insert,
  hashMap_resize,
  hashMap_iterate,
  hashMap_getLoadFactor,
  hashMap_deinit,
  ProbingAnalysis,
  hashMap_analyzeProbing
};
