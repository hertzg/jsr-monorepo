import { readBit, writeBit } from "./mod.ts";

/**
 * A union of all formats supported by BinaryView that return an array of bits.
 */
export type BitFormats = `b${8}`;

/**
 * A union of all formats supported by BinaryView that return a number.
 */
export type NumberFormats =
  | `${"u" | "s"}${8}`
  | `${"u" | "s"}${8}${"be" | "le"}`
  | `${"u" | "s" | "f"}${16 | 32}`
  | `${"u" | "s" | "f"}${16 | 32}${"be" | "le"}`
  | `f${64}`
  | `f${64}${"be" | "le"}`;

/**
 * A union of all formats supported by BinaryView that return a bigint.
 */
export type BigIntFormats =
  | `${"u" | "s"}${64}`
  | `${"u" | "s"}${64}${"be" | "le"}`;

const dataViewMethods = Object.seal({
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

/**
 * A class similar to DataView that allows reading and writing binary data with a seekable cursor.
 *
 * @example
 * ```ts
 * import BinaryView from "@hertzg/binseek/view";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff]);
 * const view = new BinaryView(buffer);
 *
 * assertEquals(view.get('u8'), 0xf1);
 * assertEquals(view.get('u16'), 0xf2f3);
 * assertEquals(view.get('u32'), 0xf4f5f6f7);
 * assertEquals(view.get('u64'), 0xf8f9fafbfcfdfeffn);
 *
 * assertEquals(
 *   view.reset()
 *       .set(0x01, 'u8')
 *       .set(0x02f3, 'u16')
 *       .set(0x04050607, 'u32')
 *       .set(0x08090a0b0c0d0e0fn, 'u64')
 *       .reset().get(),
 *   new Uint8Array([0x01, 0x02, 0xf3, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f])
 * );
 *
 * assertEquals(buffer, new Uint8Array([0x01, 0x02, 0xf3, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]));
 * ```
 */
export default class BinaryView {
  #buffer: Uint8Array;
  #cursor = 0;

  constructor(buffer: Uint8Array) {
    this.#buffer = buffer;
  }

  get buffer(): Uint8Array {
    return this.#buffer;
  }

  get cursor(): number {
    return this.#cursor;
  }

  get bytesLeft(): number {
    return this.#buffer.byteLength - this.#cursor;
  }

  reset(): this {
    this.#cursor = 0;
    return this;
  }

  advance(offset: number): this {
    this.#cursor += offset;
    return this;
  }

  get(format: BitFormats): number[];
  get(format: NumberFormats): number;
  get(format: BigIntFormats): bigint;
  get(byteLength?: number): Uint8Array;
  get(
    formatOrByteLength?: BitFormats | NumberFormats | BigIntFormats | number,
  ): number[] | number | bigint | Uint8Array {
    if (typeof formatOrByteLength === "number" || formatOrByteLength == null) {
      const byteLength = formatOrByteLength ?? this.bytesLeft;
      const bytes = new Uint8Array(
        this.#buffer.buffer,
        this.#buffer.byteOffset + this.#cursor,
        byteLength,
      );
      this.#cursor += byteLength;
      return bytes;
    }

    const format = formatOrByteLength;
    if (format === "b8") {
      const byte = this.get("u8");
      return Array.from({ length: 8 }, (_, index) => readBit(byte, index))
        .reverse();
    } else {
      const isLittle = format.endsWith("le");

      const bitLength = format.endsWith("be") || isLittle
        ? Number(format.slice(1, -2))
        : Number(format.slice(1));

      if (isNaN(bitLength)) {
        throw new Error(`get: invalid byteLength: ${format}`);
      }
      const byteLength = ~~(bitLength / 8);

      const method: keyof DataView = `get${dataViewMethods[format]}`;
      const view = new DataView(
        this.#buffer.buffer,
        this.#buffer.byteOffset + this.#cursor,
        byteLength,
      );
      this.#cursor += byteLength;
      return view[method](0, isLittle);
    }
  }

  set(value: number[], format?: BitFormats): this;
  set(value: number, format: NumberFormats): this;
  set(value: bigint, format: BigIntFormats): this;
  set(value: Uint8Array): this;
  set(
    value: number[] | number | bigint | Uint8Array,
    format?: BitFormats | NumberFormats | BigIntFormats,
  ): this {
    if (value instanceof Uint8Array) {
      this.#buffer.set(value, this.#cursor);
      this.#cursor += value.byteLength;
    } else if (Array.isArray(value)) {
      if (value.length !== 8) {
        throw new Error(
          `write: bit array must be an array of 8 bits, got ${value.length}`,
        );
      }

      const byte = value.slice().reverse().reduce(
        (byte, bit, index) => writeBit(byte, index, bit),
        0,
      );
      return this.set(byte, "u8");
    } else if (format != null && format != "b8") {
      const isLittle = format.endsWith("le");

      const bitLength = format.endsWith("be") || isLittle
        ? Number(format.slice(1, -2))
        : Number(format.slice(1));

      if (isNaN(bitLength)) {
        throw new Error(`set: invalid byteLength: ${format}`);
      }
      const byteLength = ~~(bitLength / 8);

      type FormatKey = keyof typeof dataViewMethods;
      type MethodName<K extends FormatKey> =
        `set${(typeof dataViewMethods)[K]}`;
      const method: MethodName<typeof format> = `set${dataViewMethods[format]}`;
      const view = new DataView(
        this.#buffer.buffer,
        this.#buffer.byteOffset + this.#cursor,
        byteLength,
      );
      (view[method] as (
        offset: number,
        value: bigint | number,
        little: boolean,
      ) => void)(0, value, isLittle);
      this.#cursor += byteLength;
    }

    return this;
  }
}
