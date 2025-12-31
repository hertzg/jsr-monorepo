import { assertEquals, assertNotEquals } from "@std/assert";
import {
  crc8,
  CRC8_CCITT_POLYNOMIAL,
  CRC8_MAXIM_POLYNOMIAL,
  createCrc8,
} from "./crc8.ts";

const TEST_DATA = new TextEncoder().encode("123456789");

Deno.test("crc8() - known test vector with default polynomial", () => {
  assertEquals(crc8(TEST_DATA), 0xa1);
});

Deno.test("crc8() - with custom polynomial", () => {
  assertEquals(crc8(TEST_DATA, CRC8_CCITT_POLYNOMIAL), 0x20);
});

Deno.test("createCrc8(CRC8_MAXIM_POLYNOMIAL) - known test vector", () => {
  const crc8fn = createCrc8(CRC8_MAXIM_POLYNOMIAL);
  assertEquals(crc8fn(TEST_DATA), 0xa1);
});

Deno.test("createCrc8() - empty data", () => {
  const crc8fn = createCrc8(CRC8_MAXIM_POLYNOMIAL);
  assertEquals(crc8fn(new Uint8Array(0)), 0);
});

Deno.test("createCrc8() - different polynomials produce different results", () => {
  const crc8ccitt = createCrc8(CRC8_CCITT_POLYNOMIAL);
  const crc8maxim = createCrc8(CRC8_MAXIM_POLYNOMIAL);
  assertNotEquals(crc8ccitt(TEST_DATA), crc8maxim(TEST_DATA));
});

Deno.test("CRC8 polynomial constants", () => {
  assertEquals(CRC8_CCITT_POLYNOMIAL, 0xe0);
  assertEquals(CRC8_MAXIM_POLYNOMIAL, 0x8c);
});
