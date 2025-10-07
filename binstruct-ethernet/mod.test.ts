import { assertEquals, assertThrows } from "@std/assert";
import { ethernet2Frame, parseMacAddress, stringifyMacAddress } from "./mod.ts";
import type { Ethernet2Frame } from "./mod.ts";
import { refine } from "@hertzg/binstruct/refine";

const MAC_ADDRESS_LENGTH = 6;
const ETHER_TYPE_LENGTH = 2;
const ETHERNET_FRAME_OVERHEAD = MAC_ADDRESS_LENGTH * 2 + ETHER_TYPE_LENGTH;

function assertBytesReadAndWritten(
  bytesWritten: number,
  bytesRead: number,
  buffer: Uint8Array,
  payload: Uint8Array,
) {
  assertEquals(bytesRead, buffer.length);
  assertEquals(bytesWritten, ETHERNET_FRAME_OVERHEAD + payload.length);
}

function assertPayloadEquals(actual: Uint8Array, expected: Uint8Array) {
  assertEquals(
    actual.slice(0, expected.length),
    expected,
  );
}

Deno.test("ethernet2Frame", async (t) => {
  await t.step("basic encoding and decoding", () => {
    const frameCoder = ethernet2Frame();
    const frame = {
      dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
      srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]),
      etherType: 0x0800, // IPv4
      payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
    } as Ethernet2Frame;

    const buffer = new Uint8Array(1500);
    const bytesWritten = frameCoder.encode(frame, buffer);
    const [decoded, bytesRead] = frameCoder.decode(buffer);

    assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
    assertEquals(decoded.dstMac, frame.dstMac);
    assertEquals(decoded.srcMac, frame.srcMac);
    assertEquals(decoded.etherType, frame.etherType);
    assertPayloadEquals(decoded.payload, frame.payload);
  });

  await t.step("MAC address edge cases", () => {
    const frameCoder = ethernet2Frame();

    // Broadcast MAC
    const frame: Ethernet2Frame = {
      dstMac: new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
      srcMac: new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      etherType: 0x0800,
      payload: new Uint8Array([0x01]),
    };

    const buffer = new Uint8Array(1500);
    const bytesWritten = frameCoder.encode(frame, buffer);
    const [decoded, bytesRead] = frameCoder.decode(buffer);

    assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
    assertEquals(decoded.dstMac, frame.dstMac);
    assertEquals(decoded.srcMac, frame.srcMac);
    assertPayloadEquals(decoded.payload, frame.payload);
  });
});

Deno.test("stringifyMacAddress", async (t) => {
  await t.step("basic MAC address formatting", () => {
    const macBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    const macString = stringifyMacAddress(macBytes);
    assertEquals(macString, "00:11:22:33:44:55");
  });

  await t.step("custom delimiter", () => {
    const macBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    const macStringDashes = stringifyMacAddress(macBytes, "-");
    assertEquals(macStringDashes, "00-11-22-33-44-55");

    const macStringDots = stringifyMacAddress(macBytes, ".");
    assertEquals(macStringDots, "00.11.22.33.44.55");
  });

  await t.step("edge cases", () => {
    // All zeros
    const zeroMac = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    assertEquals(stringifyMacAddress(zeroMac), "00:00:00:00:00:00");

    // All ones (broadcast)
    const broadcastMac = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    assertEquals(stringifyMacAddress(broadcastMac), "ff:ff:ff:ff:ff:ff");

    // Mixed case values
    const mixedMac = new Uint8Array([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56]);
    assertEquals(stringifyMacAddress(mixedMac), "ab:cd:ef:12:34:56");
  });

  await t.step("handles arrays longer than 6 bytes", () => {
    const longArray = new Uint8Array([
      0x00,
      0x11,
      0x22,
      0x33,
      0x44,
      0x55,
      0x66,
      0x77,
    ]);
    const macString = stringifyMacAddress(longArray);
    assertEquals(macString, "00:11:22:33:44:55");
  });

  await t.step("handles arrays shorter than 6 bytes", () => {
    const shortArray = new Uint8Array([0x00, 0x11, 0x22]);
    const macString = stringifyMacAddress(shortArray);
    assertEquals(macString, "00:11:22:00:00:00");
  });
});

