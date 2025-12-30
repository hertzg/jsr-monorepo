import { assertEquals, assertThrows } from "@std/assert";
import { decodeSentence, encodeSentence } from "./sentence.ts";

Deno.test("encodeSentence - empty sentence", () => {
  const result = encodeSentence([]);
  // Just the terminator
  assertEquals(result, new Uint8Array([0x00]));
});

Deno.test("encodeSentence - single word", () => {
  const result = encodeSentence(["/login"]);
  // 0x06 + "/login" + 0x00 terminator
  assertEquals(
    result,
    new Uint8Array([0x06, 0x2f, 0x6c, 0x6f, 0x67, 0x69, 0x6e, 0x00]),
  );
});

Deno.test("encodeSentence - multiple words", () => {
  const result = encodeSentence(["/login", "=name=admin", "=password=secret"]);
  // Each word: length + content, then terminator
  const expected = new Uint8Array([
    0x06,
    0x2f,
    0x6c,
    0x6f,
    0x67,
    0x69,
    0x6e, // "/login"
    0x0b,
    0x3d,
    0x6e,
    0x61,
    0x6d,
    0x65,
    0x3d,
    0x61,
    0x64,
    0x6d,
    0x69,
    0x6e, // "=name=admin"
    0x10,
    0x3d,
    0x70,
    0x61,
    0x73,
    0x73,
    0x77,
    0x6f,
    0x72,
    0x64,
    0x3d,
    0x73,
    0x65,
    0x63,
    0x72,
    0x65,
    0x74, // "=password=secret"
    0x00, // terminator
  ]);
  assertEquals(result, expected);
});

Deno.test("encodeSentence - command with attributes", () => {
  const result = encodeSentence([
    "/interface/print",
    "?type=ether",
  ]);
  // Length should include all words plus terminator
  const lastByte = result[result.length - 1];
  assertEquals(lastByte, 0x00, "Should end with terminator");
});

Deno.test("decodeSentence - empty sentence", () => {
  const bytes = new Uint8Array([0x00]);
  const result = decodeSentence(bytes);
  assertEquals(result, { words: [], bytesRead: 1 });
});

Deno.test("decodeSentence - single word", () => {
  const bytes = new Uint8Array([
    0x06,
    0x2f,
    0x6c,
    0x6f,
    0x67,
    0x69,
    0x6e,
    0x00,
  ]);
  const result = decodeSentence(bytes);
  assertEquals(result, { words: ["/login"], bytesRead: 8 });
});

Deno.test("decodeSentence - multiple words", () => {
  const bytes = new Uint8Array([
    0x06,
    0x2f,
    0x6c,
    0x6f,
    0x67,
    0x69,
    0x6e, // "/login"
    0x0b,
    0x3d,
    0x6e,
    0x61,
    0x6d,
    0x65,
    0x3d,
    0x61,
    0x64,
    0x6d,
    0x69,
    0x6e, // "=name=admin"
    0x00, // terminator
  ]);
  const result = decodeSentence(bytes);
  assertEquals(result, {
    words: ["/login", "=name=admin"],
    bytesRead: 20,
  });
});

Deno.test("decodeSentence - with offset", () => {
  const bytes = new Uint8Array([
    0xFF,
    0xFF, // padding
    0x04,
    0x74,
    0x65,
    0x73,
    0x74, // "test"
    0x00, // terminator
  ]);
  const result = decodeSentence(bytes, { offset: 2 });
  assertEquals(result, { words: ["test"], bytesRead: 6 });
});

Deno.test("decodeSentence - missing terminator throws", () => {
  const bytes = new Uint8Array([0x06, 0x2f, 0x6c, 0x6f, 0x67, 0x69, 0x6e]);
  assertThrows(
    () => decodeSentence(bytes),
    RangeError,
    "missing zero-length terminator",
  );
});

Deno.test("encodeSentence/decodeSentence - roundtrip", () => {
  const testCases = [
    [],
    ["/login"],
    ["/login", "=name=admin", "=password=secret"],
    ["/interface/print"],
    ["/interface/print", "?type=ether", "?disabled=false"],
    ["!done"],
    ["!re", "=name=ether1", "=type=ether"],
    ["!trap", "=message=failure", "=category=0"],
    ["/system/resource/print", ".tag=req-1"],
  ];

  for (const words of testCases) {
    const encoded = encodeSentence(words);
    const decoded = decodeSentence(encoded);
    assertEquals(
      decoded.words,
      words,
      `Failed for: ${JSON.stringify(words)}`,
    );
    assertEquals(decoded.bytesRead, encoded.length);
  }
});

Deno.test("decodeSentence - handles multiple sentences", () => {
  // Two sentences back-to-back
  const bytes = new Uint8Array([
    0x04,
    0x74,
    0x65,
    0x73,
    0x74, // "test"
    0x00, // terminator for sentence 1
    0x03,
    0x66,
    0x6f,
    0x6f, // "foo"
    0x00, // terminator for sentence 2
  ]);

  // Decode first sentence
  const result1 = decodeSentence(bytes);
  assertEquals(result1.words, ["test"]);
  assertEquals(result1.bytesRead, 6);

  // Decode second sentence
  const result2 = decodeSentence(bytes, { offset: result1.bytesRead });
  assertEquals(result2.words, ["foo"]);
  assertEquals(result2.bytesRead, 5);
});
