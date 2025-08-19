import { assertEquals, assertNotEquals } from "@std/assert";
import { u16 } from "../numeric/numeric.ts";
import { string } from "./string.ts";
import { ref } from "../ref/ref.ts";
import { struct } from "../struct/struct.ts";

Deno.test("string - automatic type selection", async (t) => {
  await t.step("no arguments creates null-terminated", () => {
    const coder = string(); // No arguments
    const testString = "Hello, World!";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, testString.length + 1); // +1 for null terminator
  });

  await t.step("coder argument creates length-prefixed", () => {
    const coder = string(u16()); // u16 coder argument
    const testString = "Hello, World!";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, testString.length + 2); // +2 for u16 length
  });

  await t.step("length value creates fixed-length", () => {
    const length = 20;
    const coder = string(length); // Numeric length argument
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

  await t.step("ref argument creates fixed-length", () => {
    const lengthCoder = u16();
    const coder = struct({
      length: lengthCoder,
      text: string(ref(lengthCoder)), // Ref argument
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
});
