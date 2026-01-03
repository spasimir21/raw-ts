import { RAW_TYPE_INFO_PROPERTY_NAME, USE_RAW_TS_DIRECTIVE } from '../constants';
import {
  RawPointer,
  RawPointerTypeInfo,
  RawTypeContainer,
  RawTypeDescriptorOf,
  ReferenceRawTypeInfo,
  StructTypeInfo
} from '../types';

const throwMacroError = (macroName: string) => {
  throw new Error(
    `"${macroName}" is only a build-time macro and it seems like it hasn\'t been transpiled properly! Did you forget a "${USE_RAW_TS_DIRECTIVE}" directive?`
  );
};

const typeDescriptorOf$ = <T extends RawTypeContainer>(): RawTypeDescriptorOf<T> =>
  throwMacroError('typeDescriptorOf$');

const sizeOf$ = <T extends RawTypeContainer>(): number => throwMacroError('sizeOf$');

const alignmentOf$ = <T extends RawTypeContainer>(): number => throwMacroError('alignmentOf$');

const offsetOf$ = <
  T extends RawTypeContainer<StructTypeInfo>,
  F extends Exclude<keyof T, typeof RAW_TYPE_INFO_PROPERTY_NAME>
>(): number => throwMacroError('offsetOf$');

const pointerCast$ = <T extends RawTypeContainer>(
  pointer: number | RawTypeContainer<RawPointerTypeInfo>
): RawPointer<T> => throwMacroError('pointerCast$');

const referenceCast$ = <T extends RawTypeContainer<ReferenceRawTypeInfo>>(
  value: RawTypeContainer<ReferenceRawTypeInfo>
): T => throwMacroError('referenceCast$');

const addressOf$ = <T extends RawTypeContainer>(value: T): RawPointer<T> =>
  throwMacroError('addressOf$');

export {
  typeDescriptorOf$,
  sizeOf$,
  alignmentOf$,
  offsetOf$,
  pointerCast$,
  referenceCast$,
  addressOf$
};
