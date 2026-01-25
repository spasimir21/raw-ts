// @raw-ts-runtime-import-path(../runtime)

'use raw';

import { Alignment, AnyRawType, RawPointer, Struct, UInt32, Void } from '../types';
import { addressOf$, alignmentOf$, pointerCast$, sizeOf$ } from '../macros';
import { free, malloc, NULL_PTR } from '../runtime';
import { memset } from '../runtime/memory';

type StackAllocatorPage = Struct<{
  prevPage: RawPointer<StackAllocatorPage>;
  nextPage: RawPointer<StackAllocatorPage>;
  data: Void;
}>;

type StackAllocator = Struct<{
  pageSize: UInt32;
  pageCount: UInt32;
  usedSize: UInt32;
  currentFrameSize: UInt32;
  currentPageOffset: UInt32;
  currentPage: RawPointer<StackAllocatorPage>;
}>;

const STACK_ALLOCATOR_SIZE = sizeOf$<StackAllocator>();

function stackAllocator_init(allocator: StackAllocator, pageSize: number): void {
  memset(addressOf$(allocator), 0, STACK_ALLOCATOR_SIZE);

  allocator.pageSize = pageSize as UInt32;

  const firstPage = malloc<StackAllocatorPage>(sizeOf$<StackAllocatorPage>() + pageSize).value$;
  firstPage.nextPage = NULL_PTR;
  firstPage.prevPage = NULL_PTR;

  allocator.currentPage = addressOf$(firstPage);
  allocator.pageCount = 1 as UInt32;
}

function stackAllocator_deinit(allocator: StackAllocator): void {
  const currentPage = allocator.currentPage;
  memset(addressOf$(allocator), 0, STACK_ALLOCATOR_SIZE);

  if (currentPage === NULL_PTR) return;

  let page = currentPage.value$.prevPage;
  while (page !== NULL_PTR) {
    const prevPage = page.value$.prevPage;

    free(page);
    page = prevPage;
  }

  page = currentPage.value$.nextPage;
  while (page !== NULL_PTR) {
    const nextPage = page.value$.nextPage;

    free(page);
    page = nextPage;
  }

  free(currentPage);
}

function stackAllocator_pushFrame(allocator: StackAllocator): void {
  const frameSize = stackAllocator_alloc<UInt32>(allocator, sizeOf$<UInt32>(), alignmentOf$<UInt32>());
  frameSize.value$ = (allocator.currentFrameSize - sizeOf$<UInt32>()) as UInt32;
  allocator.currentFrameSize = 0 as UInt32;
}

function stackAllocator_popFrame(allocator: StackAllocator): void {
  if (allocator.usedSize === 0) return;

  const pageSize = allocator.pageSize;

  const frameSize = allocator.currentFrameSize as number;
  let remainingFrameSize = frameSize;

  let pageOffset = allocator.currentPageOffset as number;
  let page = allocator.currentPage;
  while (true) {
    if (remainingFrameSize <= pageOffset) {
      pageOffset -= remainingFrameSize;
      break;
    }

    remainingFrameSize -= pageOffset;
    page = page.value$.prevPage;
    pageOffset = pageSize;

    if (page === NULL_PTR) throw new Error('Stack frames have been corrupted!');
  }

  let prevFrameSize: number;

  if (pageOffset >= sizeOf$<UInt32>()) {
    pageOffset -= sizeOf$<UInt32>();
    prevFrameSize = pointerCast$<UInt32>(addressOf$(page.value$.data) + pageOffset).value$;
  } else {
    if (pageOffset !== 0) throw new Error('Stack frames have been corrupted!');

    const prevPage = page.value$.prevPage;

    if (prevPage === NULL_PTR) prevFrameSize = 0;
    else {
      page = prevPage;
      pageOffset = pageSize - sizeOf$<UInt32>();
      prevFrameSize = pointerCast$<UInt32>(addressOf$(page.value$.data) + pageOffset).value$;
    }
  }

  allocator.currentFrameSize = prevFrameSize as UInt32;
  allocator.currentPageOffset = pageOffset as UInt32;
  allocator.currentPage = page;

  allocator.usedSize = Math.max(allocator.usedSize - frameSize - sizeOf$<UInt32>(), 0) as UInt32;
}

function stackAllocator_alloc<T extends AnyRawType = Void>(
  allocator: StackAllocator,
  size: number,
  alignment: Alignment,
  zeroAllocated: boolean = false
): RawPointer<T> {
  if (size > allocator.pageSize)
    throw new Error(`${size} is larger than the max allowed allocation size for this stack allocator!`);
  if (size <= 0) throw new Error(`${size} is not a valid size for this stack allocator!`);

  const pageOffset = allocator.currentPageOffset;

  const paddedPageOffset = (pageOffset + (alignment - 1)) & ~(alignment - 1);
  const padding = paddedPageOffset - pageOffset;

  if (paddedPageOffset + size <= allocator.pageSize) {
    allocator.currentPageOffset = (paddedPageOffset + size) as UInt32;
    allocator.currentFrameSize = (allocator.currentFrameSize + padding + size) as UInt32;
    allocator.usedSize = (allocator.usedSize + padding + size) as UInt32;

    if (zeroAllocated) memset(addressOf$(allocator.currentPage.value$.data) + paddedPageOffset, 0, size);
    return (addressOf$(allocator.currentPage.value$.data) + paddedPageOffset) as RawPointer<T>;
  }

  const page = allocator.currentPage.value$;

  if (page.nextPage === NULL_PTR) {
    const newPage = malloc<StackAllocatorPage>(sizeOf$<StackAllocatorPage>() + allocator.pageSize).value$;
    newPage.prevPage = addressOf$(page);
    newPage.nextPage = NULL_PTR;

    page.nextPage = addressOf$(newPage);
    allocator.pageCount++;
  }

  const nextPage = page.nextPage.value$;

  const growth = allocator.pageSize - pageOffset + size;

  allocator.currentFrameSize = (allocator.currentFrameSize + growth) as UInt32;
  allocator.usedSize = (allocator.usedSize + growth) as UInt32;

  allocator.currentPageOffset = size as UInt32;
  allocator.currentPage = addressOf$(nextPage);

  if (zeroAllocated) memset(addressOf$(nextPage.data), 0, size);
  return addressOf$(nextPage.data) as RawPointer<T>;
}

function stackAllocator_getTotalSize(allocator: StackAllocator): number {
  return allocator.pageCount * allocator.pageSize;
}

export {
  stackAllocator_init,
  stackAllocator_deinit,
  stackAllocator_pushFrame,
  stackAllocator_popFrame,
  stackAllocator_alloc,
  stackAllocator_getTotalSize,
  StackAllocator,
  STACK_ALLOCATOR_SIZE
};
