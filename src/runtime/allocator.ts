// @raw-ts-runtime-import-path(./memory)

'use raw';

import { RawArray, RawPointer, RawTypeContainer, Struct, UInt32, Union, Void } from '../types';
import { addressOf$, offsetOf$, pointerCast$, sizeOf$ } from '../macros';
import { M, memset, resizeMemory } from './memory';
import { NULL_PTR } from './nullptr';

/*
  Segregated free-list, general-purpose allocator with eager coallescing and 8 byte word size.

  Bucket classes contain 32 buckets each and are defined as follows:
    0. 1 - 32 words
    1. 33 - 64 words
    2. 65 - 128 words
    3. 129 - 256 words
    4. 257 - 512 words
    5. 513 - 1024 words
    6. 1025 - 2048 words
    7. 2049 - 4096 words
    8. 4097 - 8192 words
    9. 8193 - 16384 words
    10. 16385 - 32768 words
    11. 32769 - 65536 words
    12. 65537 - 131072 words
  
  There is also one single extra bucket for > 131073 words (> ~1MB) blocks.

  Each bucket class also has a "filled buckets" UInt32 associated with it where:
    - The most significant bit represents the smallest bucket and the least significant represents the largest bucket in the class
    - A 1 represents a bucket with at least one block and a 0 represents an empty bucket

  The allocator also keeps one "filled bucket classes" UInt32 where:
    - The most significant bit represents the smallest bucket class and each subsequent bit represents the next larger class (including the > 1MB bucket as a seperate class index here)
    - A 1 represents a bucket class with at least one filled bucket and a 0 represents a fully empty bucket class
*/

const N_BUCKET_CLASSES = 13; // Excluding the special > 1MB bucket, as it is only a single bucket, not an entire class
const N_BUCKETS = 417; // N_BUCKET_CLASSES * 32 + 1; the extra bucket is the > 1MB bucket

const LARGEST_BUCKET_CLASS = N_BUCKET_CLASSES;
const LARGEST_BUCKET_INDEX = N_BUCKETS - 1;

const MIN_WORDS_FOR_BLOCK = sizeOf$<Block>() >>> 3;

type BlockHeader = Struct<{
  selfDescriptor: UInt32; // bodyByteSize | (isFree ? 0 : 1)
  prevDescriptor: UInt32;
  _alignment: Void<8, 0>; // Force struct to be 8-byte aligned
}>;

type FreeListElement = Struct<{
  next: RawPointer<Block>;
  prev: RawPointer<Block>;
}>;

type Block = Struct<{
  header: BlockHeader;
  body: Union<{
    data: Void;
    freeListElement: FreeListElement;
  }>;
}>;

type Bucket = Struct<{
  firstFreeBlock: RawPointer<Block>;
  lastFreeBlock: RawPointer<Block>;
}>;

type AllocatorMetadata = Struct<{
  filledBucketClasses: UInt32;
  filledSlotsForClass: RawArray<UInt32, typeof N_BUCKET_CLASSES>;
  buckets: RawArray<Bucket, typeof N_BUCKETS>;
  firstBlock: RawPointer<Block>;
  lastBlock: RawPointer<Block>;
  __alignment: Void<8, 0>; // Force struct to be 8-byte aligned
}>;

let IS_ALLOCATOR_INITIALIZED = false;

const MEMORY_INFO = {
  totalFreeSize: 0,
  get totalMemorySize() {
    return M.byteLength;
  },
  get totalUsedSize() {
    return M.byteLength - this.totalFreeSize;
  },
  get usedRatio() {
    return 1 - this.totalFreeSize / M.byteLength;
  }
};

const metadata = pointerCast$<AllocatorMetadata>(0).value$;

function initializeAllocator() {
  if (IS_ALLOCATOR_INITIALIZED) return;

  if (M.byteLength === 0) throw new Error('The allocator cannot be used before memory is initialized!');

  metadata.firstBlock = pointerCast$<Block>(sizeOf$<AllocatorMetadata>());
  metadata.lastBlock = metadata.firstBlock;

  const firstBlock = metadata.firstBlock.value$;

  // prettier-ignore
  firstBlock.header.selfDescriptor = ((M.byteLength - addressOf$(firstBlock.body)) & ~0b111) as UInt32;
  addBlockToFreeList(firstBlock);

  IS_ALLOCATOR_INITIALIZED = true;
}

