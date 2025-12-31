import { assertEquals, assertNotEquals } from "@std/assert";
import {
  crc32,
  CRC32_POLYNOMIAL,
  CRC32C_POLYNOMIAL,
  CRC32K_POLYNOMIAL,
  createCrc32,
} from "./crc32.ts";

const TEST_DATA = new TextEncoder().encode("123456789");

Deno.test("crc32() - known test vector with default polynomial", () => {
  assertEquals(crc32(TEST_DATA), 0xcbf43926);
});

Deno.test("crc32() - with custom polynomial", () => {
  assertEquals(crc32(TEST_DATA, CRC32C_POLYNOMIAL), 0xe3069283);
});

Deno.test("createCrc32(CRC32_POLYNOMIAL) - known test vector", () => {
  const crc32fn = createCrc32(CRC32_POLYNOMIAL);
  assertEquals(crc32fn(TEST_DATA), 0xcbf43926);
});

Deno.test("createCrc32(CRC32_POLYNOMIAL) - empty data", () => {
  const crc32fn = createCrc32(CRC32_POLYNOMIAL);
  assertEquals(crc32fn(new Uint8Array(0)), 0);
});

Deno.test("createCrc32(CRC32_POLYNOMIAL) - single byte", () => {
  const crc32fn = createCrc32(CRC32_POLYNOMIAL);
  assertEquals(crc32fn(new Uint8Array([0x00])), 0xd202ef8d);
});

Deno.test("createCrc32(CRC32C_POLYNOMIAL) - known test vector", () => {
  const crc32c = createCrc32(CRC32C_POLYNOMIAL);
  assertEquals(crc32c(TEST_DATA), 0xe3069283);
});

Deno.test("createCrc32() - different polynomials produce different results", () => {
  const crc32std = createCrc32(CRC32_POLYNOMIAL);
  const crc32c = createCrc32(CRC32C_POLYNOMIAL);
  const crc32k = createCrc32(CRC32K_POLYNOMIAL);

  const result1 = crc32std(TEST_DATA);
  const result2 = crc32c(TEST_DATA);
  const result3 = crc32k(TEST_DATA);

  assertNotEquals(result1, result2);
  assertNotEquals(result2, result3);
  assertNotEquals(result1, result3);
});

Deno.test("createCrc32(CRC32_POLYNOMIAL) - matches node:zlib crc32", async () => {
  const { crc32: nodeCrc32 } = await import("node:zlib");
  const ourCrc32 = createCrc32(CRC32_POLYNOMIAL);

  const testCases = [
    new Uint8Array(0),
    new Uint8Array([0x00]),
    new Uint8Array([0xff]),
    TEST_DATA,
    new TextEncoder().encode("hello world"),
    new Uint8Array(1000).fill(0xaa),
  ];

  for (const data of testCases) {
    assertEquals(ourCrc32(data), nodeCrc32(data));
  }
});

Deno.test("CRC32 polynomial constants", () => {
  assertEquals(CRC32_POLYNOMIAL, 0xedb88320);
  assertEquals(CRC32C_POLYNOMIAL, 0x82f63b78);
  assertEquals(CRC32K_POLYNOMIAL, 0xeb31d82e);
});
