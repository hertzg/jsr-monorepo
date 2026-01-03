/**
 * CRC64 implementation with configurable polynomials.
 *
 * Uses BigInt for 64-bit precision.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc64, CRC64_ECMA_POLYNOMIAL } from "@hertzg/crc/crc64";
 *
 * const crc64 = createCrc64(CRC64_ECMA_POLYNOMIAL);
 *
 * assertEquals(crc64(new TextEncoder().encode("123456789")), 0x995dc9bbdf1939fan);
 * ```
 *
 * @module
 */

import { memoize } from "@std/cache/memoize";
import { createCrcBigint } from "./internal/create_crc_bigint.ts";

/** CRC64-ECMA polynomial (XZ, 7z). */
export const CRC64_ECMA_POLYNOMIAL = 0xc96c5795d7870f42n;

/** CRC64-ISO polynomial (ISO 3309). */
export const CRC64_ISO_POLYNOMIAL = 0xd800000000000000n;

const CRC64_MASK = 0xffffffffffffffffn;

/**
 * Creates a CRC64 function for the given polynomial.
 *
 * Uses BigInt for 64-bit precision. The polynomial must be a BigInt.
 *
 * @param polynomial The CRC64 polynomial to use (must be BigInt)
 * @returns A function that calculates CRC64 for given data
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc64, CRC64_ECMA_POLYNOMIAL } from "@hertzg/crc/crc64";
 *
 * const crc64 = createCrc64(CRC64_ECMA_POLYNOMIAL);
 *
 * assertEquals(crc64(new TextEncoder().encode("123456789")), 0x995dc9bbdf1939fan);
 * ```
 */
export const createCrc64 = (
  polynomial: bigint,
): (data: Uint8Array) => bigint =>
  createCrcBigint(polynomial, CRC64_MASK, CRC64_MASK);

/**
 * Memoized version of {@link createCrc64}.
 *
 * Calling with the same polynomial returns the cached function.
 *
 * @param polynomial The CRC64 polynomial to use (must be BigInt)
 * @returns A function that calculates CRC64 for given data
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { memoizedCreateCrc64, CRC64_ECMA_POLYNOMIAL } from "@hertzg/crc/crc64";
 *
 * const crc64 = memoizedCreateCrc64(CRC64_ECMA_POLYNOMIAL);
 *
 * assertEquals(crc64(new TextEncoder().encode("123456789")), 0x995dc9bbdf1939fan);
 * ```
 */
export const memoizedCreateCrc64: (
  polynomial: bigint,
) => (data: Uint8Array) => bigint = memoize(createCrc64);

/**
 * Calculates CRC64 checksum for the given data.
 *
 * Uses CRC64-ECMA polynomial (XZ, 7z) by default.
 *
 * @param data The data to calculate CRC for
 * @param polynomial The polynomial to use (default: CRC64_ECMA_POLYNOMIAL)
 * @returns The CRC64 checksum as BigInt
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crc64 } from "@hertzg/crc/crc64";
 *
 * assertEquals(crc64(new TextEncoder().encode("123456789")), 0x995dc9bbdf1939fan);
 * ```
 */
export const crc64 = (
  data: Uint8Array,
  polynomial: bigint = CRC64_ECMA_POLYNOMIAL,
): bigint => memoizedCreateCrc64(polynomial)(data);
