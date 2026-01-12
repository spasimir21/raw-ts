'use raw';

import {
  readRaw,
  STACK_ALLOCATOR_SIZE,
  StackAllocator,
  stackAllocator_alloc,
  stackAllocator_deinit,
  stackAllocator_getTotalSize,
  stackAllocator_init,
  stackAllocator_popFrame,
  stackAllocator_pushFrame
} from './lib/std';
import { initializeMemory } from './lib/runtime/memory';
import { free, malloc } from './lib/runtime';
import { addressOf$, sizeOf$, typeDescriptorOf$ } from './lib/macros';
import { UInt32 } from './lib/types';

initializeMemory();

const allocator = malloc<StackAllocator>(STACK_ALLOCATOR_SIZE).value$;
stackAllocator_init(allocator, 64);

const firstPointer = addressOf$(allocator.currentPage.value$.data);

const framePointers: number[] = [];
for (let i = 0; i < 10_000; i++) {
  const actionRand = Math.random();

  if (actionRand < 0.1) {
    stackAllocator_pushFrame(allocator);
    framePointers.push(
      addressOf$(allocator.currentPage.value$.data) + allocator.currentPageOffset - sizeOf$<UInt32>()
    );
  } else if (actionRand < 0.2) {
    stackAllocator_popFrame(allocator);

    if (
      (framePointers.pop() ?? firstPointer) !==
      addressOf$(allocator.currentPage.value$.data) + allocator.currentPageOffset
    )
      throw new Error('Frame pointers are invalid after pop!');
  } else {
    const rand = Math.random();
    const bytes = rand < 0.3 ? 1 : rand < 0.6 ? 2 : 4;

    const pointer = stackAllocator_alloc(allocator, bytes, bytes);
    if (pointer % bytes !== 0) throw new Error('Pointer is not aligned!');
  }
}

console.log(readRaw(addressOf$(allocator), typeDescriptorOf$<StackAllocator>()));
console.log(stackAllocator_getTotalSize(allocator));

while (framePointers.length > 0) {
  stackAllocator_popFrame(allocator);

  if (framePointers.pop() !== addressOf$(allocator.currentPage.value$.data) + allocator.currentPageOffset)
    throw new Error('Frame pointers are invalid after pop!');
}

stackAllocator_popFrame(allocator);

if (firstPointer !== addressOf$(allocator.currentPage.value$.data) + allocator.currentPageOffset)
  throw new Error('Frame pointers are invalid after pop!');

console.log(readRaw(addressOf$(allocator), typeDescriptorOf$<StackAllocator>()));
console.log(stackAllocator_getTotalSize(allocator));

stackAllocator_deinit(allocator);
free(addressOf$(allocator));
