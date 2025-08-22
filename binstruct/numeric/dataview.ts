import { type Coder, kCoderKind } from "../core.ts";
import { refSetValue } from "@hertzg/binstruct/ref";
import type { Endianness } from "@hertzg/binstruct/numeric";

export type DataViewMethodSuffixes =
  Extract<keyof DataView, `get${string}` | `set${string}`> extends
    `${"get" | "set"}${infer Suffix}` ? Suffix : never;

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
export function dataViewType(
  type:
    | "BigInt64"
    | "BigUint64",
  endianness: Endianness,
  kind: symbol,
): Coder<bigint>;
export function dataViewType<TDecoded extends number | bigint>(
  type: DataViewMethodSuffixes,
  endianness: Endianness,
  kind: symbol,
): Coder<TDecoded> {
  const bits = Number((type.match(/[0-9]+$/)?.[0])!);

  if (isNaN(bits)) {
    throw new Error(`Unable to infer size from type ${type}`);
  }

  const bytes = Math.trunc(bits / 8);

  const methodSuffix = `${type}` as const;

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
    decode: (encoded, ctx) => {
      if (encoded.length < bytes) {
        throw new Error(`Need ${bytes} bytes, got ${encoded.length}`);
      }

      const dataView = new DataView(
        encoded.buffer,
        encoded.byteOffset,
        encoded.byteLength,
      );

      let value: TDecoded;
      switch (methodSuffix) {
        case "Uint8":
        case "Int8":
          value = dataView[`get${methodSuffix}`](0) as TDecoded;
          break;

        default:
          value = dataView[`get${methodSuffix}`](
            0,
            endianness === "le",
          ) as TDecoded;
          break;
      }

      refSetValue(ctx, self, value);

      return [value, bytes];
    },
  };
}
