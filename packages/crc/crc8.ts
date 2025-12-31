/**
 * CRC8 implementation with configurable polynomials.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc8, CRC8_MAXIM_POLYNOMIAL } from "@hertzg/crc/crc8";
 *
 * const crc8 = createCrc8(CRC8_MAXIM_POLYNOMIAL);
 *
 * assertEquals(crc8(new TextEncoder().encode("123456789")), 0xa1);
 * ```
 *
 * @module
 */

import { memoize } from "@std/cache/memoize";
import { createCrcNumber } from "./internal/create_crc_number.ts";

/** CRC8-CCITT polynomial (ATM HEC). */
export const CRC8_CCITT_POLYNOMIAL = 0xe0;

/** CRC8-Maxim/Dallas polynomial (1-Wire, iButton). */
export const CRC8_MAXIM_POLYNOMIAL = 0x8c;

/**
 * Creates a CRC8 function for the given polynomial.
 *
 * Uses init=0x00 and xor=0x00 (common for CRC8 variants like Maxim/Dallas).
 *
 * @param polynomial The CRC8 polynomial to use
 * @returns A function that calculates CRC8 for given data
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc8, CRC8_MAXIM_POLYNOMIAL } from "@hertzg/crc/crc8";
 *
 * const crc8 = createCrc8(CRC8_MAXIM_POLYNOMIAL);
 *
 * assertEquals(crc8(new TextEncoder().encode("123456789")), 0xa1);
 * ```
 */
export const createCrc8 = (
  polynomial: number,
): ((data: Uint8Array) => number) =>
  createCrcNumber(Uint8Array, polynomial, 0, 0);

/**
 * Memoized version of {@link createCrc8}.
 *
 * Calling with the same polynomial returns the cached function.
 *
 * @param polynomial The CRC8 polynomial to use
 * @returns A function that calculates CRC8 for given data
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { memoizedCreateCrc8, CRC8_MAXIM_POLYNOMIAL } from "@hertzg/crc/crc8";
 *
 * const crc8 = memoizedCreateCrc8(CRC8_MAXIM_POLYNOMIAL);
 *
 * assertEquals(crc8(new TextEncoder().encode("123456789")), 0xa1);
 * ```
 */
export const memoizedCreateCrc8: (
  polynomial: number,
) => (data: Uint8Array) => number = memoize(createCrc8);

/**
 * Calculates CRC8 checksum for the given data.
 *
 * Uses CRC8-Maxim polynomial by default.
 *
 * @param data The data to calculate CRC for
 * @param polynomial The polynomial to use (default: CRC8_MAXIM_POLYNOMIAL)
 * @returns The CRC8 checksum
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crc8 } from "@hertzg/crc/crc8";
 *
 * assertEquals(crc8(new TextEncoder().encode("123456789")), 0xa1);
 * ```
 */
export const crc8 = (
  data: Uint8Array,
  polynomial: number = CRC8_MAXIM_POLYNOMIAL,
): number => memoizedCreateCrc8(polynomial)(data);
