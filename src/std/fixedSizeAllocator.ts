// @raw-ts-runtime-import-path(../runtime)

'use raw';

import { AnyRawType, RawPointer, Struct, UInt32, Union, Void } from '../types';
import { addressOf$, pointerCast$, sizeOf$ } from '../macros';
import { free, malloc, NULL_PTR } from '../runtime';
import { memset } from '../runtime/memory';

type FixedSizeAllocatorEntry = Union<{
  nextFreeEntry: RawPointer<FixedSizeAllocatorEntry>;
  data: Void;
}>;

type FixedSizeAllocatorPage = Struct<{
  nextPage: RawPointer<FixedSizeAllocatorPage>;
  entries: Void;
}>;

type FixedSizeAllocator<T extends AnyRawType = Void> = Struct<{
  pageCount: UInt32;
  entrySize: UInt32;
  entriesPerPage: UInt32;
  usedEntries: UInt32;
  freeListHead: RawPointer<FixedSizeAllocatorEntry>;
  firstPage: RawPointer<FixedSizeAllocatorPage>;
}> & {
  __rawType: T;
};

const FIXED_SIZE_ALLOCATOR_SIZE = sizeOf$<FixedSizeAllocator>();

function fixedSizeAllocator_init(
  allocator: FixedSizeAllocator<AnyRawType>,
  entrySize: number,
  entriesPerPage: number
): void {
  if (entriesPerPage <= 0) throw new Error(`${entriesPerPage} is an invalid entries per page count!`);
  if (entrySize <= 0) throw new Error(`${entrySize} is an invalid entry size!`);

  memset(addressOf$(allocator), 0, FIXED_SIZE_ALLOCATOR_SIZE);

  allocator.entrySize = ((entrySize + 3) & ~0b11) as UInt32;
  allocator.entriesPerPage = entriesPerPage as UInt32;
}

function fixedSizeAllocator_deinit(allocator: FixedSizeAllocator<AnyRawType>): void {
  let page = allocator.firstPage;
  memset(addressOf$(allocator), 0, FIXED_SIZE_ALLOCATOR_SIZE);

  while (page !== NULL_PTR) {
    const nextPage = page.value$.nextPage;
    free(page);
    page = nextPage;
  }
}

function fixedSizeAllocator_allocNewPage(allocator: FixedSizeAllocator<AnyRawType>) {
  const entriesPerPage = allocator.entriesPerPage;
  const entrySize = allocator.entrySize;

  const page = malloc<FixedSizeAllocatorPage>(
    sizeOf$<FixedSizeAllocatorPage>() + entriesPerPage * entrySize
  ).value$;

  page.nextPage = allocator.firstPage;
  allocator.firstPage = addressOf$(page);

  allocator.pageCount++;

  const firstEntry = pointerCast$<FixedSizeAllocatorEntry>(addressOf$(page.entries)).value$;
  const lastEntry = pointerCast$<FixedSizeAllocatorEntry>(
    addressOf$(page.entries) + (entriesPerPage - 1) * entrySize
  ).value$;

  for (let entry = firstEntry; addressOf$(entry) < addressOf$(lastEntry); entry = entry.nextFreeEntry.value$)
    entry.nextFreeEntry = pointerCast$<FixedSizeAllocatorEntry>(addressOf$(entry) + entrySize);

  lastEntry.nextFreeEntry = allocator.freeListHead;
  allocator.freeListHead = addressOf$(firstEntry);
}

function fixedSizeAllocator_alloc<T extends AnyRawType>(
  allocator: FixedSizeAllocator<T>,
  zeroAllocated: boolean = false
): RawPointer<T> {
  if (allocator.freeListHead === NULL_PTR) fixedSizeAllocator_allocNewPage(allocator);

  const entry = allocator.freeListHead.value$;
  allocator.freeListHead = entry.nextFreeEntry;
  allocator.usedEntries++;

  if (zeroAllocated) memset(addressOf$(entry.data), 0, allocator.entrySize);

  return addressOf$(entry.data) as RawPointer<T>;
}

function fixedSizeAllocator_free<T extends AnyRawType>(
  allocator: FixedSizeAllocator<T>,
  pointer: RawPointer<T>
): void {
  if (pointer === NULL_PTR || (pointer & 0b11) !== 0) throw new Error('Tried to free an invalid pointer!');
  if (allocator.usedEntries === 0)
    throw new Error(
      'Tried to free an entry from a fixed size allocator, but the allocator currently has 0 allocated entries!'
    );

  const entry = (pointer as RawPointer<FixedSizeAllocatorEntry>).value$;

  entry.nextFreeEntry = allocator.freeListHead;
  allocator.freeListHead = addressOf$(entry);

  allocator.usedEntries--;
}

function fixedSizeAllocator_getTotalSize(allocator: FixedSizeAllocator<AnyRawType>) {
  return allocator.pageCount * allocator.entriesPerPage * allocator.entrySize;
}

function fixedSizeAllocator_getUsedSize(allocator: FixedSizeAllocator<AnyRawType>) {
  return allocator.usedEntries * allocator.entrySize;
}

export {
  FixedSizeAllocator,
  FIXED_SIZE_ALLOCATOR_SIZE,
  fixedSizeAllocator_init,
  fixedSizeAllocator_deinit,
  fixedSizeAllocator_allocNewPage,
  fixedSizeAllocator_alloc,
  fixedSizeAllocator_free,
  fixedSizeAllocator_getTotalSize,
  fixedSizeAllocator_getUsedSize
};
