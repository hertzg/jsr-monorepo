/**
 * A module providing type-safe binary structure encoding and decoding utilities for TypeScript.
 *
 * The following data types are supported:
 * - Unsigned integers: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - Signed integers: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - Floating point numbers: 16, 32, 64 bits (big-endian and little-endian)
 * - Strings: length-prefixed and null-terminated
 * - Arrays: variable-length arrays with configurable length encoding
 * - Structs: complex nested data structures
 *
 * To encode data to binary, use the various coder functions and call their `encode` method.
 * To decode data from binary, use the same coder functions and call their `decode` method.
 *
 * The module provides the following main functions:
 * - {@link struct}: Create coders for structured data
 * - {@link stringLP}: Create coders for length-prefixed strings
 * - {@link stringNT}: Create coders for null-terminated strings
 * - {@link arrayLP}: Create coders for arrays
 * - Numeric coders: `u8`, `u16`, `u32`, `u64`, `s8`, `s16`, `s32`, `s64`, `f16`, `f32`, `f64`
 *
 * @example Reading and writing structured data with arrays:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { stringLP } from "@hertzg/binstruct/string";
 * import { arrayLP } from "@hertzg/binstruct/array";
 * import { u32be, u16be, u8be, f64be } from "@hertzg/binstruct/numeric";
 *
 * // Define a user profile structure
 * const userProfileCoder = struct({
 *   id: u32be,
 *   name: stringLP(u16be),
 *   age: u8be,
 *   score: f64be,
 *   isActive: u8be, // boolean as 0/1
 * });
 *
 * // Define a team structure containing an array of user profiles
 * const teamCoder = struct({
 *   teamId: u32be,
 *   teamName: stringLP(u16be),
 *   members: arrayLP(userProfileCoder, u16be),
 *   createdAt: u32be,
 * });
 *
 * // Create team data with array of user profiles
 * const team = {
 *   teamId: 1001,
 *   teamName: "Engineering Team",
 *   members: [
 *     {
 *       id: 1,
 *       name: "Alice Johnson",
 *       age: 28,
 *       score: 95.5,
 *       isActive: 1,
 *     },
 *     {
 *       id: 2,
 *       name: "Bob Smith",
 *       age: 32,
 *       score: 87.2,
 *       isActive: 1,
 *     },
 *     {
 *       id: 3,
 *       name: "Carol Davis",
 *       age: 25,
 *       score: 92.8,
 *       isActive: 0,
 *     },
 *   ],
 *   createdAt: 1704067200,
 * };
 *
 * // Encode to binary
 * const buffer = new Uint8Array(2048);
 * const bytesWritten = teamCoder.encode(team, buffer);
 *
 * // Decode from binary
 * const [decoded, bytesRead] = teamCoder.decode(buffer);
 * assertEquals(decoded, team, 'team data should be identical after roundtrip');
 * assertEquals(bytesWritten, bytesRead, 'bytes written should equal bytes read');
 * ```
 * @module
 */

export type ValueWithBytes<T> = [T, number];

export type Context = {
  direction: "encode" | "decode";
  refs: WeakMap<Coder<any>, any>;
};

export type Encoder<TDecoded> = (
  decoded: TDecoded,
  target: Uint8Array,
  context?: Context,
) => number;
export type Decoder<TDecoded> = (
  encoded: Uint8Array,
  context?: Context,
) => ValueWithBytes<TDecoded>;

export type Coder<TDecoded> = {
  encode: Encoder<TDecoded>;
  decode: Decoder<TDecoded>;
};

export * from "./array.ts";
export * from "./numeric.ts";
export * from "./string.ts";
export * from "./struct.ts";
export * from "./ref.ts";