Deno.test("parseMacAddress", async (t) => {
  await t.step("basic MAC address parsing", () => {
    const macString = "00:11:22:33:44:55";
    const macBytes = parseMacAddress(macString);
    assertEquals(
      macBytes,
      new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
    );
  });

  await t.step("custom delimiter", () => {
    const macStringDashes = "00-11-22-33-44-55";
    const macBytesDashes = parseMacAddress(macStringDashes, "-");
    assertEquals(
      macBytesDashes,
      new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
    );

    const macStringDots = "00.11.22.33.44.55";
    const macBytesDots = parseMacAddress(macStringDots, ".");
    assertEquals(
      macBytesDots,
      new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
    );
  });

  await t.step("edge cases", () => {
    // All zeros
    assertEquals(
      parseMacAddress("00:00:00:00:00:00"),
      new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    );

    // All ones (broadcast)
    assertEquals(
      parseMacAddress("FF:FF:FF:FF:FF:FF"),
      new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
    );

    // Mixed case values
    assertEquals(
      parseMacAddress("AB:CD:EF:12:34:56"),
      new Uint8Array([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56]),
    );
  });

  await t.step("case insensitive parsing", () => {
    const lowerCase = "ab:cd:ef:12:34:56";
    const upperCase = "AB:CD:EF:12:34:56";
    const mixedCase = "Ab:Cd:Ef:12:34:56";

    const expected = new Uint8Array([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56]);
    assertEquals(parseMacAddress(lowerCase), expected);
    assertEquals(parseMacAddress(upperCase), expected);
    assertEquals(parseMacAddress(mixedCase), expected);
  });

  await t.step("error handling", () => {
    // Invalid format - too few parts
    assertThrows(() => {
      parseMacAddress("00:11:22:33:44");
    }, Error);

    // Invalid format - too many parts
    assertThrows(() => {
      parseMacAddress("00:11:22:33:44:55:66");
    }, Error);

    // Invalid hex values
    assertThrows(() => {
      parseMacAddress("GG:11:22:33:44:55");
    }, Error);

    // Empty string
    assertThrows(() => {
      parseMacAddress("");
    }, Error);
  });
});

Deno.test("MAC address round-trip conversion", async (t) => {
  await t.step("stringify and parse round-trip", () => {
    const originalMac = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);

    const macString = stringifyMacAddress(originalMac);
    const parsedMac = parseMacAddress(macString);

    assertEquals(parsedMac, originalMac);
  });

  await t.step("round-trip with different delimiters", () => {
    const originalMac = new Uint8Array([0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56]);
    const delimiters = [":", "-", ".", " "];

    for (const delimiter of delimiters) {
      const macString = stringifyMacAddress(originalMac, delimiter);
      const parsedMac = parseMacAddress(macString, delimiter);
      assertEquals(parsedMac, originalMac);
    }
  });
});

Deno.test("Ethernet frame integration", async (t) => {
  await t.step("complete frame processing with MAC address utilities", () => {
    const frameCoder = ethernet2Frame();

    // Create frame with MAC addresses from strings
    const dstMacString = "00:11:22:33:44:55";
    const srcMacString = "66:77:88:99:aa:bb";

    const frame: Ethernet2Frame = {
      dstMac: parseMacAddress(dstMacString),
      srcMac: parseMacAddress(srcMacString),
      etherType: 0x0800,
      payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
    } satisfies Ethernet2Frame;

    // Encode frame
    const buffer = new Uint8Array(1500);
    const bytesWritten = frameCoder.encode(frame, buffer);

    // Decode frame
    const [decodedFrame, bytesRead] = frameCoder.decode(buffer);

    assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
    assertEquals(stringifyMacAddress(decodedFrame.dstMac), dstMacString);
    assertEquals(stringifyMacAddress(decodedFrame.srcMac), srcMacString);
    assertEquals(decodedFrame.etherType, frame.etherType);
    assertPayloadEquals(decodedFrame.payload, frame.payload);
  });

  await t.step("complete frame processing with refined type", () => {
    type RefinedEthernet2Frame = Omit<Ethernet2Frame, "dstMac" | "srcMac"> & {
      dstMac: string;
      srcMac: string;
    };

    const refinedEthernet2Frame = refine(
      ethernet2Frame(),
      {
        decode: (decoded: Ethernet2Frame): RefinedEthernet2Frame => {
          return {
            dstMac: stringifyMacAddress(decoded.dstMac),
            srcMac: stringifyMacAddress(decoded.srcMac),
            etherType: decoded.etherType,
            payload: decoded.payload,
          };
        },
        encode: (refined: RefinedEthernet2Frame) => {
          return {
            dstMac: parseMacAddress(refined.dstMac),
            srcMac: parseMacAddress(refined.srcMac),
            etherType: refined.etherType,
            payload: refined.payload,
          };
        },
      },
    );

    const refinedFrameCoder = refinedEthernet2Frame();
    const frame = {
      dstMac: "00:11:22:33:44:55",
      srcMac: "66:77:88:99:aa:bb",
      etherType: 0x0800,
      payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
    } satisfies RefinedEthernet2Frame;

    const buffer = new Uint8Array(1500);
    const bytesWritten = refinedFrameCoder.encode(frame, buffer);
    const [decodedFrame, bytesRead] = refinedFrameCoder.decode(buffer);

    assertBytesReadAndWritten(bytesWritten, bytesRead, buffer, frame.payload);
    assertEquals(decodedFrame.dstMac, frame.dstMac);
    assertEquals(decodedFrame.srcMac, frame.srcMac);
    assertEquals(decodedFrame.etherType, frame.etherType);
    assertPayloadEquals(decodedFrame.payload, frame.payload);
  });
});
