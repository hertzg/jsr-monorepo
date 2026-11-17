import { test } from "node:test";
import { assertEquals, assertNotEquals } from "@std/assert";
import {
  crc64,
  CRC64_ECMA_POLYNOMIAL,
  CRC64_ISO_POLYNOMIAL,
  createCrc64,
} from "./crc64.ts";

const TEST_DATA = new TextEncoder().encode("123456789");

test("crc64() - known test vector with default polynomial", () => {
  assertEquals(crc64(TEST_DATA), 0x995dc9bbdf1939fan);
});

test("crc64() - with custom polynomial", () => {
  assertEquals(crc64(TEST_DATA, CRC64_ISO_POLYNOMIAL), 0xb90956c775a41001n);
});

test("createCrc64(CRC64_ECMA_POLYNOMIAL) - known test vector", () => {
  const crc64fn = createCrc64(CRC64_ECMA_POLYNOMIAL);
  assertEquals(crc64fn(TEST_DATA), 0x995dc9bbdf1939fan);
});

test("createCrc64() - empty data", () => {
  const crc64fn = createCrc64(CRC64_ECMA_POLYNOMIAL);
  assertEquals(crc64fn(new Uint8Array(0)), 0n);
});

test("createCrc64() - different polynomials produce different results", () => {
  const crc64ecma = createCrc64(CRC64_ECMA_POLYNOMIAL);
  const crc64iso = createCrc64(CRC64_ISO_POLYNOMIAL);
  assertNotEquals(crc64ecma(TEST_DATA), crc64iso(TEST_DATA));
});

test("CRC64 polynomial constants", () => {
  assertEquals(CRC64_ECMA_POLYNOMIAL, 0xc96c5795d7870f42n);
  assertEquals(CRC64_ISO_POLYNOMIAL, 0xd800000000000000n);
});
