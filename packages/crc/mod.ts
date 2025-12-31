/**
 * CRC implementation with configurable polynomials.
 *
 * A pure TypeScript CRC library supporting CRC8, CRC16, CRC32, and CRC64.
 * Use the simple `crc*` helpers with default polynomials, or the `createCrc*`
 * factory functions for custom polynomials.
 *
 * @example Simple usage with default polynomials
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crc32, crc64 } from "@hertzg/crc";
 *
 * assertEquals(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
 * assertEquals(crc64(new TextEncoder().encode("123456789")), 0x995dc9bbdf1939fan);
 * ```
 *
 * @example Custom polynomial with factory function
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
  crc8,
  CRC8_CCITT_POLYNOMIAL,
  CRC8_MAXIM_POLYNOMIAL,
  createCrc8,
} from "./crc8.ts";

export {
  crc16,
  CRC16_CCITT_POLYNOMIAL,
  CRC16_IBM_POLYNOMIAL,
  createCrc16,
} from "./crc16.ts";

export {
  crc32,
  CRC32_POLYNOMIAL,
  CRC32C_POLYNOMIAL,
  CRC32K_POLYNOMIAL,
  createCrc32,
} from "./crc32.ts";

export {
  crc64,
  CRC64_ECMA_POLYNOMIAL,
  CRC64_ISO_POLYNOMIAL,
  createCrc64,
} from "./crc64.ts";
