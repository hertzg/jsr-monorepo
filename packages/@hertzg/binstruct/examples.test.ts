import { assertEquals } from "@std/assert";
import { array, bytes, ref, struct } from "./mod.ts";
import { f32be, f64be, s32be, u16be, u32be, u8be } from "./numeric/numeric.ts";
import { string } from "./string/string.ts";

Deno.test("Comprehensive examples showcasing all library functionality", async (t) => {
  // Example 1: Basic struct with all numeric types
  await t.step("Basic struct with all numeric types", () => {
    const basicStructCoder = struct({
      unsigned8: u8be(),
      unsigned16: u16be(),
      unsigned32: u32be(),
      signed8: s32be(),
      float32: f32be(),
      float64: f64be(),
    });

    const testData = {
      unsigned8: 255,
      unsigned16: 65535,
      unsigned32: 4294967295,
      signed8: -2147483648,
      float32: 3.14159,
      float64: 2.718281828459045,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = basicStructCoder.encode(testData, buffer);
    const [decoded, bytesRead] = basicStructCoder.decode(buffer);

    assertEquals(
      decoded.unsigned8,
      testData.unsigned8,
      "Unsigned 8-bit should match",
    );
    assertEquals(
      decoded.unsigned16,
      testData.unsigned16,
      "Unsigned 16-bit should match",
    );
    assertEquals(
      decoded.unsigned32,
      testData.unsigned32,
      "Unsigned 32-bit should match",
    );
    assertEquals(
      decoded.signed8,
      testData.signed8,
      "Signed 32-bit should match",
    );
    assertEquals(
      decoded.float32,
      Math.fround(testData.float32),
      "Float 32-bit should match (f32 precision)",
    );
    assertEquals(
      decoded.float64,
      testData.float64,
      "Float 64-bit should match",
    );
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
  });

  // Example 2: String handling - all three types
  await t.step("String handling - all three types", () => {
    const stringStructCoder = struct({
      lengthPrefixed: string(u16be()), // length-prefixed string
      nullTerminated: string(), // null-terminated string
      fixedLength: string(10), // fixed-length string
    });

    const testData = {
      lengthPrefixed: "Hello World",
      nullTerminated: "Null terminated",
      fixedLength: "Fixed10\0\0\0",
    };

    const buffer = new Uint8Array(200);
    const bytesWritten = stringStructCoder.encode(testData, buffer);
    const [decoded, bytesRead] = stringStructCoder.decode(buffer);

    assertEquals(
      decoded.lengthPrefixed,
      testData.lengthPrefixed,
      "Length-prefixed string should match",
    );
    assertEquals(
      decoded.nullTerminated,
      testData.nullTerminated,
      "Null-terminated string should match",
    );
    assertEquals(
      decoded.fixedLength,
      testData.fixedLength,
      "Fixed-length string should match",
    );
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
  });

  // Example 3: Array handling - length-prefixed and fixed-length
  await t.step("Array handling - length-prefixed and fixed-length", () => {
    const arrayStructCoder = struct({
      lengthPrefixed: array(u16be(), u8be()), // length-prefixed array
      fixedLength: array(u16be(), 3), // fixed-length array
    });

    const testData = {
      lengthPrefixed: [100, 200, 300],
      fixedLength: [400, 500, 600],
    };

    const buffer = new Uint8Array(200);
    const bytesWritten = arrayStructCoder.encode(testData, buffer);
    const [decoded, bytesRead] = arrayStructCoder.decode(buffer);

    assertEquals(
      decoded.lengthPrefixed,
      testData.lengthPrefixed,
      "Length-prefixed array should match",
    );
    assertEquals(
      decoded.fixedLength,
      testData.fixedLength,
      "Fixed-length array should match",
    );
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
  });

  // Example 4: Reference system - basic references
  await t.step("Reference system - basic references", () => {
    const lengthCoder = u16be();
    const dataCoder = struct({
      length: lengthCoder,
      items: array(u16be(), ref(lengthCoder)),
    });

    const testData = {
      length: 4,
      items: [100, 200, 300, 400],
    };

    const buffer = new Uint8Array(200);
    const bytesWritten = dataCoder.encode(testData, buffer);
    const [decoded, bytesRead] = dataCoder.decode(buffer);

    assertEquals(decoded.length, testData.length, "Length should match");
    assertEquals(decoded.items, testData.items, "Items should match");
    assertEquals(
      decoded.items.length,
      decoded.length,
      "Array length should match length field",
    );
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
  });

  // Example 5: Bytes handling - fixed and variable length
  await t.step("Bytes handling - fixed and variable length", () => {
    const bytesStructCoder = struct({
      fixedBytes: bytes(5),
      variableBytes: bytes(),
    });

    const testData = {
      fixedBytes: new Uint8Array([1, 2, 3, 4, 5]),
      variableBytes: new Uint8Array([10, 20, 30, 40, 50, 60]),
    };

    const buffer = new Uint8Array(200);
    bytesStructCoder.encode(testData, buffer);
    const [decoded] = bytesStructCoder.decode(buffer);

    assertEquals(decoded.fixedBytes, testData.fixedBytes);
    assertEquals(
      decoded.variableBytes.slice(0, testData.variableBytes.length),
      testData.variableBytes,
    );
    // bytes() without a length reads the entire remaining buffer on decode,
    // so bytesRead will be larger than bytesWritten
  });

  // Example 6: Complex nested structures
  await t.step("Complex nested structures", () => {
    const addressCoder = struct({
      street: string(u16be()),
      city: string(u16be()),
      zipCode: string(5),
    });

    const phoneCoder = struct({
      countryCode: u16be(),
      number: string(u16be()),
    });

    const personCoder = struct({
      id: u32be(),
      name: string(u16be()),
      age: u8be(),
      addresses: array(addressCoder, u8be()),
      phones: array(phoneCoder, u8be()),
    });

    const testData = {
      id: 12345,
      name: "John Doe",
      age: 30,
      addresses: [
        { street: "123 Main St", city: "Anytown", zipCode: "12345" },
        { street: "456 Oak Ave", city: "Somewhere", zipCode: "67890" },
      ],
      phones: [
        { countryCode: 1, number: "555-1234" },
        { countryCode: 1, number: "555-5678" },
      ],
    };

    const buffer = new Uint8Array(1000);
    const bytesWritten = personCoder.encode(testData, buffer);
    const [decoded, bytesRead] = personCoder.decode(buffer);

    assertEquals(decoded, testData);
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
  });

  // Example 7: Mixed data types with references
  await t.step("Mixed data types with references", () => {
    const headerLengthCoder = u16be();
    const dataLengthCoder = u16be();

    const mixedDataCoder = struct({
      headerLength: headerLengthCoder,
      dataLength: dataLengthCoder,
      header: bytes(ref(headerLengthCoder)),
      data: bytes(ref(dataLengthCoder)),
      checksum: u32be(),
    });

    const headerData = new Uint8Array([1, 2, 3, 4, 5]);
    const dataData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);

    const testData = {
      headerLength: headerData.length,
      dataLength: dataData.length,
      header: headerData,
      data: dataData,
      checksum: 0x12345678,
    };

    const buffer = new Uint8Array(1000);
    const bytesWritten = mixedDataCoder.encode(testData, buffer);
    const [decoded, bytesRead] = mixedDataCoder.decode(buffer);

    assertEquals(
      decoded.headerLength,
      testData.headerLength,
      "Header length should match",
    );
    assertEquals(
      decoded.dataLength,
      testData.dataLength,
      "Data length should match",
    );
    assertEquals(decoded.header, testData.header, "Header data should match");
    assertEquals(decoded.data, testData.data, "Data should match");
    assertEquals(decoded.checksum, testData.checksum, "Checksum should match");
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
  });

  // Example 8: Protocol-like structure with TLV and complex references
  await t.step("Protocol-like structure with TLV and complex references", () => {
    const tlvLengthCoder = u16be();
    const tlvCoder = struct({
      type: u16be(),
      length: tlvLengthCoder,
      value: bytes(ref(tlvLengthCoder)),
    });

    const helloReplyCoder = struct({
      version: u8be(),
      opcode: u8be(),
      smac: array(u8be(), 6),
      dmac: array(u8be(), 6),
      sequence: u16be(),
      errCode: s32be(),
      length: u16be(),
      offset: u16be(),
      flag: u16be(),
      tokenId: u16be(),
      reserved: u32be(),
      tlvs: array(tlvCoder, u8be()),
    });

    const testData = {
      version: 1,
      opcode: 2,
      smac: [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC],
      dmac: [0x00, 0x11, 0x22, 0x33, 0x44, 0x55],
      sequence: 0x0216,
      errCode: 0,
      length: 0x00B5,
      offset: 0,
      flag: 0,
      tokenId: 0,
      reserved: 0,
      tlvs: [
        {
          type: 1,
          length: 11,
          value: new Uint8Array([
            0x4E,
            0x58,
            0x2D,
            0x44,
            0x45,
            0x56,
            0x31,
            0x32,
            0x33,
            0x34,
            0x35,
          ]),
        },
        {
          type: 2,
          length: 7,
          value: new Uint8Array([0x54, 0x45, 0x53, 0x54, 0x2D, 0x44, 0x56]),
        },
        {
          type: 3,
          length: 6,
          value: new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]),
        },
      ],
    };

    const buffer = new Uint8Array(1024);
    const bytesWritten = helloReplyCoder.encode(testData, buffer);
    const [decoded, bytesRead] = helloReplyCoder.decode(buffer);

    // Verify encoding/decoding integrity
    assertEquals(
      bytesWritten,
      bytesRead,
      "Bytes written should equal bytes read",
    );
    assertEquals(
      decoded,
      testData,
      "Complete structure should round-trip correctly",
    );
  });
});
