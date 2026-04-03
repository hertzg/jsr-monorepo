import type { gCharP, gDouble, gInt, gUInt32 } from "./_g_types.ts";

const parseAsInt = <T extends number>(s: string): T => parseInt(s, 10) as T;
const parseAsString = <T extends string>(s: string) => s && (String(s) as T);
const parseAsDecimal = <T extends string>(s: string) => s;

/**
 * Parses a string to an integer, returning `0` for null or undefined input.
 *
 * @param s - The string to parse.
 * @returns The parsed integer, or `0` if the input is null/undefined.
 */
export const atoi = <T extends number>(s: string): T | 0 =>
  typeof s === "undefined" || s === null ? 0 : parseAsInt<T>(s);

/**
 * Parses a string as a {@linkcode gInt}.
 *
 * @param s - The string to parse.
 * @returns The parsed integer value.
 */
export const parseGInt = (s: string): gInt => parseAsInt<gInt>(s);

/**
 * Parses a string as a {@linkcode gUInt32}.
 *
 * @param s - The string to parse.
 * @returns The parsed unsigned 32-bit integer value.
 */
export const parseGUInt32 = (s: string): gUInt32 => parseAsInt<gUInt32>(s);

/**
 * Parses a string as a {@linkcode gCharP}.
 *
 * @param s - The string to parse.
 * @returns The string value, or a falsy value if the input is empty.
 */
export const parseGCharP = (s: string): gCharP => parseAsString<gCharP>(s);

/**
 * Parses a string as a {@linkcode gDouble}, preserving the original string
 * representation to avoid floating-point precision loss.
 *
 * @param s - The string to parse.
 * @returns The string-encoded double value.
 */
export const parseGDouble = (s: string): gDouble => parseAsDecimal<gDouble>(s);
