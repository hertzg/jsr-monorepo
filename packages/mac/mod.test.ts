import { assertEquals, assertThrows } from "@std/assert";
import { MAC_BYTE_LENGTH, parseMac, stringifyMac } from "@hertzg/mac";

Deno.test("parseMac: colon-delimited", () => {
  assertEquals(
    parseMac("00:11:22:33:44:55"),
    new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
  );
});

Deno.test("parseMac: hyphen-delimited", () => {
  assertEquals(
    parseMac("AA-BB-CC-DD-EE-FF"),
    new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
  );
});

Deno.test("parseMac: case-insensitive", () => {
  assertEquals(parseMac("aA:bB:cC:dD:eE:fF"), parseMac("AA:BB:CC:DD:EE:FF"));
});

Deno.test("parseMac: all-zero and broadcast", () => {
  assertEquals(parseMac("00:00:00:00:00:00"), new Uint8Array(6));
  assertEquals(parseMac("ff:ff:ff:ff:ff:ff"), new Uint8Array(6).fill(0xff));
});

Deno.test("parseMac: rejects wrong octet count", () => {
  assertThrows(() => parseMac("aa:bb:cc:dd:ee"), TypeError);
  assertThrows(() => parseMac("aa:bb:cc:dd:ee:ff:00"), TypeError);
  assertThrows(() => parseMac(""), TypeError);
});

Deno.test("parseMac: rejects single-digit or oversized octets", () => {
  assertThrows(() => parseMac("a:bb:cc:dd:ee:ff"), TypeError);
  assertThrows(() => parseMac("aaa:bb:cc:dd:ee:ff"), TypeError);
});

Deno.test("parseMac: rejects non-hex characters", () => {
  assertThrows(() => parseMac("aa:bb:cc:dd:ee:gg"), TypeError);
  assertThrows(() => parseMac("aa:bb:cc:dd:ee:zz"), TypeError);
});

Deno.test("parseMac: rejects mixed delimiters", () => {
  assertThrows(() => parseMac("aa:bb-cc:dd-ee:ff"), TypeError);
});

Deno.test("parseMac: rejects undelimited form", () => {
  assertThrows(() => parseMac("aabbccddeeff"), TypeError);
});

Deno.test("stringifyMac: default colon delimiter, lowercase", () => {
  assertEquals(
    stringifyMac(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff])),
    "aa:bb:cc:dd:ee:ff",
  );
});

Deno.test("stringifyMac: hyphen delimiter", () => {
  assertEquals(
    stringifyMac(new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]), "-"),
    "00-11-22-33-44-55",
  );
});

Deno.test("stringifyMac: pads single-digit octets", () => {
  assertEquals(stringifyMac(new Uint8Array(6)), "00:00:00:00:00:00");
  assertEquals(
    stringifyMac(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x0f])),
    "01:02:03:04:05:0f",
  );
});

Deno.test("stringifyMac: rejects wrong byte length", () => {
  assertThrows(() => stringifyMac(new Uint8Array(5)), TypeError);
  assertThrows(() => stringifyMac(new Uint8Array(7)), TypeError);
  assertThrows(() => stringifyMac(new Uint8Array(0)), TypeError);
});

Deno.test("round-trip: parse → stringify", () => {
  const cases = [
    "00:00:00:00:00:00",
    "ff:ff:ff:ff:ff:ff",
    "01:23:45:67:89:ab",
    "de:ad:be:ef:00:01",
  ];
  for (const mac of cases) {
    assertEquals(stringifyMac(parseMac(mac)), mac);
  }
});

Deno.test("MAC_BYTE_LENGTH constant", () => {
  assertEquals(MAC_BYTE_LENGTH, 6);
});
