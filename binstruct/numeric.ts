import type { Coder } from "./mod.ts";

/**
 * Endianness types for binary data
 */
export type Endianness = "be" | "le";

type DataViewMethodSuffixes =
  Extract<keyof DataView, `get${string}` | `set${string}`> extends
    `${"get" | "set"}${infer Suffix}` ? Suffix : never;

function dataViewType(
  type:
    | "Int8"
    | "Int16"
    | "Int32"
    | "Uint8"
    | "Uint16"
    | "Uint32"
    | "Float16"
    | "Float32"
    | "Float64",
  endianness: Endianness,
): Coder<number>;
function dataViewType(
  type:
    | "BigInt64"
    | "BigUint64",
  endianness: Endianness,
): Coder<bigint>;
function dataViewType<TValue extends number | bigint>(
  type: DataViewMethodSuffixes,
  endianness: Endianness,
): Coder<TValue> {
  const bits = Number(type.match(/[0-9]+$/)?.[0]!);

  if (isNaN(bits)) {
    throw new Error(`Unable to infer size from type ${type}`);
  }

  const bytes = Math.trunc(bits / 8);

  const methodSuffix = `${type}` as const;

  return {
    encode: (value, target) => {
      const dataView = new DataView(
        target.buffer,
        target.byteOffset,
        target.byteLength,
      );
      switch (methodSuffix) {
        case "Uint8":
        case "Int8":
          dataView[`set${methodSuffix}`](0, value as number);
          break;

        case "BigUint64":
        case "BigInt64":
          dataView[`set${methodSuffix}`](
            0,
            value as bigint,
            endianness === "le",
          );
          break;

        default:
          dataView[`set${methodSuffix}`](
            0,
            value as number,
            endianness === "le",
          );
          break;
      }
      return bytes;
    },
    decode: (encoded) => {
      const dataView = new DataView(
        encoded.buffer,
        encoded.byteOffset,
        encoded.byteLength,
      );

      let value: TValue;
      switch (methodSuffix) {
        case "Uint8":
        case "Int8":
          value = dataView[`get${methodSuffix}`](0) as TValue;
          break;

        default:
          value = dataView[`get${methodSuffix}`](
            0,
            endianness === "le",
          ) as TValue;
          break;
      }

      return [value, bytes];
    },
  };
}

/**
 * Creates a u8 (unsigned 8-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function u8(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Uint8", endianness);
}

/**
 * Creates an s8 (signed 8-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function s8(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int8", endianness);
}

/**
 * Creates a u16 (unsigned 16-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function u16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Uint16", endianness);
}

/**
 * Creates an s16 (signed 16-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function s16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int16", endianness);
}

/**
 * Creates a f16 (16-bit floating point number) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function f16(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Float16", endianness);
}

/**
 * Creates a u32 (unsigned 32-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function u32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Uint32", endianness);
}

/**
 * Creates an s32 (signed 32-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function s32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Int32", endianness);
}

/**
 * Creates a f32 (32-bit floating point number) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function f32(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Float32", endianness);
}

/**
 * Creates a u64 (unsigned 64-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<bigint> with encode and decode functions
 */
export function u64(
  endianness: Endianness = "be",
): Coder<bigint> {
  return dataViewType("BigUint64", endianness);
}

/**
 * Creates an s64 (signed 64-bit integer) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<bigint> with encode and decode functions
 */
export function s64(
  endianness: Endianness = "be",
): Coder<bigint> {
  return dataViewType("BigInt64", endianness);
}

/**
 * Creates a f64 (64-bit floating point number) parser/serializer
 * @param endianness - Endianness, defaults to "be" (big-endian)
 * @returns Coder<number> with encode and decode functions
 */
export function f64(
  endianness: Endianness = "be",
): Coder<number> {
  return dataViewType("Float64", endianness);
}

/**
 * Big-endian aliases
 */
export const u8be: Coder<number> = u8("be");
export const s8be: Coder<number> = s8("be");
export const f16be: Coder<number> = f16("be");
export const u16be: Coder<number> = u16("be");
export const s16be: Coder<number> = s16("be");
export const f32be: Coder<number> = f32("be");
export const u32be: Coder<number> = u32("be");
export const s32be: Coder<number> = s32("be");
export const f64be: Coder<number> = f64("be");
export const u64be: Coder<bigint> = u64("be");
export const s64be: Coder<bigint> = s64("be");

/**
 * Little-endian aliases
 */
export const u8le: Coder<number> = u8("le");
export const s8le: Coder<number> = s8("le");
export const f16le: Coder<number> = f16("le");
export const u16le: Coder<number> = u16("le");
export const s16le: Coder<number> = s16("le");
export const f32le: Coder<number> = f32("le");
export const u32le: Coder<number> = u32("le");
export const s32le: Coder<number> = s32("le");
export const f64le: Coder<number> = f64("le");
export const u64le: Coder<bigint> = u64("le");
export const s64le: Coder<bigint> = s64("le");
