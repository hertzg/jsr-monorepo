import { type Coder, kCoderKind } from "../core.ts";
import { refSetValue } from "../ref/ref.ts";
import type { Endianness } from "./numeric.ts";

/**
 * Extracts method suffixes from DataView methods for get/set operations.
 */
export type DataViewMethodSuffixes =
  Extract<keyof DataView, `get${string}` | `set${string}`> extends
    `${"get" | "set"}${infer Suffix}` ? Suffix : never;

/**
 * Creates a DataView-based coder for numeric types.
 *
 * @param type - The DataView type to use
 * @param endianness - The endianness (little or big)
 * @param kind - The coder kind symbol
 * @returns A Coder for the specified numeric type
 */
export function dataViewType(
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
  kind: symbol,
): Coder<number>;
/**
 * Creates a DataView-based coder for BigInt types.
 *
 * @param type - The DataView BigInt type to use
 * @param endianness - The endianness (little or big)
 * @param kind - The coder kind symbol
 * @returns A Coder for the specified BigInt type
 */
export function dataViewType(
  type:
    | "BigInt64"
    | "BigUint64",
  endianness: Endianness,
  kind: symbol,
): Coder<bigint>;
/**
 * Creates a DataView-based coder for numeric types.
 *
 * @param type - The DataView type to use
 * @param endianness - The endianness (little or big)
 * @param kind - The coder kind symbol
 * @returns A Coder for the specified numeric type
 */
export function dataViewType<TDecoded extends number | bigint>(
  type: DataViewMethodSuffixes,
  endianness: Endianness,
  kind: symbol,
): Coder<TDecoded> {
  const byteSizes: Record<DataViewMethodSuffixes, number> = {
    Int8: 1,
    Uint8: 1,
    Int16: 2,
    Uint16: 2,
    Float16: 2,
    Int32: 4,
    Uint32: 4,
    Float32: 4,
    BigInt64: 8,
    BigUint64: 8,
    Float64: 8,
  };
  const bytes = byteSizes[type];

  const le = endianness === "le";
  const write: (dataView: DataView, value: TDecoded) => void =
    type === "Uint8" || type === "Int8"
      ? (dataView, value) => dataView[`set${type}`](0, value as number)
      : type === "BigUint64" || type === "BigInt64"
      ? (dataView, value) => dataView[`set${type}`](0, value as bigint, le)
      : (dataView, value) => dataView[`set${type}`](0, value as number, le);
  const read: (dataView: DataView) => TDecoded =
    type === "Uint8" || type === "Int8"
      ? (dataView) => dataView[`get${type}`](0) as TDecoded
      : (dataView) => dataView[`get${type}`](0, le) as TDecoded;

  let self: Coder<TDecoded>;
  return self = {
    [kCoderKind]: kind,
    encode: (value, target, ctx) => {
      refSetValue(ctx, self, value);

      const dataView = new DataView(
        target.buffer,
        target.byteOffset,
        target.byteLength,
      );
      write(dataView, value);
      return bytes;
    },
    decode: (encoded, ctx) => {
      if (encoded.length < bytes) {
        throw new Error(`Need ${bytes} bytes, got ${encoded.length}`);
      }

      const dataView = new DataView(
        encoded.buffer,
        encoded.byteOffset,
        encoded.byteLength,
      );
      const value = read(dataView);

      refSetValue(ctx, self, value);

      return [value, bytes];
    },
  };
}
