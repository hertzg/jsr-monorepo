/**
 * Bencode encoding and decoding utilities built on top of `@hertzg/binstruct`.
 *
 * Bencode is the recursive, self-describing serialization format used by
 * BitTorrent (`.torrent` metainfo files, tracker responses, DHT messages).
 *
 * The grammar has four value kinds, all ASCII-tagged on their first byte:
 * - **Integer** — `i<decimal>e` (e.g. `i42e`, `i-3e`)
 * - **Byte string** — `<decimal-length>:<bytes>` (e.g. `4:spam`)
 * - **List** — `l<element>...e`
 * - **Dict** — `d<key><value>...e` where every key is a byte string and the
 *   pairs are emitted in lexicographic byte-order of the keys.
 *
 * ## Type model
 *
 * The decoded form is a {@link BencodeValue}:
 * ```ts ignore
 * type BencodeValue =
 *   | bigint                            // integer (arbitrary precision)
 *   | Uint8Array                        // byte string (raw bytes, not UTF-8)
 *   | BencodeValue[]                    // list
 *   | Array<[Uint8Array, BencodeValue]> // dict — array of [key, value] pairs
 * ```
 *
 * - Integers are `bigint` because `.torrent` files routinely contain values
 *   beyond `Number.MAX_SAFE_INTEGER` (e.g. multi-gigabyte `length` fields).
 * - Byte strings stay as `Uint8Array` — many bencode payloads (notably
 *   `info.pieces`, which is a concatenation of 20-byte SHA-1 hashes) are not
 *   valid UTF-8.
 * - Dicts are an array of `[key, value]` pairs rather than a `Map` or plain
 *   object, for two reasons: (a) keys are byte strings, not JS strings, and
 *   (b) the spec mandates a specific key order which an array preserves
 *   trivially while a `Map` keyed by `Uint8Array` would fail key-equality.
 *
 * ## Coder interface fit
 *
 * Unlike fixed-shape binary structs, bencode is self-describing — the decoder
 * dispatches on the first byte rather than following a schema. The
 * {@link bencode} factory returns a `Coder<BencodeValue>` whose decode/encode
 * methods recurse on themselves and can be used directly. Note that
 * `@hertzg/binstruct` brands its built-in coders with a private symbol that
 * isn't exported, so the bencode coder won't be recognised by `isCoder()` and
 * can't be embedded as a field inside `struct(...)`. This is a known gap —
 * see the package's PR description for the proposed upstream fix.
 *
 * ## No defensive checks on encode
 *
 * Per the project's "no defensive programming" rule, {@link bencode} does
 * **not** validate that dict keys are sorted on encode — it trusts the caller.
 * Decode rejects malformed input (truncation, invalid digits, unknown tags).
 *
 * @example Round-trip an integer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode } from "@binstruct/bencode";
 *
 * const coder = bencode();
 * const buf = new Uint8Array(32);
 * const written = coder.encode(42n, buf);
 * const [value, read] = coder.decode(buf.subarray(0, written));
 *
 * assertEquals(written, 4); // "i42e"
 * assertEquals(read, 4);
 * assertEquals(value, 42n);
 * ```
 *
 * @example Round-trip a byte string
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode } from "@binstruct/bencode";
 *
 * const coder = bencode();
 * const buf = new Uint8Array(32);
 * const written = coder.encode(new TextEncoder().encode("spam"), buf);
 * const [value, read] = coder.decode(buf.subarray(0, written));
 *
 * assertEquals(written, 6); // "4:spam"
 * assertEquals(read, 6);
 * assertEquals(new TextDecoder().decode(value as Uint8Array), "spam");
 * ```
 *
 * @example Round-trip a nested dict
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode, type BencodeDict } from "@binstruct/bencode";
 *
 * const enc = (s: string) => new TextEncoder().encode(s);
 * const coder = bencode();
 * const value: BencodeDict = [
 *   [enc("cow"), enc("moo")],
 *   [enc("spam"), enc("eggs")],
 * ];
 *
 * const buf = new Uint8Array(64);
 * const written = coder.encode(value, buf);
 * const [decoded, read] = coder.decode(buf.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(new TextDecoder().decode(buf.subarray(0, written)), "d3:cow3:moo4:spam4:eggse");
 * assertEquals(Array.isArray(decoded), true);
 * ```
 *
 * @module @binstruct/bencode
 */

