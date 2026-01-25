// @raw-ts-runtime-import-path(../runtime)

'use raw';

import { AnyRawType, RawArray, RawPointer, Struct, UInt32, Void } from '../types';
import { addressOf$, offsetOf$, pointerCast$, sizeOf$ } from '../macros';
import { free, malloc, NULL_PTR } from '../runtime';
import {
  FixedSizeAllocator,
  fixedSizeAllocator_alloc,
  fixedSizeAllocator_deinit,
  fixedSizeAllocator_free,
  fixedSizeAllocator_init
} from './fixedSizeAllocator';
import { memset } from '../runtime/memory';

type HashMapEntryHeader = Struct<{
  primaryHash: UInt32;
  secondaryHash: UInt32;
  nextEntry: RawPointer<HashMapEntry>;
  prevEntry: RawPointer<HashMapEntry>;
}>;

type HashMapEntry<T extends AnyRawType = Void> = Struct<{
  header: HashMapEntryHeader;
  data: T;
}>;

type HashMapBucket = RawPointer<HashMapEntry>;

type HashMapBuckets = RawArray<HashMapBucket>;

type HashMap<T extends AnyRawType = Void> = Struct<{
  nBuckets: UInt32;
  buckets: RawPointer<HashMapBuckets>;
  entryAllocator: FixedSizeAllocator<HashMapEntry>;
}> & {
  __rawType: T;
};

const HASH_MAP_SIZE = sizeOf$<HashMap>();

function hashMap_init(
  hashMap: HashMap<AnyRawType>,
  log2NBuckets: number,
  entrySize: number,
  entriesPerPage: number
) {
  if (!Number.isInteger(log2NBuckets) || log2NBuckets < 0 || log2NBuckets > 30)
    throw new Error(`${log2NBuckets} is not a valid value for log2(nBuckets) of hash map!`);

  const nBuckets = 1 << log2NBuckets;

  hashMap.nBuckets = nBuckets as UInt32;
  fixedSizeAllocator_init(hashMap.entryAllocator, sizeOf$<HashMapEntry>() + entrySize, entriesPerPage);

  hashMap.buckets = malloc<HashMapBuckets>(nBuckets * sizeOf$<HashMapBucket>(), true);
}

function hashMap_deinit(hashMap: HashMap<AnyRawType>) {
  hashMap.nBuckets = 0 as UInt32;
  fixedSizeAllocator_deinit(hashMap.entryAllocator);

  free(hashMap.buckets);
  hashMap.buckets = NULL_PTR;
}

function hashMap_getOrInsert_internal(
  hashMap: HashMap<AnyRawType>,
  primaryHash: number,
  secondaryHash: number,
  insertIfNotFound: boolean,
  zeroAllocated: boolean = false
): RawPointer<Void> {
  const bucketIndex = primaryHash & (hashMap.nBuckets - 1);

  let prevEntry: RawPointer<HashMapEntry> = NULL_PTR;
  let nextEntry = hashMap.buckets.value$[bucketIndex];
  while (nextEntry !== NULL_PTR) {
    const nextHeader = nextEntry.value$.header;

    const nextPrimaryHash = nextHeader.primaryHash;
    const nextSecondaryHash = nextHeader.secondaryHash;

    if (nextPrimaryHash === primaryHash && nextSecondaryHash === secondaryHash)
      return addressOf$(nextEntry.value$.data);

    if (
      nextPrimaryHash > primaryHash ||
      (nextPrimaryHash === primaryHash && nextSecondaryHash > secondaryHash)
    )
      break;

    prevEntry = nextEntry;
    nextEntry = nextHeader.nextEntry;
  }

  if (!insertIfNotFound) return NULL_PTR;

  const entry = fixedSizeAllocator_alloc(hashMap.entryAllocator, zeroAllocated).value$;

  entry.header.primaryHash = primaryHash as UInt32;
  entry.header.secondaryHash = secondaryHash as UInt32;
  entry.header.prevEntry = prevEntry;
  entry.header.nextEntry = nextEntry;

  if (nextEntry !== NULL_PTR) nextEntry.value$.header.prevEntry = addressOf$(entry);

  if (prevEntry !== NULL_PTR) prevEntry.value$.header.nextEntry = addressOf$(entry);
  else hashMap.buckets.value$[bucketIndex] = addressOf$(entry);

  return addressOf$(entry.data);
}

