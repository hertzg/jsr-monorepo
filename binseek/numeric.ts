import type { ValueWithByteLength } from "./mod.ts";

export type NumberIntBitLength = 8 | 16 | 32;
export type NumberFloatBitLength = 16 | 32 | 64;
export type BigIntBitLength = 64;

export type IntegerSign = "u" | "s";
export type FloatSign = "f";

export type Endianness = "be" | "le";

export type NumberIntFormat = `${IntegerSign}${NumberIntBitLength}${
  | ""
  | Endianness}`;

export type NumberFloatFormat = `${FloatSign}${NumberFloatBitLength}${
  | ""
  | Endianness}`;

export type BigIntFormat = `${IntegerSign}${BigIntBitLength}${
  | ""
  | Endianness}`;

export type NumberFormat = NumberIntFormat | NumberFloatFormat;

export type FormatBitLength<
  T extends string = NumberFormat | BigIntFormat,
> = T extends `${IntegerSign | FloatSign}${infer BS}`
  ? BS extends `${infer B}${"" | Endianness}`
    ? B extends `${infer N extends number}` ? N : never
  : never
  : never;

const dataViewMethods = Object.freeze({
  "u8": "Uint8" as const,
  "u8be": "Uint8" as const,
  "u8le": "Uint8" as const,
  "s8": "Int8" as const,
  "s8be": "Int8" as const,
  "s8le": "Int8" as const,
  "u16": "Uint16" as const,
  "u16be": "Uint16" as const,
  "u16le": "Uint16" as const,
  "s16": "Int16" as const,
  "s16be": "Int16" as const,
  "s16le": "Int16" as const,
  "f16": "Float16" as const,
  "f16be": "Float16" as const,
  "f16le": "Float16" as const,
  "u32": "Uint32" as const,
  "u32be": "Uint32" as const,
  "u32le": "Uint32" as const,
  "s32": "Int32" as const,
  "s32be": "Int32" as const,
  "s32le": "Int32" as const,
  "f32": "Float32" as const,
  "f32be": "Float32" as const,
  "f32le": "Float32" as const,
  "u64": "BigUint64" as const,
  "u64be": "BigUint64" as const,
  "u64le": "BigUint64" as const,
  "s64": "BigInt64" as const,
  "s64be": "BigInt64" as const,
  "s64le": "BigInt64" as const,
  "f64": "Float64" as const,
  "f64be": "Float64" as const,
  "f64le": "Float64" as const,
});

export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: NumberFormat,
): ValueWithByteLength<number>;
export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: NumberFormat,
  newValue: number,
): ValueWithByteLength;
export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: BigIntFormat,
): ValueWithByteLength<bigint>;
export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: BigIntFormat,
  newValue: bigint,
): ValueWithByteLength;
export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: NumberFormat | BigIntFormat,
): ValueWithByteLength<number | bigint>;
export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: NumberFormat | BigIntFormat,
  newValue: number | bigint,
): ValueWithByteLength;
export function numeric<T extends ArrayBufferLike = ArrayBufferLike>(
  buffer: Uint8Array<T>,
  offset: number,
  format: NumberFormat | BigIntFormat,
  newValue?: number | bigint,
): ValueWithByteLength<number | bigint | undefined> {
  const isLittle = format.endsWith("le");

  const bitLength =
    (format.endsWith("be") || isLittle
      ? Number(format.slice(1, -2))
      : Number(format.slice(1))) as FormatBitLength<typeof format>;

  if (isNaN(bitLength)) {
    throw new Error(`int: invalid byteLength: ${format}`);
  }

  const byteLength = ~~(bitLength / 8);

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset + offset,
    byteLength,
  );

  let value;
  if (newValue == null) {
    const method = `get${dataViewMethods[format]}` satisfies keyof DataView;
    const getterFunction = view[method] as (
      offset: number,
      isLittle?: boolean,
    ) => number | bigint;
    value = getterFunction.call(view, 0, isLittle);
  } else {
    const method = `set${dataViewMethods[format]}` satisfies keyof DataView;
    const setterFunction = view[method] as (
      offset: number,
      value: number | bigint,
      littleEndian?: boolean,
    ) => void;
    setterFunction.call(view, 0, newValue, isLittle);
  }

  return {
    byteLength: byteLength,
    value,
  };
}
