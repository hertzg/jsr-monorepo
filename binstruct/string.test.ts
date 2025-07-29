import { assertEquals } from "@std/assert";
import { stringLP, stringNT } from "./string.ts";
import { u16, u32, u8 } from "./numeric.ts";

Deno.test("stringLP - u8 length prefix", () => {
  const coder = stringLP(u8());
  const testString = "Hello";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, 6); // 1 byte length + 5 bytes string
});

Deno.test("stringLP - u16 length prefix", () => {
  const coder = stringLP(u16());
  const testString = "Hello, World!";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, 15); // 2 bytes length + 13 bytes string
});

Deno.test("stringLP - u32 length prefix", () => {
  const coder = stringLP(u32());
  const testString = "This is a longer string for testing";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, 39); // 4 bytes length + 35 bytes string
});

Deno.test("stringLP - empty string", () => {
  const coder = stringLP(u16());
  const testString = "";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, 2); // 2 bytes length + 0 bytes string
});

Deno.test("stringLP - unicode characters", () => {
  const coder = stringLP(u16());
  const testString = "Hello, 世界! 🌍";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
});

Deno.test("stringNT - basic string", () => {
  const coder = stringNT();
  const testString = "Hello";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, 6); // 5 bytes string + 1 null terminator
});

Deno.test("stringNT - empty string", () => {
  const coder = stringNT();
  const testString = "";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, 1); // 0 bytes string + 1 null terminator
});

Deno.test("stringNT - unicode characters", () => {
  const coder = stringNT();
  const testString = "Hello, სამყარო! 🌍";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString);
  assertEquals(bytesWritten, bytesRead);
});

Deno.test("stringNT - string with null bytes", () => {
  const coder = stringNT();
  const testString = "Hello\0World"; // This should be truncated at the null
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, "Hello");
  assertEquals(bytesWritten, 12); // 11 bytes "HelloWorld" + 1 null terminator
  assertEquals(bytesRead, 6); // 5 bytes "Hello" + 1 null terminator
});

Deno.test("stringNT - multiple strings in buffer", () => {
  const coder = stringNT();
  const buffer = new Uint8Array(100);

  // Encode first string
  const bytesWritten1 = coder.encode("Hello", buffer);
  const [decoded1, bytesRead1] = coder.decode(buffer);

  // Encode second string after first
  const bytesWritten2 = coder.encode("World", buffer.subarray(bytesWritten1));
  const [decoded2, bytesRead2] = coder.decode(buffer.subarray(bytesWritten1));

  assertEquals(decoded1, "Hello");
  assertEquals(decoded2, "World");
  assertEquals(bytesWritten1, bytesRead1);
  assertEquals(bytesWritten2, bytesRead2);
});

Deno.test("stringLP - multiple strings in buffer", () => {
  const coder = stringLP(u16());
  const buffer = new Uint8Array(100);

  // Encode first string
  const bytesWritten1 = coder.encode("Hello", buffer);
  const [decoded1, bytesRead1] = coder.decode(buffer);

  // Encode second string after first
  const bytesWritten2 = coder.encode("World", buffer.subarray(bytesWritten1));
  const [decoded2, bytesRead2] = coder.decode(buffer.subarray(bytesWritten1));

  assertEquals(decoded1, "Hello");
  assertEquals(decoded2, "World");
  assertEquals(bytesWritten1, bytesRead1);
  assertEquals(bytesWritten2, bytesRead2);
});