import type { Coder } from "@hertzg/binstruct";

const TAG_INT = 0x69; // "i"
const TAG_LIST = 0x6c; // "l"
const TAG_DICT = 0x64; // "d"
const TAG_END = 0x65; // "e"
const TAG_COLON = 0x3a; // ":"
const TAG_MINUS = 0x2d; // "-"
const TAG_ZERO = 0x30; // "0"
const TAG_NINE = 0x39; // "9"

/**
 * A `[key, value]` pair within a bencode dict. Keys are raw bytes (not strings)
 * because bencode dict keys are byte strings, not necessarily valid UTF-8.
 */
export type BencodeDictEntry = [Uint8Array, BencodeValue];

/**
 * A bencode dict — ordered list of `[key, value]` pairs.
 *
 * The pair-array form is used (rather than `Map<Uint8Array, …>` or a plain
 * object) so that:
 * - byte-identical keys compare equal by content (a `Map` keyed by
 *   `Uint8Array` would key by reference);
 * - the spec-required lexicographic byte order is preserved verbatim;
 * - keys with non-UTF-8 bytes are representable.
 */
export type BencodeDict = BencodeDictEntry[];

/**
 * The full bencode value space.
 *
 * - `bigint` — integer (arbitrary precision)
 * - `Uint8Array` — byte string
 * - `BencodeValue[]` — list
 * - {@link BencodeDict} — dict (array of `[key, value]` pairs)
 */
export type BencodeValue =
  | bigint
  | Uint8Array
  | BencodeValue[]
  | BencodeDict;

const textEncoder = new TextEncoder();

/**
 * True when `value` looks like a `[key, value]` pair: a 2-element array whose
 * first slot is a `Uint8Array`. Used to disambiguate dicts (array of pairs)
 * from lists (array of values) during encode.
 */
function isDictEntry(value: unknown): value is BencodeDictEntry {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] instanceof Uint8Array
  );
}

/**
 * True when `value` looks like a {@link BencodeDict}: an array of dict entries.
 * Empty arrays are treated as lists by convention.
 */
function isDict(value: unknown): value is BencodeDict {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (const entry of value) {
    if (!isDictEntry(entry)) return false;
  }
  return true;
}

function writeAscii(target: Uint8Array, offset: number, text: string): number {
  return offset + textEncoder.encodeInto(text, target.subarray(offset)).written!;
}

function encodeInteger(value: bigint, target: Uint8Array): number {
  target[0] = TAG_INT;
  const end = writeAscii(target, 1, value.toString(10));
  target[end] = TAG_END;
  return end + 1;
}

function encodeByteString(value: Uint8Array, target: Uint8Array): number {
  let cursor = writeAscii(target, 0, value.length.toString(10));
  target[cursor++] = TAG_COLON;
  target.set(value, cursor);
  return cursor + value.length;
}

function encodeList(value: BencodeValue[], target: Uint8Array): number {
  target[0] = TAG_LIST;
  let cursor = 1;
  for (const item of value) {
    cursor += encodeValue(item, target.subarray(cursor));
  }
  target[cursor] = TAG_END;
  return cursor + 1;
}

function encodeDict(value: BencodeDict, target: Uint8Array): number {
  target[0] = TAG_DICT;
  let cursor = 1;
  for (const [key, val] of value) {
    cursor += encodeByteString(key, target.subarray(cursor));
    cursor += encodeValue(val, target.subarray(cursor));
  }
  target[cursor] = TAG_END;
  return cursor + 1;
}

function encodeValue(value: BencodeValue, target: Uint8Array): number {
  if (typeof value === "bigint") {
    return encodeInteger(value, target);
  }
  if (value instanceof Uint8Array) {
    return encodeByteString(value, target);
  }
  if (Array.isArray(value)) {
    return isDict(value) ? encodeDict(value, target) : encodeList(value, target);
  }
  throw new TypeError(
    `Cannot encode value of type ${typeof value} as bencode`,
  );
}

function isDigit(byte: number): boolean {
  return byte >= TAG_ZERO && byte <= TAG_NINE;
}

