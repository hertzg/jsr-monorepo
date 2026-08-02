/**
 * CRC implementation with configurable polynomials.
 *
 * A pure TypeScript CRC library supporting CRC8, CRC16, CRC32, and CRC64.
 *
 * Each width is exposed at three layers:
 * - One-shot: `crc8` / `crc16` / `crc32` / `crc64` — convenience helpers that
 *   use a conventional default polynomial.
 * - Factory: `createCrc8` / etc. — return a reusable function bound to a
 *   specific polynomial (each call builds the lookup table).
 * - Memoized factory: `memoizedCreateCrc8` / etc. — same as the factory, but
 *   repeated calls with the same polynomial reuse the cached function.
 *
 * @example One-shot helpers with default polynomials
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crc32, crc64 } from "@hertzg/crc";
 *
 * assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
 * assertEquals(crc64(new TextEncoder().encode("123456789")), 0x995dc9bbdf1939fan);
 * ```
 *
 * @example Factory with a custom polynomial (CRC32C / Castagnoli)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createCrc32, CRC32C_POLYNOMIAL } from "@hertzg/crc";
 *
 * const crc32c = createCrc32(CRC32C_POLYNOMIAL);
 *
 * assertEquals(crc32c(new TextEncoder().encode("123456789")), 0xe3069283);
 * ```
 *
 * @module
 */

export {
  /** Calculates CRC8 checksum for the given data, using CRC8-Maxim by default. */
  crc8,
  /** CRC8-CCITT polynomial (ATM HEC). */
  CRC8_CCITT_POLYNOMIAL,
  /** CRC8-Maxim/Dallas polynomial (1-Wire, iButton). */
  CRC8_MAXIM_POLYNOMIAL,
  /** Creates a CRC8 function for the given polynomial. */
  createCrc8,
  /** Memoized version of createCrc8. */
  memoizedCreateCrc8,
} from "./crc8.ts";

export {
  /** Calculates CRC16 checksum for the given data, using CRC16-CCITT by default. */
  crc16,
  /** CRC16-CCITT polynomial (X.25, HDLC, Bluetooth). */
  CRC16_CCITT_POLYNOMIAL,
  /** CRC16-IBM/ANSI polynomial (USB, Modbus). */
  CRC16_IBM_POLYNOMIAL,
  /** Creates a CRC16 function for the given polynomial. */
  createCrc16,
  /** Memoized version of createCrc16. */
  memoizedCreateCrc16,
} from "./crc16.ts";

export {
  /** Calculates CRC32 checksum for the given data, using the standard CRC32 polynomial by default. */
  crc32,
  /** Standard CRC32 polynomial (ISO 3309, PNG, ZIP, gzip). */
  CRC32_POLYNOMIAL,
  /** CRC32C polynomial (iSCSI, SCTP, ext4). Also known as Castagnoli. */
  CRC32C_POLYNOMIAL,
  /** CRC32K polynomial (Koopman). Designed for improved Hamming-distance coverage. */
  CRC32K_POLYNOMIAL,
  /** Creates a CRC32 function for the given polynomial. */
  createCrc32,
  /** Memoized version of createCrc32. */
  memoizedCreateCrc32,
} from "./crc32.ts";

export {
  /** Calculates CRC64 checksum for the given data, using CRC64-ECMA by default. */
  crc64,
  /** CRC64-ECMA polynomial (XZ, 7z). */
  CRC64_ECMA_POLYNOMIAL,
  /** CRC64-ISO polynomial (ISO 3309). */
  CRC64_ISO_POLYNOMIAL,
  /** Creates a CRC64 function for the given polynomial. */
  createCrc64,
  /** Memoized version of createCrc64. */
  memoizedCreateCrc64,
} from "./crc64.ts";
