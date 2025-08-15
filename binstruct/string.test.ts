import { assertEquals, assertNotEquals } from "@std/assert";
import { u16, u32, u8 } from "./numeric.ts";
import { string, stringFL, stringLP, stringNT } from "./string.ts";
import { ref } from "./ref.ts";
import { struct } from "./struct.ts";

Deno.test("string - length prefixed", async (t) => {
  await t.step("u8", () => {
    const coder = stringLP(u8());
    const testString = "Hello, World!";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, testString.length + 1); // 1 for length
  });

  await t.step("u16", () => {
    const coder = stringLP(u16());
    const testString = "Hello, World!";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, testString.length + 2); // 2 for length
  });

  await t.step("u32", () => {
    const coder = stringLP(u32());
    const testString = "Hello, World!";
    const buffer = new Uint8Array(100);

    const bytesWritten = coder.encode(testString, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(decoded, testString);
    assertEquals(bytesWritten, bytesRead);
    assertEquals(bytesWritten, testString.length + 4); // 4 for length
  });
});

Deno.test("string - fixed length", async (t) => {
  await t.step("fits in byteLength", () => {
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

  await t.step("does not fit in byteLength", () => {
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

  await t.step("empty string", () => {
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

  await t.step("with ref length", () => {
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
});

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
