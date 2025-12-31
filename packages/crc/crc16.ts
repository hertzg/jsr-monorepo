/**
 * CRC16 implementation with configurable polynomials.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc16, CRC16_CCITT_POLYNOMIAL } from "@hertzg/crc/crc16";
 *
 * const crc16 = createCrc16(CRC16_CCITT_POLYNOMIAL);
 *
 * assertEquals(crc16(new TextEncoder().encode("123456789")), 0x906e);
 * ```
 *
 * @module
 */

import { createCrcNumber } from "./_internal.ts";

/** CRC16-CCITT polynomial (X.25, HDLC, Bluetooth). */
export const CRC16_CCITT_POLYNOMIAL = 0x8408;

/** CRC16-IBM/ANSI polynomial (USB, Modbus). */
export const CRC16_IBM_POLYNOMIAL = 0xa001;

/**
 * Creates a CRC16 function for the given polynomial.
 *
 * @param polynomial The CRC16 polynomial to use
 * @returns A function that calculates CRC16 for given data
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc16, CRC16_CCITT_POLYNOMIAL } from "@hertzg/crc/crc16";
 *
 * const crc16 = createCrc16(CRC16_CCITT_POLYNOMIAL);
 *
 * assertEquals(crc16(new TextEncoder().encode("123456789")), 0x906e);
 * ```
 */
export const createCrc16 = (polynomial: number): ((data: Uint8Array) => number) =>
  createCrcNumber(Uint16Array, polynomial, 0xffff, 0xffff);

/**
 * Calculates CRC16 checksum for the given data.
 *
 * Uses CRC16-CCITT polynomial by default.
 *
 * @param data The data to calculate CRC for
 * @param polynomial The polynomial to use (default: CRC16_CCITT_POLYNOMIAL)
 * @returns The CRC16 checksum
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crc16 } from "@hertzg/crc/crc16";
 *
 * assertEquals(crc16(new TextEncoder().encode("123456789")), 0x906e);
 * ```
 */
export const crc16 = (
  data: Uint8Array,
  polynomial: number = CRC16_CCITT_POLYNOMIAL,
): number => createCrc16(polynomial)(data);
