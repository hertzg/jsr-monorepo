import { assertEquals, assertThrows } from "@std/assert";
import { MAC_BYTE_LENGTH, parse, stringify } from "@hertzg/mac";

Deno.test("parse: colon-delimited", () => {
  assertEquals(
    parse("00:11:22:33:44:55"),
    new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
  );
});

Deno.test("parse: hyphen-delimited", () => {
  assertEquals(
    parse("AA-BB-CC-DD-EE-FF"),
    new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
  );
});

Deno.test("parse: case-insensitive", () => {
  assertEquals(parse("aA:bB:cC:dD:eE:fF"), parse("AA:BB:CC:DD:EE:FF"));
});

Deno.test("parse: all-zero and broadcast", () => {
  assertEquals(parse("00:00:00:00:00:00"), new Uint8Array(6));
  assertEquals(parse("ff:ff:ff:ff:ff:ff"), new Uint8Array(6).fill(0xff));
});

Deno.test("parse: rejects wrong octet count", () => {
  assertThrows(() => parse("aa:bb:cc:dd:ee"), TypeError);
  assertThrows(() => parse("aa:bb:cc:dd:ee:ff:00"), TypeError);
  assertThrows(() => parse(""), TypeError);
});

Deno.test("parse: rejects single-digit or oversized octets", () => {
  assertThrows(() => parse("a:bb:cc:dd:ee:ff"), TypeError);
  assertThrows(() => parse("aaa:bb:cc:dd:ee:ff"), TypeError);
});

Deno.test("parse: rejects non-hex characters", () => {
  assertThrows(() => parse("aa:bb:cc:dd:ee:gg"), TypeError);
  assertThrows(() => parse("aa:bb:cc:dd:ee:zz"), TypeError);
});

Deno.test("parse: rejects mixed delimiters", () => {
  assertThrows(() => parse("aa:bb-cc:dd-ee:ff"), TypeError);
});

Deno.test("parse: rejects undelimited form", () => {
  assertThrows(() => parse("aabbccddeeff"), TypeError);
});

Deno.test("stringify: default colon delimiter, lowercase", () => {
  assertEquals(
    stringify(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff])),
    "aa:bb:cc:dd:ee:ff",
  );
});

Deno.test("stringify: hyphen delimiter", () => {
  assertEquals(
    stringify(new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]), "-"),
    "00-11-22-33-44-55",
  );
});

Deno.test("stringify: pads single-digit octets", () => {
  assertEquals(stringify(new Uint8Array(6)), "00:00:00:00:00:00");
  assertEquals(
    stringify(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x0f])),
    "01:02:03:04:05:0f",
  );
});

Deno.test("stringify: rejects wrong byte length", () => {
  assertThrows(() => stringify(new Uint8Array(5)), TypeError);
  assertThrows(() => stringify(new Uint8Array(7)), TypeError);
  assertThrows(() => stringify(new Uint8Array(0)), TypeError);
});

Deno.test("round-trip: parse → stringify", () => {
  const cases = [
    "00:00:00:00:00:00",
    "ff:ff:ff:ff:ff:ff",
    "01:23:45:67:89:ab",
    "de:ad:be:ef:00:01",
  ];
  for (const mac of cases) {
    assertEquals(stringify(parse(mac)), mac);
  }
});

Deno.test("MAC_BYTE_LENGTH constant", () => {
  assertEquals(MAC_BYTE_LENGTH, 6);
});
