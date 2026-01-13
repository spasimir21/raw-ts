import { RAW_TYPE_INFO_PROPERTY_NAME } from '../constants';

type Alignment = 1 | 2 | 4 | 8;

enum RawTypeKind {
  UInt8,
  Int8,
  UInt16,
  Int16,
  UInt32,
  Int32,
  UInt64,
  Int64,
  Float16,
  Float32,
  Float64,
  Void,
  RawPointer,
  JSPointer,
  Array,
  Union,
  Struct
}

type ReferenceRawTypeKind = RawTypeKind.Void | RawTypeKind.Array | RawTypeKind.Union | RawTypeKind.Struct;

type VoidTypeInfo = {
  kind: RawTypeKind.Void;
  size: number;
  alignment: Alignment;
};

type RawPointerTypeInfo = {
  kind: RawTypeKind.RawPointer;
  target: RawTypeContainer;
};

type JSPointerTypeInfo = {
  kind: RawTypeKind.JSPointer;
  target: any;
};

type ArrayTypeInfo = {
  kind: RawTypeKind.Array;
  element: RawTypeContainer;
  length: number;
};

type UnionTypeInfo = {
  kind: RawTypeKind.Union;
  variants: Record<string, RawTypeContainer>;
};

type StructTypeInfo = {
  kind: RawTypeKind.Struct;
  fields: Record<string, RawTypeContainer>;
};

type RawTypeInfo =
  | {
      kind: Exclude<
        RawTypeKind,
        | RawTypeKind.Void
        | RawTypeKind.RawPointer
        | RawTypeKind.JSPointer
        | RawTypeKind.Array
        | RawTypeKind.Union
        | RawTypeKind.Struct
      >;
    }
  | VoidTypeInfo
  | RawPointerTypeInfo
  | JSPointerTypeInfo
  | ArrayTypeInfo
  | UnionTypeInfo
  | StructTypeInfo;

type ReferenceRawTypeInfo = VoidTypeInfo | ArrayTypeInfo | UnionTypeInfo | StructTypeInfo;

type RawTypeContainer<T extends RawTypeInfo = RawTypeInfo> = {
  [K in typeof RAW_TYPE_INFO_PROPERTY_NAME]: T;
};

type RawTypeInfoOf<T extends RawTypeContainer> = T[typeof RAW_TYPE_INFO_PROPERTY_NAME];

type RawTypeOf<T, Info extends RawTypeInfo> = T & RawTypeContainer<Info>;

type UInt8<T = number> = RawTypeOf<T, { kind: RawTypeKind.UInt8 }>;
type Int8<T = number> = RawTypeOf<T, { kind: RawTypeKind.Int8 }>;
type UInt16<T = number> = RawTypeOf<T, { kind: RawTypeKind.UInt16 }>;
type Int16<T = number> = RawTypeOf<T, { kind: RawTypeKind.Int16 }>;
type UInt32<T = number> = RawTypeOf<T, { kind: RawTypeKind.UInt32 }>;
type Int32<T = number> = RawTypeOf<T, { kind: RawTypeKind.Int32 }>;

type Float16 = RawTypeOf<number, { kind: RawTypeKind.Float16 }>;
type Float32 = RawTypeOf<number, { kind: RawTypeKind.Float32 }>;
type Float64 = RawTypeOf<number, { kind: RawTypeKind.Float64 }>;

type UInt64 = RawTypeOf<bigint, { kind: RawTypeKind.UInt64 }>;
type Int64 = RawTypeOf<bigint, { kind: RawTypeKind.Int64 }>;

type Void<Align extends Alignment = 8, Size extends number = number> = RawTypeOf<
  unknown,
  {
    kind: RawTypeKind.Void;
    size: Size;
    alignment: Align;
  }
>;

type RawPointer<T extends RawTypeContainer> = RawTypeOf<
  number & { value$: T },
  {
    kind: RawTypeKind.RawPointer;
    target: T;
  }
>;

type JSPointer<T> = RawTypeOf<
  number & { value$: T },
  {
    kind: RawTypeKind.JSPointer;
    target: T;
  }
>;

type RawArray<T extends RawTypeContainer, Length extends number = number> = RawTypeOf<
  { [index: number]: T },
  {
    kind: RawTypeKind.Array;
    element: T;
    length: Length;
  }
>;

type Union<T extends Record<string, RawTypeContainer>> = RawTypeOf<
  T,
  {
    kind: RawTypeKind.Union;
    variants: T;
  }
>;

type Struct<T extends Record<string, RawTypeContainer>> = RawTypeOf<
  T,
  {
    kind: RawTypeKind.Struct;
    fields: T;
  }
>;

export {
  Alignment,
  RawTypeKind,
  ReferenceRawTypeKind,
  RawTypeInfo,
  ReferenceRawTypeInfo,
  VoidTypeInfo,
  RawPointerTypeInfo,
  JSPointerTypeInfo,
  ArrayTypeInfo,
  UnionTypeInfo,
  StructTypeInfo,
  RawTypeContainer,
  RawTypeInfoOf,
  RawTypeOf,
  UInt8,
  Int8,
  UInt16,
  Int16,
  UInt32,
  Int32,
  UInt64,
  Int64,
  Float16,
  Float32,
  Float64,
  Void,
  RawPointer,
  JSPointer,
  RawArray,
  Union,
  Struct
};
