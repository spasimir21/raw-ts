import {
  Alignment,
  ArrayTypeInfo,
  JSPointerTypeInfo,
  RawPointerTypeInfo,
  RawTypeContainer,
  RawTypeInfo,
  RawTypeInfoOf,
  RawTypeKind,
  StructTypeInfo,
  UnionTypeInfo,
  VoidTypeInfo
} from './RawType';

type UInt8Descriptor = {
  kind: RawTypeKind.UInt8;
  size: 1;
  alignment: 1;
  isValueType: true;
  hasDynamicSize: false;
};

type Int8Descriptor = {
  kind: RawTypeKind.Int8;
  size: 1;
  alignment: 1;
  isValueType: true;
  hasDynamicSize: false;
};

type UInt16Descriptor = {
  kind: RawTypeKind.UInt16;
  size: 2;
  alignment: 2;
  isValueType: true;
  hasDynamicSize: false;
};

type Int16Descriptor = {
  kind: RawTypeKind.Int16;
  size: 2;
  alignment: 2;
  isValueType: true;
  hasDynamicSize: false;
};

type UInt32Descriptor = {
  kind: RawTypeKind.UInt32;
  size: 4;
  alignment: 4;
  isValueType: true;
  hasDynamicSize: false;
};

type Int32Descriptor = {
  kind: RawTypeKind.Int32;
  size: 4;
  alignment: 4;
  isValueType: true;
  hasDynamicSize: false;
};

type UInt64Descriptor = {
  kind: RawTypeKind.UInt64;
  size: 8;
  alignment: 8;
  isValueType: true;
  hasDynamicSize: false;
};

type Int64Descriptor = {
  kind: RawTypeKind.Int64;
  size: 8;
  alignment: 8;
  isValueType: true;
  hasDynamicSize: false;
};

type Float16Descriptor = {
  kind: RawTypeKind.Float16;
  size: 2;
  alignment: 2;
  isValueType: true;
  hasDynamicSize: false;
};

type Float32Descriptor = {
  kind: RawTypeKind.Float32;
  size: 4;
  alignment: 4;
  isValueType: true;
  hasDynamicSize: false;
};

type Float64Descriptor = {
  kind: RawTypeKind.Float64;
  size: 8;
  alignment: 8;
  isValueType: true;
  hasDynamicSize: false;
};

type VoidDescriptor<Size extends number = number, Align extends Alignment = Alignment> = {
  kind: RawTypeKind.Void;
  size: Size;
  alignment: Align;
  isValueType: false;
  hasDynamicSize: boolean;
};

type RawPointerDescriptor<T extends RawTypeDescriptor = RawTypeDescriptor> = {
  kind: RawTypeKind.RawPointer;
  size: 4;
  alignment: 4;
  isValueType: true;
  hasDynamicSize: false;
  targetDescriptor: T;
};

type JSPointerDescriptor<T> = {
  kind: RawTypeKind.JSPointer;
  size: 4;
  alignment: 4;
  isValueType: true;
  hasDynamicSize: false;
  targetType: T;
};

type ArrayDescriptor<T extends RawTypeDescriptor = RawTypeDescriptor, Length extends number = number> = {
  kind: RawTypeKind.Array;
  size: number;
  alignment: T['alignment'];
  isValueType: false;
  hasDynamicSize: boolean;
  hasFixedLength: boolean;
  length: Length;
  elementDescriptor: T;
};

type UnionDescriptor<T extends Record<string, RawTypeDescriptor> = Record<string, RawTypeDescriptor>> = {
  kind: RawTypeKind.Union;
  size: number;
  alignment: Alignment;
  isValueType: false;
  hasDynamicSize: boolean;
  variantDescriptors: T;
};

type StructFieldDescriptor<T extends RawTypeDescriptor = RawTypeDescriptor, Name extends string = string> = {
  index: number;
  name: Name;
  offset: number;
  paddingSize: number;
  valueDescriptor: T;
};

type StructDescriptor<T extends Record<string, RawTypeDescriptor> = Record<string, RawTypeDescriptor>> = {
  kind: RawTypeKind.Struct;
  size: number;
  alignment: Alignment;
  isValueType: false;
  hasDynamicSize: boolean;
  fieldDescriptors: { [K in keyof T]: StructFieldDescriptor<T[K], K extends string ? K : string> };
  totalPaddingSize: number;
};