function decodeDecimal(
  encoded: Uint8Array,
  start: number,
  terminator: number,
): { value: bigint; end: number } {
  let cursor = start;
  if (cursor >= encoded.length) {
    throw new Error("bencode: unexpected end of input while reading number");
  }

  const negative = encoded[cursor] === TAG_MINUS;
  if (negative) cursor++;

  const digitsStart = cursor;
  while (cursor < encoded.length && isDigit(encoded[cursor])) {
    cursor++;
  }

  const digitCount = cursor - digitsStart;
  if (digitCount === 0) {
    throw new Error(`bencode: expected digit at offset ${digitsStart}`);
  }
  // Reject leading zeros ("i03e", "i-0e") and stray "-" before zero.
  if (
    digitCount > 1 && encoded[digitsStart] === TAG_ZERO ||
    negative && encoded[digitsStart] === TAG_ZERO
  ) {
    throw new Error(`bencode: invalid number with leading zero at ${start}`);
  }

  if (cursor >= encoded.length || encoded[cursor] !== terminator) {
    throw new Error(
      `bencode: expected terminator 0x${terminator.toString(16)} at offset ${cursor}`,
    );
  }

  const text = new TextDecoder("ascii").decode(
    encoded.subarray(digitsStart, cursor),
  );
  const magnitude = BigInt(text);
  return { value: negative ? -magnitude : magnitude, end: cursor };
}

function decodeInteger(
  encoded: Uint8Array,
): { value: bigint; bytesRead: number } {
  // encoded[0] is "i"; read until "e".
  const { value, end } = decodeDecimal(encoded, 1, TAG_END);
  return { value, bytesRead: end + 1 };
}

function decodeByteString(
  encoded: Uint8Array,
): { value: Uint8Array; bytesRead: number } {
  const { value: lengthBig, end } = decodeDecimal(encoded, 0, TAG_COLON);
  const length = Number(lengthBig);
  if (length < 0 || !Number.isSafeInteger(length)) {
    throw new Error(`bencode: invalid byte string length ${lengthBig}`);
  }

  const dataStart = end + 1;
  const dataEnd = dataStart + length;
  if (dataEnd > encoded.length) {
    throw new Error(
      `bencode: byte string of length ${length} extends past buffer`,
    );
  }

  return {
    value: encoded.slice(dataStart, dataEnd),
    bytesRead: dataEnd,
  };
}

function decodeList(
  encoded: Uint8Array,
): { value: BencodeValue[]; bytesRead: number } {
  // encoded[0] is "l".
  const items: BencodeValue[] = [];
  let cursor = 1;
  while (true) {
    if (cursor >= encoded.length) {
      throw new Error("bencode: unterminated list");
    }
    if (encoded[cursor] === TAG_END) {
      return { value: items, bytesRead: cursor + 1 };
    }
    const [item, read] = decodeValue(encoded.subarray(cursor));
    items.push(item);
    cursor += read;
  }
}

function decodeDict(
  encoded: Uint8Array,
): { value: BencodeDict; bytesRead: number } {
  // encoded[0] is "d".
  const entries: BencodeDict = [];
  let cursor = 1;
  while (true) {
    if (cursor >= encoded.length) {
      throw new Error("bencode: unterminated dict");
    }
    if (encoded[cursor] === TAG_END) {
      return { value: entries, bytesRead: cursor + 1 };
    }
    if (!isDigit(encoded[cursor])) {
      throw new Error(
        `bencode: dict keys must be byte strings, got 0x${
          encoded[cursor].toString(16)
        } at ${cursor}`,
      );
    }
    const { value: key, bytesRead: keyRead } = decodeByteString(
      encoded.subarray(cursor),
    );
    cursor += keyRead;
    const [val, valRead] = decodeValue(encoded.subarray(cursor));
    cursor += valRead;
    entries.push([key, val]);
  }
}

function decodeValue(encoded: Uint8Array): [BencodeValue, number] {
  if (encoded.length === 0) {
    throw new Error("bencode: unexpected end of input");
  }
  const tag = encoded[0];
  if (tag === TAG_INT) {
    const { value, bytesRead } = decodeInteger(encoded);
    return [value, bytesRead];
  }
  if (tag === TAG_LIST) {
    const { value, bytesRead } = decodeList(encoded);
    return [value, bytesRead];
  }
  if (tag === TAG_DICT) {
    const { value, bytesRead } = decodeDict(encoded);
    return [value, bytesRead];
  }
  if (isDigit(tag)) {
    const { value, bytesRead } = decodeByteString(encoded);
    return [value, bytesRead];
  }
  throw new Error(
    `bencode: unknown tag 0x${tag.toString(16)} at offset 0`,
  );
}

