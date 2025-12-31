import { assertEquals, assertNotEquals } from "@std/assert";
import {
  crc16,
  CRC16_CCITT_POLYNOMIAL,
  CRC16_IBM_POLYNOMIAL,
  createCrc16,
} from "./crc16.ts";

const TEST_DATA = new TextEncoder().encode("123456789");

Deno.test("crc16() - known test vector with default polynomial", () => {
  assertEquals(crc16(TEST_DATA), 0x906e);
});

Deno.test("crc16() - with custom polynomial", () => {
  assertEquals(crc16(TEST_DATA, CRC16_IBM_POLYNOMIAL), 0xb4c8);
});

Deno.test("createCrc16(CRC16_CCITT_POLYNOMIAL) - known test vector", () => {
  const crc16fn = createCrc16(CRC16_CCITT_POLYNOMIAL);
  assertEquals(crc16fn(TEST_DATA), 0x906e);
});

Deno.test("createCrc16() - empty data", () => {
  const crc16fn = createCrc16(CRC16_CCITT_POLYNOMIAL);
  assertEquals(crc16fn(new Uint8Array(0)), 0);
});

Deno.test("createCrc16() - different polynomials produce different results", () => {
  const crc16ccitt = createCrc16(CRC16_CCITT_POLYNOMIAL);
  const crc16ibm = createCrc16(CRC16_IBM_POLYNOMIAL);
  assertNotEquals(crc16ccitt(TEST_DATA), crc16ibm(TEST_DATA));
});

Deno.test("CRC16 polynomial constants", () => {
  assertEquals(CRC16_CCITT_POLYNOMIAL, 0x8408);
  assertEquals(CRC16_IBM_POLYNOMIAL, 0xa001);
});
