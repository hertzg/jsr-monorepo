import { assertEquals, assertThrows } from "@std/assert";
import { decodeWord, encodeWord } from "./word.ts";

Deno.test("encodeWord - empty string", () => {
  const result = encodeWord("");
  assertEquals(result, new Uint8Array([0x00]));
});

Deno.test("encodeWord - short string", () => {
  const result = encodeWord("test");
  // Length 4 (0x04) + "test"
  assertEquals(
    result,
    new Uint8Array([0x04, 0x74, 0x65, 0x73, 0x74]),
  );
});

Deno.test("encodeWord - command word", () => {
  const result = encodeWord("/login");
  // Length 6 (0x06) + "/login"
  assertEquals(
    result,
    new Uint8Array([0x06, 0x2f, 0x6c, 0x6f, 0x67, 0x69, 0x6e]),
  );
});

Deno.test("encodeWord - attribute word", () => {
  const result = encodeWord("=name=admin");
  // Length 11 (0x0B) + "=name=admin"
  assertEquals(result[0], 0x0B);
  assertEquals(result.length, 12);
});

Deno.test("encodeWord - from Uint8Array", () => {
  const input = new Uint8Array([0x01, 0x02, 0x03]);
  const result = encodeWord(input);
  // Length 3 (0x03) + bytes
  assertEquals(
    result,
    new Uint8Array([0x03, 0x01, 0x02, 0x03]),
  );
});

Deno.test("encodeWord - long string (2-byte length)", () => {
  const longString = "a".repeat(200);
  const result = encodeWord(longString);
  // Length 200 encoded as 2 bytes: [0x80, 0xC8]
  assertEquals(result[0], 0x80);
  assertEquals(result[1], 0xC8);
  assertEquals(result.length, 202); // 2 (length) + 200 (content)
});

Deno.test("decodeWord - empty word", () => {
  const result = decodeWord(new Uint8Array([0x00]));
  assertEquals(result, { word: "", bytesRead: 1 });
});

Deno.test("decodeWord - short string", () => {
  const bytes = new Uint8Array([0x04, 0x74, 0x65, 0x73, 0x74]);
  const result = decodeWord(bytes);
  assertEquals(result, { word: "test", bytesRead: 5 });
});

Deno.test("decodeWord - command word", () => {
  const bytes = new Uint8Array([0x06, 0x2f, 0x6c, 0x6f, 0x67, 0x69, 0x6e]);
  const result = decodeWord(bytes);
  assertEquals(result, { word: "/login", bytesRead: 7 });
});

Deno.test("decodeWord - with offset", () => {
  const bytes = new Uint8Array([0xFF, 0xFF, 0x04, 0x74, 0x65, 0x73, 0x74]);
  const result = decodeWord(bytes, { offset: 2 });
  assertEquals(result, { word: "test", bytesRead: 5 });
});

Deno.test("decodeWord - incomplete word throws", () => {
  // Claims length 10 but only has 3 bytes
  const bytes = new Uint8Array([0x0A, 0x01, 0x02, 0x03]);
  assertThrows(
    () => decodeWord(bytes),
    RangeError,
    "Incomplete word",
  );
});

Deno.test("decodeWord - long string (2-byte length)", () => {
  const longString = "a".repeat(200);
  const encoded = encodeWord(longString);
  const decoded = decodeWord(encoded);
  assertEquals(decoded.word, longString);
  assertEquals(decoded.bytesRead, 202);
});

Deno.test("encodeWord/decodeWord - roundtrip", () => {
  const testStrings = [
    "",
    "a",
    "test",
    "/interface/print",
    "=name=value",
    "?type=ether",
    "!done",
    "a".repeat(100),
    "a".repeat(1000),
    "Hello, 世界!", // Unicode
  ];

  for (const str of testStrings) {
    const encoded = encodeWord(str);
    const decoded = decodeWord(encoded);
    assertEquals(decoded.word, str, `Failed for string: ${str}`);
    assertEquals(decoded.bytesRead, encoded.length);
  }
});

Deno.test("encodeWord/decodeWord - binary roundtrip", () => {
  const testArrays = [
    new Uint8Array([]),
    new Uint8Array([0x00]),
    new Uint8Array([0xFF]),
    new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]),
    new Uint8Array(100).fill(0xAA),
  ];

  for (const arr of testArrays) {
    const encoded = encodeWord(arr);
    const decoded = decodeWord(encoded);
    assertEquals(decoded.bytesRead, encoded.length);
  }
});