function getBucketIndexForWordSize(wordSize: number) {
  const bucketClass = 32 - Math.clz32(((wordSize + 31) >>> 5) - 1);

  if (bucketClass >= LARGEST_BUCKET_CLASS) return LARGEST_BUCKET_INDEX;
  if (bucketClass === 0) return wordSize - 1;

  const bucketClassShift = bucketClass - 1;
  const bucketMinSize = (32 << bucketClassShift) + 1;
  const bucketSlot = (wordSize - bucketMinSize) >>> bucketClassShift;

  return (bucketClass << 5) + bucketSlot;
}

function findFreeBlockForSize(wordSize: number): RawPointer<Block> {
  const idealBucketIndex = getBucketIndexForWordSize(wordSize);

  const idealBucketClass = idealBucketIndex >>> 5;
  const idealBucketSlot = idealBucketIndex & 0b11111;

  if (idealBucketIndex === LARGEST_BUCKET_INDEX)
    return findFreeBlockForSizeInBucket(metadata.buckets[LARGEST_BUCKET_INDEX], wordSize);

  let filledBucketClasses = metadata.filledBucketClasses as number;

  // Ideal bucket class is filled
  if ((filledBucketClasses & (1 << (31 - idealBucketClass))) !== 0) {
    let filledSlots = metadata.filledSlotsForClass[idealBucketClass] as number;

    // Ideal bucket slot is filled
    if ((filledSlots & (1 << (31 - idealBucketSlot))) !== 0) {
      const filledBucket = findFreeBlockForSizeInBucket(metadata.buckets[idealBucketIndex], wordSize);

      if (filledBucket !== NULL_PTR) return filledBucket;
    }

    if (idealBucketSlot < 31) {
      filledSlots = (filledSlots << (idealBucketSlot + 1)) >>> (idealBucketSlot + 1);

      let firstFilledSlot = Math.clz32(filledSlots);
      if (firstFilledSlot < 32)
        return findFreeBlockForSizeInBucket(
          metadata.buckets[(idealBucketClass << 5) + firstFilledSlot],
          wordSize
        );
    }
  }

  filledBucketClasses = (filledBucketClasses << (idealBucketClass + 1)) >>> (idealBucketClass + 1);

  const firstFilledBucketClass = Math.clz32(filledBucketClasses);
  if (firstFilledBucketClass > LARGEST_BUCKET_CLASS) return NULL_PTR as RawPointer<Block>;
  if (firstFilledBucketClass === LARGEST_BUCKET_CLASS)
    return findFreeBlockForSizeInBucket(metadata.buckets[LARGEST_BUCKET_INDEX], wordSize);

  const firstFilledSlot = Math.clz32(metadata.filledSlotsForClass[firstFilledBucketClass]);

  return findFreeBlockForSizeInBucket(
    metadata.buckets[(firstFilledBucketClass << 5) + firstFilledSlot],
    wordSize
  );
}

function findFreeBlockForSizeInBucket(bucket: Bucket, wordSize: number): RawPointer<Block> {
  if (bucket.lastFreeBlock === NULL_PTR || wordSize > bucket.lastFreeBlock.value$.header.selfDescriptor >>> 3)
    return NULL_PTR as RawPointer<Block>;

  let currentBlock = bucket.firstFreeBlock;
  while (currentBlock !== NULL_PTR) {
    if (currentBlock.value$.header.selfDescriptor >>> 3 >= wordSize) break;
    currentBlock = currentBlock.value$.body.freeListElement.next;
  }

  return currentBlock;
}

