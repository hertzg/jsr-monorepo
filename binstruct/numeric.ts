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
      if (encoded.length < bytes) {
        throw new Error(`Need ${bytes} bytes, got ${encoded.length}`);
      }

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
export function u8be(): Coder<number> {
  return u8("be");
}
export function s8be(): Coder<number> {
  return s8("be");
}
export function f16be(): Coder<number> {
  return f16("be");
}
export function u16be(): Coder<number> {
  return u16("be");
}
export function s16be(): Coder<number> {
  return s16("be");
}
export function f32be(): Coder<number> {
  return f32("be");
}
export function u32be(): Coder<number> {
  return u32("be");
}
export function s32be(): Coder<number> {
  return s32("be");
}
export function f64be(): Coder<number> {
  return f64("be");
}
export function u64be(): Coder<bigint> {
  return u64("be");
}
export function s64be(): Coder<bigint> {
  return s64("be");
}

/**
 * Little-endian aliases
 */
export function u8le(): Coder<number> {
  return u8("le");
}
export function s8le(): Coder<number> {
  return s8("le");
}
export function f16le(): Coder<number> {
  return f16("le");
}
export function u16le(): Coder<number> {
  return u16("le");
}
export function s16le(): Coder<number> {
  return s16("le");
}
export function f32le(): Coder<number> {
  return f32("le");
}
export function u32le(): Coder<number> {
  return u32("le");
}
export function s32le(): Coder<number> {
  return s32("le");
}
export function f64le(): Coder<number> {
  return f64("le");
}
export function u64le(): Coder<bigint> {
  return u64("le");
}
export function s64le(): Coder<bigint> {
  return s64("le");
}
