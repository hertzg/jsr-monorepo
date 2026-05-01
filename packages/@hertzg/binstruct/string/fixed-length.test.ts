import { assertEquals, assertNotEquals } from "@std/assert";
import { u16 } from "../numeric/numeric.ts";
import { stringFL } from "./fixed-length.ts";
import { ref } from "../ref/ref.ts";
import { struct } from "../struct/struct.ts";

Deno.test("string - fixed length - fits in byteLength", () => {
  const length = 50;
  const coder = stringFL(length);
  const testString = "Hello, World!";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(
    decoded,
    `${testString}${"\0".repeat(length - testString.length)}`,
  );
  assertNotEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, testString.length);
  assertEquals(bytesRead, length);
});

Deno.test("string - fixed length - does not fit in byteLength", () => {
  const length = 5;
  const coder = stringFL(length);
  const testString = "Hello, World!";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, testString.slice(0, length));
  assertEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, length);
});

Deno.test("string - fixed length - empty string", () => {
  const length = 5;
  const coder = stringFL(length);
  const testString = "";
  const buffer = new Uint8Array(100);

  const bytesWritten = coder.encode(testString, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded, `${"\0".repeat(length)}`);
  assertNotEquals(bytesWritten, bytesRead);
  assertEquals(bytesWritten, testString.length);
  assertEquals(bytesRead, length);
});

Deno.test("string - fixed length - with ref length", () => {
  const lengthCoder = u16();
  const coder = struct({
    length: lengthCoder,
    text: stringFL(ref(lengthCoder)),
  });

  const data = {
    length: 10,
    text: "Hello",
  };

  const buffer = new Uint8Array(100);
  const bytesWritten = coder.encode(data, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(decoded.length, data.length);
  assertEquals(decoded.text, "Hello\0\0\0\0\0"); // Padded to length 10
  assertEquals(bytesWritten, 7); // 2 bytes for u16 length + 5 bytes for string
  assertEquals(bytesRead, 12); // 2 bytes for u16 length + 10 bytes for fixed length
});