function addBlockToFreeList(block: Block) {
  MEMORY_INFO.totalFreeSize += block.header.selfDescriptor & ~0b111;

  const wordSize = block.header.selfDescriptor >>> 3;
  const bucketIndex = getBucketIndexForWordSize(wordSize);

  const bucketClass = bucketIndex >>> 5;
  const bucketSlot = bucketIndex & 0b11111;

  if (bucketClass < LARGEST_BUCKET_CLASS) {
    const filledSlotsForClass = addressOf$(metadata.filledSlotsForClass[bucketClass]);
    // prettier-ignore
    filledSlotsForClass.value$ = (filledSlotsForClass.value$ | (1 << (31 - bucketSlot))) as UInt32;
  }

  // prettier-ignore
  metadata.filledBucketClasses = (metadata.filledBucketClasses | (1 << (31 - bucketClass))) as UInt32;

  const freeListElement = block.body.freeListElement;
  const bucket = metadata.buckets[bucketIndex];

  let nextFreeBlock = bucket.firstFreeBlock;
  while (nextFreeBlock !== NULL_PTR) {
    if (nextFreeBlock.value$.header.selfDescriptor >>> 3 >= wordSize) break;
    nextFreeBlock = nextFreeBlock.value$.body.freeListElement.next;
  }

  if (nextFreeBlock === NULL_PTR) {
    freeListElement.next = NULL_PTR as RawPointer<Block>;
    freeListElement.prev = bucket.lastFreeBlock;

    if (bucket.lastFreeBlock !== NULL_PTR)
      bucket.lastFreeBlock.value$.body.freeListElement.next = addressOf$(block);

    bucket.lastFreeBlock = addressOf$(block);
    if (bucket.firstFreeBlock === NULL_PTR) bucket.firstFreeBlock = addressOf$(block);

    return;
  }

  const nextFreeBlockFreeListElement = nextFreeBlock.value$.body.freeListElement;

  if (nextFreeBlockFreeListElement.prev === NULL_PTR) bucket.firstFreeBlock = addressOf$(block);
  else nextFreeBlockFreeListElement.prev.value$.body.freeListElement.next = addressOf$(block);

  freeListElement.next = nextFreeBlock;
  freeListElement.prev = nextFreeBlockFreeListElement.prev;

  nextFreeBlockFreeListElement.prev = addressOf$(block);
}

function removeBlockFromFreeList(block: Block): void {
  MEMORY_INFO.totalFreeSize -= block.header.selfDescriptor & ~0b111;

  const wordSize = block.header.selfDescriptor >>> 3;
  const bucketIndex = getBucketIndexForWordSize(wordSize);

  const bucket = metadata.buckets[bucketIndex];

  const freeListElement = block.body.freeListElement;

  const prevBlock = freeListElement.prev;
  const nextBlock = freeListElement.next;

  if (prevBlock !== NULL_PTR) prevBlock.value$.body.freeListElement.next = nextBlock;
  else bucket.firstFreeBlock = nextBlock;

  if (nextBlock !== NULL_PTR) nextBlock.value$.body.freeListElement.prev = prevBlock;
  else bucket.lastFreeBlock = prevBlock;

  freeListElement.next = NULL_PTR as RawPointer<Block>;
  freeListElement.prev = NULL_PTR as RawPointer<Block>;

  if (prevBlock !== NULL_PTR || nextBlock !== NULL_PTR) return;

  const bucketClass = bucketIndex >>> 5;
  const bucketSlot = bucketIndex & 0b11111;

  const isLastBucket = bucketIndex === LARGEST_BUCKET_INDEX;

  const filledSlots = isLastBucket
    ? (NULL_PTR as RawPointer<UInt32>)
    : addressOf$(metadata.filledSlotsForClass[bucketClass]);

  if (!isLastBucket) filledSlots.value$ = (filledSlots.value$ & ~(1 << (31 - bucketSlot))) as UInt32;

  if (isLastBucket || filledSlots.value$ === 0)
    metadata.filledBucketClasses = (metadata.filledBucketClasses & ~(1 << (31 - bucketClass))) as UInt32;
}

function updateNextBlocksPrevDescriptor(block: Block) {
  if (metadata.lastBlock === addressOf$(block)) return;

  const nextBlock = pointerCast$<Block>(addressOf$(block.body) + (block.header.selfDescriptor & ~0b111));

  nextBlock.value$.header.prevDescriptor = block.header.selfDescriptor;
}

