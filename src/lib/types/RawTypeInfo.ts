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
  Boolean,
  Void,
  RawPointer,
  JSPointer,
  Array,
  Union,
  Struct
}

type ReferenceRawTypeKind = RawTypeKind.Void | RawTypeKind.Array | RawTypeKind.Union | RawTypeKind.Struct;

type NumericRawTypeKind =
  | RawTypeKind.UInt8
  | RawTypeKind.Int8
  | RawTypeKind.UInt16
  | RawTypeKind.Int16
  | RawTypeKind.UInt32
  | RawTypeKind.Int32
  | RawTypeKind.Float16
  | RawTypeKind.Float32
  | RawTypeKind.Float64;

type NumericRawTypeInfo<Kind extends NumericRawTypeKind> = { kind: Kind };

type BigNumericRawTypeKind = RawTypeKind.UInt64 | RawTypeKind.Int64;

type BigNumericRawTypeInfo<Kind extends BigNumericRawTypeKind> = { kind: Kind };

type BooleanRawTypeInfo = {
  kind: RawTypeKind.Boolean;
};

type VoidRawTypeInfo<Length extends number, Align extends Alignment> = {
  kind: RawTypeKind.Void;
  alignment: Align;
  length: Length;
};

type RawPointerRawTypeInfo<T extends RawTypeInfo> = {
  kind: RawTypeKind.RawPointer;
  targetTypeInfo: T;
};

type JSPointerRawTypeInfo<T> = {
  kind: RawTypeKind.JSPointer;
  targetType: T;
};

type ArrayRawTypeInfo<T extends RawTypeInfo, Length extends number> = {
  kind: RawTypeKind.Array;
  elementTypeInfo: T;
  length: Length;
};

type UnionRawTypeInfo<T extends Record<string, RawTypeInfo>> = {
  kind: RawTypeKind.Union;
  elementTypeInfoMap: T;
};

type StructRawTypeInfo<T extends Record<string, RawTypeInfo>> = {
  kind: RawTypeKind.Struct;
  elementTypeInfoMap: T;
};

type RawTypeInfo =
  | NumericRawTypeInfo<NumericRawTypeKind>
  | BigNumericRawTypeInfo<BigNumericRawTypeKind>
  | BooleanRawTypeInfo
  | VoidRawTypeInfo<number, Alignment>
  | RawPointerRawTypeInfo<any>
  | JSPointerRawTypeInfo<any>
  | ArrayRawTypeInfo<any, number>
  | UnionRawTypeInfo<Record<string, any>>
  | StructRawTypeInfo<Record<string, any>>;

export {
  Alignment,
  RawTypeKind,
  ReferenceRawTypeKind,
  NumericRawTypeKind,
  NumericRawTypeInfo,
  BigNumericRawTypeKind,
  BigNumericRawTypeInfo,
  BooleanRawTypeInfo,
  VoidRawTypeInfo,
  RawPointerRawTypeInfo,
  JSPointerRawTypeInfo,
  ArrayRawTypeInfo,
  UnionRawTypeInfo,
  StructRawTypeInfo,
  RawTypeInfo
};
