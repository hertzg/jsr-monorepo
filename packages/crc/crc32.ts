/**
 * CRC32 implementation with configurable polynomials.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc32, CRC32_POLYNOMIAL } from "@hertzg/crc/crc32";
 *
 * const crc32 = createCrc32(CRC32_POLYNOMIAL);
 *
 * assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
 * ```
 *
 * @module
 */

import { createCrcNumber } from "./_internal.ts";

/** Standard CRC32 polynomial (ISO 3309, PNG, ZIP, gzip). */
export const CRC32_POLYNOMIAL = 0xedb88320;

/** CRC32C polynomial (iSCSI, SCTP, ext4). Also known as Castagnoli. */
export const CRC32C_POLYNOMIAL = 0x82f63b78;

/** CRC32K polynomial (Koopman). */
export const CRC32K_POLYNOMIAL = 0xeb31d82e;

/**
 * Creates a CRC32 function for the given polynomial.
 *
 * @param polynomial The CRC32 polynomial to use
 * @returns A function that calculates CRC32 for given data
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc32, CRC32_POLYNOMIAL } from "@hertzg/crc/crc32";
 *
 * const crc32 = createCrc32(CRC32_POLYNOMIAL);
 *
 * assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
 * ```
 */
export const createCrc32 = (polynomial: number): ((data: Uint8Array) => number) =>
  createCrcNumber(Uint32Array, polynomial, 0xffffffff, 0xffffffff);

/**
 * Calculates CRC32 checksum for the given data.
 *
 * Uses standard CRC32 polynomial (ISO 3309, PNG, ZIP, gzip) by default.
 *
 * @param data The data to calculate CRC for
 * @param polynomial The polynomial to use (default: CRC32_POLYNOMIAL)
 * @returns The CRC32 checksum
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crc32 } from "@hertzg/crc/crc32";
 *
 * assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
 * ```
 */
export const crc32 = (
  data: Uint8Array,
  polynomial: number = CRC32_POLYNOMIAL,
): number => createCrc32(polynomial)(data);
