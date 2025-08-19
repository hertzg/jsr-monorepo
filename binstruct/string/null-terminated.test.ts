import { assertEquals, assertNotEquals } from "@std/assert";
import { stringNT } from "./null-terminated.ts";

Deno.test("string - null terminated", async (t) => {
  await t.step("simple", () => {
    const coder = stringNT();
    const testString = "Hello, World!";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, testString.length + 1);
  });

  await t.step("including null", () => {
    const coder = stringNT();
    const testString = "ABC\0";
    const buffer = new Uint8Array(100);
    buffer.fill(0xff);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString.slice(0, -1));
    assertNotEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, 5); // 4 + 1 for null
    assertEquals(bytesRead, 4); // 3 bytes for "ABC" + 1 for null
  });

  await t.step("empty string", () => {
    const coder = stringNT();
    const testString = "";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, 1); // 0 + 1 for null
    assertEquals(bytesRead, 1); // 0 + 1 for null
  });
});