function mergeBlockWithNeighbours(initialBlock: Block): Block {
  const prevBlock =
    metadata.firstBlock === addressOf$(initialBlock) || (initialBlock.header.prevDescriptor & 0b1) === 1
      ? (NULL_PTR as RawPointer<Block>)
      : pointerCast$<Block>(
          addressOf$(initialBlock) -
            (initialBlock.header.prevDescriptor & ~0b111) -
            offsetOf$<Block, 'body'>()
        );

  let nextBlock =
    metadata.lastBlock === addressOf$(initialBlock)
      ? (NULL_PTR as RawPointer<Block>)
      : pointerCast$<Block>(addressOf$(initialBlock.body) + (initialBlock.header.selfDescriptor & ~0b111));

  if (nextBlock !== NULL_PTR && (nextBlock.value$.header.selfDescriptor & 0b1) === 1)
    nextBlock = NULL_PTR as RawPointer<Block>;

  if (nextBlock === NULL_PTR && prevBlock === NULL_PTR) return initialBlock;

  if (prevBlock !== NULL_PTR) removeBlockFromFreeList(prevBlock.value$);
  if (nextBlock !== NULL_PTR) removeBlockFromFreeList(nextBlock.value$);

  const newBlock = prevBlock === NULL_PTR ? initialBlock : prevBlock.value$;
  const finalBlock = nextBlock === NULL_PTR ? initialBlock : nextBlock.value$;

  // prettier-ignore
  newBlock.header.selfDescriptor = (
      addressOf$(finalBlock.body) +
      (finalBlock.header.selfDescriptor & ~0b111) -
      addressOf$(newBlock.body)
    ) as UInt32;

  if (metadata.lastBlock === addressOf$(finalBlock)) metadata.lastBlock = addressOf$(newBlock);

  updateNextBlocksPrevDescriptor(newBlock);

  return newBlock;
}

function splitBlock(block: Block, newWordSize: number) {
  const newByteSize = newWordSize << 3;

  const newBlock = pointerCast$<Block>(addressOf$(block.body) + newByteSize).value$;
  const newBlockBodySize = (block.header.selfDescriptor & ~0b111) - newByteSize - offsetOf$<Block, 'body'>();

  // prettier-ignore
  block.header.selfDescriptor = (newByteSize | (block.header.selfDescriptor & 0b1)) as UInt32;

  newBlock.header.selfDescriptor = newBlockBodySize as UInt32;
  newBlock.header.prevDescriptor = block.header.selfDescriptor;

  if (metadata.lastBlock === addressOf$(block)) metadata.lastBlock = addressOf$(newBlock);

  updateNextBlocksPrevDescriptor(newBlock);

  addBlockToFreeList(newBlock);
}

function expand() {
  resizeMemory();

  const lastBlock = metadata.lastBlock.value$;

  // Last block is free
  if ((lastBlock.header.selfDescriptor & 0b1) === 0) {
    removeBlockFromFreeList(lastBlock);

    // prettier-ignore
    lastBlock.header.selfDescriptor = ((M.byteLength - addressOf$(lastBlock.body)) & ~0b111) as UInt32;

    addBlockToFreeList(lastBlock);
    return;
  }

  const newBlock = pointerCast$<Block>(
    addressOf$(lastBlock.body) + (lastBlock.header.selfDescriptor & ~0b111)
  ).value$;

  // prettier-ignore
  newBlock.header.selfDescriptor = ((M.byteLength - addressOf$(newBlock.body)) & ~0b111) as UInt32;
  newBlock.header.prevDescriptor = lastBlock.header.selfDescriptor;

  metadata.lastBlock = addressOf$(newBlock);

  addBlockToFreeList(newBlock);
}

function validateBlock(block: Block): boolean {
  if (
    addressOf$(block) < metadata.firstBlock ||
    (addressOf$(block) & 0b111) !== 0 ||
    (block.header.selfDescriptor & 0b110) !== 0
  )
    return false;

  if (metadata.firstBlock !== addressOf$(block)) {
    const prevBlock = pointerCast$<Block>(
      addressOf$(block) - (block.header.prevDescriptor & ~0b111) - offsetOf$<Block, 'body'>()
    );

    if (
      prevBlock < metadata.firstBlock ||
      block.header.prevDescriptor !== prevBlock.value$.header.selfDescriptor ||
      (block.header.prevDescriptor & 0b110) !== 0
    )
      return false;
  }

  if (metadata.lastBlock !== addressOf$(block)) {
    const nextBlock = pointerCast$<Block>(addressOf$(block.body) + (block.header.selfDescriptor & ~0b111));

    if (
      M.byteLength - nextBlock < sizeOf$<Block>() ||
      nextBlock.value$.header.prevDescriptor !== block.header.selfDescriptor ||
      (nextBlock.value$.header.selfDescriptor & 0b110) !== 0
    )
      return false;
  }

  return true;
}