/**
 * Creates a `Coder<BencodeValue>` for the bencode serialization format.
 *
 * The returned coder is recursive and self-describing: `decode` dispatches on
 * the first byte (`i` integer, `l` list, `d` dict, `0`-`9` byte string).
 * `encode` dispatches on the runtime type of the value.
 *
 * ## Encode contract
 * - `bigint` → integer
 * - `Uint8Array` → byte string
 * - empty array `[]` → empty list
 * - non-empty array — if every element is a `[Uint8Array, BencodeValue]`
 *   pair it is treated as a {@link BencodeDict}; otherwise as a list. To
 *   force an empty dict, encode an empty array via {@link BencodeDict}
 *   (which is also empty `[]` — round-trip preserves a list, since lists
 *   and empty dicts are visually identical at the type level).
 *
 * ## Spec compliance
 * - The caller is responsible for emitting dict entries in
 *   lexicographic byte order, matching the BitTorrent spec.
 *   Encode does not sort or validate ordering.
 * - Decode rejects malformed input: leading zeros (`i03e`), `i-0e`,
 *   negative byte-string lengths, truncated containers, unknown tags.
 *
 * @returns A coder for arbitrary bencode values.
 *
 * @example Encode and decode an integer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode } from "@binstruct/bencode";
 *
 * const coder = bencode();
 * const buf = new Uint8Array(16);
 * const written = coder.encode(-3n, buf);
 * const [value, read] = coder.decode(buf.subarray(0, written));
 *
 * assertEquals(new TextDecoder().decode(buf.subarray(0, written)), "i-3e");
 * assertEquals(value, -3n);
 * assertEquals(read, written);
 * ```
 *
 * @example Encode and decode a list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode } from "@binstruct/bencode";
 *
 * const coder = bencode();
 * const enc = (s: string) => new TextEncoder().encode(s);
 * const list = [enc("spam"), 42n];
 *
 * const buf = new Uint8Array(32);
 * const written = coder.encode(list, buf);
 * const [decoded, read] = coder.decode(buf.subarray(0, written));
 *
 * assertEquals(new TextDecoder().decode(buf.subarray(0, written)), "l4:spami42ee");
 * assertEquals(written, read);
 * assertEquals((decoded as unknown[]).length, 2);
 * ```
 *
 * @example Encode and decode a dict
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode, type BencodeDict } from "@binstruct/bencode";
 *
 * const enc = (s: string) => new TextEncoder().encode(s);
 * const coder = bencode();
 * // Keys MUST be sorted lexicographically by raw bytes.
 * const value: BencodeDict = [
 *   [enc("cow"), enc("moo")],
 *   [enc("spam"), enc("eggs")],
 * ];
 *
 * const buf = new Uint8Array(64);
 * const written = coder.encode(value, buf);
 *
 * assertEquals(
 *   new TextDecoder().decode(buf.subarray(0, written)),
 *   "d3:cow3:moo4:spam4:eggse",
 * );
 * ```
 */
export function bencode(): Coder<BencodeValue> {
  return {
    encode: (value: BencodeValue, target: Uint8Array) =>
      encodeValue(value, target),
    decode: (encoded: Uint8Array) => decodeValue(encoded),
  } as Coder<BencodeValue>;
}

/**
 * Convenience constructor for a {@link BencodeDict} entry. Encodes the key
 * argument as UTF-8 if it's a string, otherwise passes it through.
 *
 * @param key Dict key as UTF-8 string or raw bytes.
 * @param value The associated bencode value.
 * @returns A `[Uint8Array, BencodeValue]` pair suitable for a dict.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bencode, dictEntry } from "@binstruct/bencode";
 *
 * const coder = bencode();
 * const buf = new Uint8Array(32);
 * const written = coder.encode([
 *   dictEntry("cow", new TextEncoder().encode("moo")),
 * ], buf);
 *
 * assertEquals(new TextDecoder().decode(buf.subarray(0, written)), "d3:cow3:mooe");
 * ```
 */
export function dictEntry(
  key: string | Uint8Array,
  value: BencodeValue,
): BencodeDictEntry {
  return [typeof key === "string" ? textEncoder.encode(key) : key, value];
}
