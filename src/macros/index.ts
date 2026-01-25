import { RAW_TYPE_INFO_PROPERTY_NAME, USE_RAW_TS_DIRECTIVE } from '../constants';
import {
  Alignment,
  AnyRawType,
  RawPointer,
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

const typeDescriptorOf$ = <T extends AnyRawType>(): RawTypeDescriptorOf<T> =>
  throwMacroError('typeDescriptorOf$');

const sizeOf$ = <T extends AnyRawType>(): number => throwMacroError('sizeOf$');

const alignmentOf$ = <T extends AnyRawType>(): Alignment => throwMacroError('alignmentOf$');

const offsetOf$ = <
  T extends RawTypeContainer<StructTypeInfo>,
  F extends Exclude<keyof T, typeof RAW_TYPE_INFO_PROPERTY_NAME>
>(): number => throwMacroError('offsetOf$');

const pointerCast$ = <T extends AnyRawType>(pointer: number): RawPointer<T> =>
  throwMacroError('pointerCast$');

const referenceCast$ = <T extends RawTypeContainer<ReferenceRawTypeInfo>>(
  value: RawTypeContainer<ReferenceRawTypeInfo>
): T => throwMacroError('referenceCast$');

const addressOf$ = <T extends AnyRawType>(value: T): RawPointer<T> => throwMacroError('addressOf$');

export { typeDescriptorOf$, sizeOf$, alignmentOf$, offsetOf$, pointerCast$, referenceCast$, addressOf$ };