function malloc<T extends RawTypeContainer = Void>(
  size: number,
  zeroAllocated: boolean = false
): RawPointer<T> {
  if (typeof size !== 'number' || size <= 0 || !Number.isFinite(size) || !Number.isInteger(size))
    throw new Error(`${size} is not a valid size for malloc!`);

  if (!IS_ALLOCATOR_INITIALIZED) initializeAllocator();
  const wordSize = (size + 7) >>> 3;

  const freeBlockPtr = findFreeBlockForSize(wordSize);
  if (freeBlockPtr === NULL_PTR) {
    expand();
    return malloc(size, zeroAllocated);
  }

  const freeBlock = freeBlockPtr.value$;

  removeBlockFromFreeList(freeBlock);
  freeBlock.header.selfDescriptor = (freeBlock.header.selfDescriptor | 0b1) as UInt32;
  updateNextBlocksPrevDescriptor(freeBlock);

  if ((freeBlock.header.selfDescriptor >>> 3) - wordSize >= MIN_WORDS_FOR_BLOCK)
    splitBlock(freeBlock, wordSize);

  if (zeroAllocated) memset(addressOf$(freeBlock.body), 0, freeBlock.header.selfDescriptor & ~0b111);

  return addressOf$(freeBlock.body) as RawPointer<T>;
}

function mresize(
  pointer: RawPointer<RawTypeContainer>,
  newSize: number,
  zeroAllocated: boolean = true
): boolean {
  if (typeof newSize !== 'number' || newSize <= 0 || !Number.isFinite(newSize) || !Number.isInteger(newSize))
    throw new Error(`${newSize} is not a valid size for mresize!`);

  const block = pointerCast$<Block>(pointer - offsetOf$<Block, 'body'>()).value$;
  if (!validateBlock(block) || (block.header.selfDescriptor & 0b111) !== 1) return false;

  const currentWordSize = block.header.selfDescriptor >>> 3;
  const newWordSize = (newSize + 7) >>> 3;

  if (newWordSize <= currentWordSize) {
    if (currentWordSize - newWordSize >= MIN_WORDS_FOR_BLOCK) splitBlock(block, newWordSize);
    return true;
  }

  if (metadata.lastBlock === addressOf$(block)) {
    expand();
    return mresize(pointer, newSize, zeroAllocated);
  }

  const nextBlock = pointerCast$<Block>(
    addressOf$(block.body) + (block.header.selfDescriptor & ~0b111)
  ).value$;

  const mergedWordSize =
    currentWordSize + (offsetOf$<Block, 'body'>() >>> 3) + (nextBlock.header.selfDescriptor >>> 3);

  if ((nextBlock.header.selfDescriptor & 0b111) !== 0 || mergedWordSize < newWordSize) return false;

  removeBlockFromFreeList(nextBlock);

  block.header.selfDescriptor = ((mergedWordSize << 3) | (block.header.selfDescriptor & 0b1)) as UInt32;

  if (metadata.lastBlock === addressOf$(nextBlock)) metadata.lastBlock = addressOf$(block);

  updateNextBlocksPrevDescriptor(block);

  if (zeroAllocated)
    memset(addressOf$(block.body) + (currentWordSize << 3), 0, (newWordSize - currentWordSize) << 3);

  if (mergedWordSize - newWordSize >= MIN_WORDS_FOR_BLOCK) splitBlock(block, newWordSize);

  return true;
}

function free(pointer: RawPointer<RawTypeContainer>): void {
  const block = pointerCast$<Block>(pointer - offsetOf$<Block, 'body'>()).value$;
  if (!validateBlock(block) || (block.header.selfDescriptor & 0b111) !== 1) return;

  block.header.selfDescriptor = (block.header.selfDescriptor & ~0b1) as UInt32;
  updateNextBlocksPrevDescriptor(block);

  const newBlock = mergeBlockWithNeighbours(block);
  addBlockToFreeList(newBlock);
}

interface BucketClassAnalysis {
  nBuckets: number;
  smallestBucketSize: number;
  largestBucketSize: number;
  bucketSizeStep: number;
  nFreeBlocks: number;
  smallestFreeBlockSize: number;
  largestFreeBlockSize: number;
  averageFreeBlockSize: number;
  totalFreeSize: number;
  isCorrupted: boolean;
}