const hashMap_get = <T extends AnyRawType>(hashMap: HashMap<T>, primaryHash: number, secondaryHash: number) =>
  hashMap_getOrInsert_internal(hashMap, primaryHash, secondaryHash, false) as RawPointer<T>;

const hashMap_getOrInsert = <T extends AnyRawType>(
  hashMap: HashMap<T>,
  primaryHash: number,
  secondaryHash: number,
  zeroAllocated?: boolean
) => hashMap_getOrInsert_internal(hashMap, primaryHash, secondaryHash, true, zeroAllocated) as RawPointer<T>;

const hashMap_has = (hashMap: HashMap<AnyRawType>, primaryHash: number, secondaryHash: number) =>
  hashMap_getOrInsert_internal(hashMap, primaryHash, secondaryHash, false) !== NULL_PTR;

function hashMap_removeByEntry<T extends AnyRawType>(hashMap: HashMap<T>, entry: RawPointer<T>) {
  const mapEntry = pointerCast$<HashMapEntry>(entry - offsetOf$<HashMapEntry, 'data'>()).value$;
  const header = mapEntry.header;

  if (header.nextEntry !== NULL_PTR) header.nextEntry.value$.header.prevEntry = header.prevEntry;

  if (header.prevEntry !== NULL_PTR) {
    header.prevEntry.value$.header.nextEntry = header.nextEntry;
  } else {
    const bucketIndex: number = header.primaryHash & (hashMap.nBuckets - 1);
    hashMap.buckets.value$[bucketIndex] = header.nextEntry;
  }

  fixedSizeAllocator_free(hashMap.entryAllocator, addressOf$(mapEntry));
}

function hashMap_remove<T extends AnyRawType>(
  hashMap: HashMap<T>,
  primaryHash: number,
  secondaryHash: number
) {
  const entry = hashMap_get(hashMap, primaryHash, secondaryHash);
  if (entry === NULL_PTR) return;

  hashMap_removeByEntry(hashMap, entry);
}

const hashMap_getEntryCount = (hashMap: HashMap<AnyRawType>) => hashMap.entryAllocator.usedEntries;

function hashMap_iter<T extends AnyRawType>(
  typedHashMap: HashMap<T>,
  callback: (entry: RawPointer<T>, bucketIndex: number) => void
) {
  const hashMap = typedHashMap as HashMap;

  const buckets = hashMap.buckets.value$;
  const nBuckets = hashMap.nBuckets;

  for (let i = 0; i < nBuckets; i++) {
    let entry = buckets[i];
    while (entry !== NULL_PTR) {
      const nextEntry = entry.value$.header.nextEntry;
      callback(addressOf$(entry.value$.data) as RawPointer<T>, i);
      entry = nextEntry;
    }
  }
}

function hashMap_clear(hashMap: HashMap<AnyRawType>) {
  const entryAllocator = hashMap.entryAllocator;

  hashMap_iter(hashMap, entryData =>
    fixedSizeAllocator_free(
      entryAllocator,
      pointerCast$<HashMapEntry>(entryData - offsetOf$<HashMapEntry, 'data'>())
    )
  );

  memset(hashMap.buckets, 0, hashMap.nBuckets * sizeOf$<HashMapBucket>());
}