type RawTypeDescriptor =
  | UInt8Descriptor
  | Int8Descriptor
  | UInt16Descriptor
  | Int16Descriptor
  | UInt32Descriptor
  | Int32Descriptor
  | UInt64Descriptor
  | Int64Descriptor
  | Float16Descriptor
  | Float32Descriptor
  | Float64Descriptor
  | VoidDescriptor
  | {
      kind: RawTypeKind.RawPointer;
      size: 4;
      alignment: 4;
      isValueType: true;
      hasDynamicSize: false;
      targetDescriptor: RawTypeDescriptor;
    }
  | {
      kind: RawTypeKind.JSPointer;
      size: 4;
      alignment: 4;
      isValueType: true;
      hasDynamicSize: false;
      targetType: any;
    }
  | {
      kind: RawTypeKind.Array;
      size: number;
      alignment: Alignment;
      isValueType: false;
      hasDynamicSize: boolean;
      hasFixedLength: boolean;
      length: number;
      elementDescriptor: RawTypeDescriptor;
    }
  | {
      kind: RawTypeKind.Union;
      size: number;
      alignment: Alignment;
      isValueType: false;
      hasDynamicSize: boolean;
      variantDescriptors: Record<string, RawTypeDescriptor>;
    }
  | {
      kind: RawTypeKind.Struct;
      size: number;
      alignment: Alignment;
      isValueType: false;
      hasDynamicSize: boolean;
      fieldDescriptors: Record<string, StructFieldDescriptor>;
      totalPaddingSize: number;
    };

type RawTypeDescriptorByKindMap = {
  [RawTypeKind.UInt8]: UInt8Descriptor;
  [RawTypeKind.Int8]: Int8Descriptor;
  [RawTypeKind.UInt16]: UInt16Descriptor;
  [RawTypeKind.Int16]: Int16Descriptor;
  [RawTypeKind.UInt32]: UInt32Descriptor;
  [RawTypeKind.Int32]: Int32Descriptor;
  [RawTypeKind.UInt64]: UInt64Descriptor;
  [RawTypeKind.Int64]: Int64Descriptor;
  [RawTypeKind.Float16]: Float16Descriptor;
  [RawTypeKind.Float32]: Float32Descriptor;
  [RawTypeKind.Float64]: Float64Descriptor;
};

// prettier-ignore
type RawTypeDescriptorOfInfo<T extends RawTypeInfo> =
    RawTypeInfo extends T ? RawTypeDescriptor
  : T['kind'] extends keyof RawTypeDescriptorByKindMap ? RawTypeDescriptorByKindMap[T['kind']]
  : T extends VoidTypeInfo ? VoidDescriptor<T['size'], T['alignment']>
  : T extends RawPointerTypeInfo ? RawPointerDescriptor<RawTypeDescriptorOfInfo<RawTypeInfoOf<T['target']>>>
  : T extends JSPointerTypeInfo ? JSPointerDescriptor<T['target']>
  : T extends ArrayTypeInfo ? ArrayDescriptor<RawTypeDescriptorOfInfo<RawTypeInfoOf<T['element']>>, T['length']>
  : T extends UnionTypeInfo ? UnionDescriptor<{ [K in keyof T['variants']]: RawTypeDescriptorOfInfo<RawTypeInfoOf<T['variants'][K]>> }>
  : T extends StructTypeInfo ? StructDescriptor<{ [K in keyof T['fields']]: RawTypeDescriptorOfInfo<RawTypeInfoOf<T['fields'][K]>> }>
  : RawTypeDescriptor;

type RawTypeDescriptorOf<T extends RawTypeContainer> = RawTypeDescriptorOfInfo<RawTypeInfoOf<T>>;

export {
  UInt8Descriptor,
  Int8Descriptor,
  UInt16Descriptor,
  Int16Descriptor,
  UInt32Descriptor,
  Int32Descriptor,
  UInt64Descriptor,
  Int64Descriptor,
  Float16Descriptor,
  Float32Descriptor,
  Float64Descriptor,
  VoidDescriptor,
  RawPointerDescriptor,
  JSPointerDescriptor,
  ArrayDescriptor,
  UnionDescriptor,
  StructFieldDescriptor,
  StructDescriptor,
  RawTypeDescriptor,
  RawTypeDescriptorOf
};