function getBucketClassAnalysis(bucketClassIndex: number, nBuckets: number) {
  const smallestBucketSize = bucketClassIndex === 0 ? 8 : (256 << (bucketClassIndex - 1)) + 8;
  const largestBucketSize =
    bucketClassIndex === LARGEST_BUCKET_CLASS ? smallestBucketSize : 256 << bucketClassIndex;

  const analysis: BucketClassAnalysis = {
    nBuckets,
    smallestBucketSize,
    largestBucketSize,
    bucketSizeStep:
      bucketClassIndex === LARGEST_BUCKET_CLASS ? 0 : (largestBucketSize - smallestBucketSize + 8) / 32,
    nFreeBlocks: 0,
    smallestFreeBlockSize: Infinity,
    largestFreeBlockSize: 0,
    averageFreeBlockSize: 0,
    totalFreeSize: 0,
    isCorrupted: false
  };

  for (
    let bucketIndex = bucketClassIndex * 32;
    bucketIndex < bucketClassIndex * 32 + nBuckets;
    bucketIndex++
  ) {
    const bucket = metadata.buckets[bucketIndex];

    if (
      (bucket.firstFreeBlock !== NULL_PTR &&
        bucket.firstFreeBlock.value$.body.freeListElement.prev !== NULL_PTR) ||
      (bucket.lastFreeBlock !== NULL_PTR &&
        bucket.lastFreeBlock.value$.body.freeListElement.next !== NULL_PTR)
    ) {
      analysis.isCorrupted = true;
      continue;
    }

    let currentBlock = bucket.firstFreeBlock;
    while (currentBlock !== NULL_PTR) {
      if ((currentBlock.value$.header.selfDescriptor & 0b111) !== 0) {
        analysis.isCorrupted = true;
        break;
      }

      analysis.nFreeBlocks++;
      const blockSize = currentBlock.value$.header.selfDescriptor & ~0b111;

      if (blockSize > analysis.largestFreeBlockSize) analysis.largestFreeBlockSize = blockSize;
      if (blockSize < analysis.smallestFreeBlockSize) analysis.smallestFreeBlockSize = blockSize;
      analysis.totalFreeSize += blockSize;

      const newBlock = currentBlock.value$.body.freeListElement.next;
      if (newBlock === NULL_PTR) break;

      if (
        currentBlock.value$.header.selfDescriptor > newBlock.value$.header.selfDescriptor ||
        newBlock.value$.body.freeListElement.prev !== currentBlock
      ) {
        analysis.isCorrupted = true;
        break;
      }

      currentBlock = newBlock;
    }

    if (currentBlock !== bucket.lastFreeBlock) analysis.isCorrupted = true;
  }

  if (analysis.nFreeBlocks > 0) analysis.averageFreeBlockSize = analysis.totalFreeSize / analysis.nFreeBlocks;
  else analysis.smallestFreeBlockSize = 0;

  return analysis;
}

interface MemoryAnalysis {
  totalMemorySize: number;
  totalFreeSize: number;
  totalUsedSize: number;
  usedRatio: number;
  bucketClasses: BucketClassAnalysis[];
  isCorrupted: boolean;
}

function getMemoryAnalysis(): MemoryAnalysis {
  const bucketClasses: BucketClassAnalysis[] = Array.from({ length: N_BUCKET_CLASSES + 1 }, (_, i) =>
    getBucketClassAnalysis(i, i < LARGEST_BUCKET_CLASS ? 32 : 1)
  );

  const totalFreeSize = bucketClasses.reduce((s, c) => s + c.totalFreeSize, 0);
  const totalUsedSize = M.byteLength - totalFreeSize;

  let isCorrupted = false;

  let block = metadata.firstBlock;
  while (block !== NULL_PTR) {
    const nextBlock = pointerCast$<Block>(
      addressOf$(block.value$.body) + (block.value$.header.selfDescriptor & ~0b111)
    );

    if (M.byteLength - nextBlock < sizeOf$<Block>()) break;

    if (nextBlock.value$.header.prevDescriptor !== block.value$.header.selfDescriptor) {
      isCorrupted = true;
      break;
    }

    block = nextBlock;
  }

  if (metadata.lastBlock !== block) isCorrupted = true;

  return {
    totalMemorySize: M.byteLength,
    totalUsedSize,
    totalFreeSize: M.byteLength - totalUsedSize,
    usedRatio: totalUsedSize / M.byteLength,
    bucketClasses,
    isCorrupted: isCorrupted || bucketClasses.some(c => c.isCorrupted)
  };
}

export { MEMORY_INFO, malloc, mresize, free, BucketClassAnalysis, MemoryAnalysis, getMemoryAnalysis };
