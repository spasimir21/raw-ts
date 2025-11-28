import { RawTypeKind } from '../constants';
import {
  Alignment,
  ArrayRawTypeInfo,
  BigNumericRawTypeInfo,
  BigNumericRawTypeKind,
  BoolRawTypeInfo,
  JSPointerRawTypeInfo,
  NumericRawTypeInfo,
  NumericRawTypeKind,
  RawPointerRawTypeInfo,
  RawTypeInfo,
  ReferenceRawTypeKind,
  StructRawTypeInfo,
  UnionRawTypeInfo,
  VoidRawTypeInfo
} from './RawTypeInfo';

type RawTypeInfoContainer<Info extends RawTypeInfo = RawTypeInfo> = {
  readonly z__RAW_TYPE_INFO$$: Info;
};

type RawTypeInfoOfContainer<T extends RawTypeInfoContainer> = T['z__RAW_TYPE_INFO$$'];

type RawNumeric<Kind extends NumericRawTypeKind> = number &
  RawTypeInfoContainer<NumericRawTypeInfo<Kind>>;

type UInt8 = RawNumeric<RawTypeKind.UInt8>;
type Int8 = RawNumeric<RawTypeKind.Int8>;
type UInt16 = RawNumeric<RawTypeKind.UInt16>;
type Int16 = RawNumeric<RawTypeKind.Int16>;
type UInt32 = RawNumeric<RawTypeKind.UInt32>;
type Int32 = RawNumeric<RawTypeKind.Int32>;
type Float16 = RawNumeric<RawTypeKind.Float16>;
type Float32 = RawNumeric<RawTypeKind.Float32>;
type Float64 = RawNumeric<RawTypeKind.Float64>;

type BigRawNumeric<Kind extends BigNumericRawTypeKind> = bigint &
  RawTypeInfoContainer<BigNumericRawTypeInfo<Kind>>;

type UInt64 = BigRawNumeric<RawTypeKind.UInt64>;
type Int64 = BigRawNumeric<RawTypeKind.Int64>;

type Bool = boolean & RawTypeInfoContainer<BoolRawTypeInfo>;

type Void<Length extends number = number, Align extends Alignment = 8> = number &
  RawTypeInfoContainer<VoidRawTypeInfo<Length, Align>>;

type RawPointer<T extends RawTypeInfoContainer> = number &
  (RawTypeInfoOfContainer<T>['kind'] extends ReferenceRawTypeKind
    ? { readonly value$: T }
    : { value$: T }) &
  RawTypeInfoContainer<RawPointerRawTypeInfo<RawTypeInfoOfContainer<T>>>;

type JSPointer<T> = number & { value$: T } & RawTypeInfoContainer<JSPointerRawTypeInfo<T>>;

type RawArray<
  T extends RawTypeInfoContainer,
  Length extends number = number
> = (RawTypeInfoOfContainer<T>['kind'] extends ReferenceRawTypeKind
  ? { readonly [index: number]: T }
  : { [index: number]: T }) &
  RawTypeInfoContainer<ArrayRawTypeInfo<RawTypeInfoOfContainer<T>, Length>>;

type ReferenceTypeKeys<T extends Record<string, RawTypeInfoContainer>> = {
  [K in keyof T]: RawTypeInfoOfContainer<T[K]>['kind'] extends ReferenceRawTypeKind ? K : never;
}[keyof T];

type ValueTypeKeys<T extends Record<string, RawTypeInfoContainer>> = {
  [K in keyof T]: RawTypeInfoOfContainer<T[K]>['kind'] extends ReferenceRawTypeKind ? never : K;
}[keyof T];

type Union<T extends Record<string, RawTypeInfoContainer>> = {
  readonly [K in ReferenceTypeKeys<T>]: T[K];
} & {
  [K in ValueTypeKeys<T>]: T[K];
} & RawTypeInfoContainer<
    UnionRawTypeInfo<{
      [K in keyof T]: RawTypeInfoOfContainer<T[K]>;
    }>
  >;

type Struct<T extends Record<string, RawTypeInfoContainer>> = {
  readonly [K in ReferenceTypeKeys<T>]: T[K];
} & {
  [K in ValueTypeKeys<T>]: T[K];
} & RawTypeInfoContainer<
    StructRawTypeInfo<{
      [K in keyof T]: RawTypeInfoOfContainer<T[K]>;
    }>
  >;

export {
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
  Bool,
  Void,
  RawPointer,
  JSPointer,
  RawArray,
  Union,
  Struct,
  RawTypeInfoOfContainer
};
