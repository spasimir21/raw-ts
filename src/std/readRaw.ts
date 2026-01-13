// @disable-raw

import { M_F16, M_F32, M_F64, M_I16, M_I32, M_I64, M_I8, M_JS, M_U16, M_U32, M_U64, M_U8 } from '../runtime';
import {
  ArrayDescriptor,
  Int64Descriptor,
  JSPointerDescriptor,
  RawPointerDescriptor,
  RawTypeDescriptor,
  RawTypeKind,
  StructDescriptor,
  UInt64Descriptor,
  UnionDescriptor,
  VoidDescriptor
} from '../types';

class VoidValue {
  constructor(public readonly _address: number) {}

  readAs<T extends RawTypeDescriptor>(descriptor: T): JSValueFromRawTypeDescriptor<T> {
    return readRaw(this._address, descriptor);
  }
}

class RawPointerValue<T extends RawTypeDescriptor> {
  constructor(public readonly address$: number, private readonly _descriptor: T) {}

  read(): JSValueFromRawTypeDescriptor<T> {
    return readRaw(this.address$, this._descriptor);
  }
}

class JSPointerValue<T> {
  constructor(public readonly address$: number) {}

  read(): T {
    return M_JS[this.address$];
  }
}

class RawArrayValue<T extends RawTypeDescriptor> {
  constructor(public readonly _address: number, private readonly _descriptor: T) {}

  readAt(index: number): JSValueFromRawTypeDescriptor<T> {
    return readRaw(this._address + index * this._descriptor.size, this._descriptor);
  }

  readWithLength(length: number): JSValueFromRawTypeDescriptor<T>[] {
    return Array.from({ length }, (_, i) => this.readAt(i));
  }
}

// prettier-ignore
type JSValueFromRawTypeDescriptor<T extends RawTypeDescriptor> =
    T extends StructDescriptor ? { [K in keyof T['fieldDescriptors']]: JSValueFromRawTypeDescriptor<T['fieldDescriptors'][K]['valueDescriptor']> }
  : T extends UnionDescriptor ? { [K in keyof T['variantDescriptors']]: JSValueFromRawTypeDescriptor<T['variantDescriptors'][K]> }
  : T extends ArrayDescriptor ? number extends T['length'] ? RawArrayValue<T['elementDescriptor']> : JSValueFromRawTypeDescriptor<T['elementDescriptor']>[]
  : T extends VoidDescriptor ? VoidValue
  : T extends RawPointerDescriptor ? RawPointerValue<T['targetDescriptor']>
  : T extends JSPointerDescriptor<any> ? JSPointerValue<T['targetType']>
  : T extends Int64Descriptor | UInt64Descriptor ? bigint
  : number;

const RAW_TYPE_KIND_TO_MEMORY = {
  [RawTypeKind.UInt8]: M_U8,
  [RawTypeKind.Int8]: M_I8,
  [RawTypeKind.UInt16]: M_U16,
  [RawTypeKind.Int16]: M_I16,
  [RawTypeKind.UInt32]: M_U32,
  [RawTypeKind.Int32]: M_I32,
  [RawTypeKind.UInt64]: M_U64,
  [RawTypeKind.Int64]: M_I64,
  [RawTypeKind.Float16]: M_F16,
  [RawTypeKind.Float32]: M_F32,
  [RawTypeKind.Float64]: M_F64
} as const;

function readRaw<T extends RawTypeDescriptor>(
  address: number,
  descriptor: T
): JSValueFromRawTypeDescriptor<T> {
  switch (descriptor.kind) {
    case RawTypeKind.Void:
      return new VoidValue(address) as any;
    case RawTypeKind.RawPointer:
      return new RawPointerValue(M_U32[address >> 2], descriptor.targetDescriptor) as any;
    case RawTypeKind.JSPointer:
      return new JSPointerValue(M_U32[address >> 2]) as any;
    case RawTypeKind.Array:
      return (
        descriptor.hasFixedLength
          ? Array.from({ length: descriptor.length }, (_, i) =>
              readRaw(address + i * descriptor.elementDescriptor.size, descriptor.elementDescriptor)
            )
          : new RawArrayValue(address, descriptor.elementDescriptor)
      ) as any;
    case RawTypeKind.Union:
      const union: any = {};
      for (const key in descriptor.variantDescriptors)
        union[key] = readRaw(address, descriptor.variantDescriptors[key]);
      return union;
    case RawTypeKind.Struct:
      const struct: any = {};
      for (const field of Object.values(descriptor.fieldDescriptors))
        struct[field.name] = readRaw(address + field.offset, field.valueDescriptor);
      return struct;
    default:
      // prettier-ignore
      const adjustedAddress = 
          descriptor.alignment === 1 ? address
        : descriptor.alignment === 2 ? address >> 1
        : descriptor.alignment === 4 ? address >> 2
        : address >> 3;

      return RAW_TYPE_KIND_TO_MEMORY[descriptor.kind][adjustedAddress] as any;
  }
}

export { readRaw, VoidValue, RawPointerValue, JSPointerValue, RawArrayValue };