function hashMap_resize(hashMap: HashMap<AnyRawType>, log2NBuckets: number) {
  if (!Number.isInteger(log2NBuckets) || log2NBuckets < 0 || log2NBuckets > 30)
    throw new Error(`${log2NBuckets} is not a valid value for log2(nBuckets) of hash map!`);

  const nBuckets = 1 << log2NBuckets;
  const newBuckets = malloc<HashMapBuckets>(nBuckets * sizeOf$<HashMapBucket>(), true).value$;

  hashMap_iter(hashMap, entryData => {
    const entry = pointerCast$<HashMapEntry>(entryData - offsetOf$<HashMapEntry, 'data'>()).value$;
    const primaryHash = entry.header.primaryHash;
    const secondaryHash = entry.header.secondaryHash;

    const bucketIndex = primaryHash & (nBuckets - 1);

    let prevEntry: RawPointer<HashMapEntry> = NULL_PTR;
    let nextEntry = newBuckets[bucketIndex];
    while (nextEntry !== NULL_PTR) {
      const nextHeader = nextEntry.value$.header;

      const nextPrimaryHash = nextHeader.primaryHash;
      const nextSecondaryHash = nextHeader.secondaryHash;

      if (
        nextPrimaryHash > primaryHash ||
        (nextPrimaryHash === primaryHash && nextSecondaryHash > secondaryHash)
      )
        break;

      prevEntry = nextEntry;
      nextEntry = nextHeader.nextEntry;
    }

    entry.header.prevEntry = prevEntry;
    entry.header.nextEntry = nextEntry;

    if (nextEntry !== NULL_PTR) nextEntry.value$.header.prevEntry = addressOf$(entry);

    if (prevEntry !== NULL_PTR) prevEntry.value$.header.nextEntry = addressOf$(entry);
    else newBuckets[bucketIndex] = addressOf$(entry);
  });

  hashMap.nBuckets = nBuckets as UInt32;

  free(hashMap.buckets);
  hashMap.buckets = addressOf$(newBuckets);
}

interface HashMapBucketLoad {
  nEntries: number;
  nBuckets: number;
  nEmptyBuckets: number;
  minBucketLoad: number;
  maxBucketLoad: number;
  loadStandardDeviation: number;
  meanBucketLoad: number;
  medianBucketLoad: number;
  nBucketsOfLoad: [number, number][];
}

function hashMap_getBucketLoad(hashMap: HashMap<AnyRawType>): HashMapBucketLoad {
  const nEntries = hashMap_getEntryCount(hashMap);
  const nBuckets = hashMap.nBuckets;

  const loadsByBucket = new Array<number>(nBuckets).fill(0);

  hashMap_iter(hashMap, (_, i) => loadsByBucket[i]++);

  const nOfLoad = new Map<number, number>();
  for (const load of loadsByBucket) nOfLoad.set(load, (nOfLoad.get(load) ?? 0) + 1);

  const meanBucketLoad = nEntries / nBuckets;
  let loadStandardDeviation = 0;
  for (let l of loadsByBucket) loadStandardDeviation += (meanBucketLoad - l) ** 2;
  loadStandardDeviation = Math.sqrt(loadStandardDeviation / nBuckets);

  const sortedLoads = [...loadsByBucket].sort((a, b) => a - b);

  return {
    nEntries,
    nBuckets,
    nEmptyBuckets: loadsByBucket.reduce((n, l) => (l === 0 ? n + 1 : n), 0),
    minBucketLoad: loadsByBucket.reduce((min, l) => (l < min ? l : min), Infinity),
    maxBucketLoad: loadsByBucket.reduce((max, l) => (l > max ? l : max), 0),
    loadStandardDeviation,
    meanBucketLoad,
    medianBucketLoad: (sortedLoads[nBuckets / 2 - 1] + sortedLoads[nBuckets / 2]) / 2,
    nBucketsOfLoad: Array.from(nOfLoad.entries())
      .map(([l, n]) => [n, l] as [number, number])
      .sort((a, b) => b[1] - a[1])
  };
}

export {
  HashMap,
  HashMapEntry,
  HashMapEntryHeader,
  HashMapBucket,
  HashMapBuckets,
  HASH_MAP_SIZE,
  hashMap_init,
  hashMap_deinit,
  hashMap_get,
  hashMap_getOrInsert,
  hashMap_has,
  hashMap_removeByEntry,
  hashMap_remove,
  hashMap_getEntryCount,
  hashMap_iter,
  hashMap_clear,
  hashMap_resize,
  HashMapBucketLoad,
  hashMap_getBucketLoad
};
