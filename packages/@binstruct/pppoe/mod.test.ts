import { assertEquals } from "@std/assert";
import {
  PPPOE_CODE,
  PPPOE_HEADER_SIZE,
  type PppoeHeader,
  pppoeHeader,
} from "./mod.ts";

Deno.test("pppoeHeader", async (t) => {
  await t.step("round-trips a PADI with a Service-Name tag payload", () => {
    const coder = pppoeHeader();
    const payload = new Uint8Array([0x01, 0x01, 0x00, 0x00]);
    const packet: PppoeHeader = {
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.PADI,
      sessionId: 0,
      length: payload.length,
      payload,
    };

    const buffer = new Uint8Array(PPPOE_HEADER_SIZE + payload.length);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, PPPOE_HEADER_SIZE + payload.length);
    assertEquals(read, written);
    assertEquals(decoded, packet);
  });

  await t.step("round-trips a session data frame with no payload", () => {
    const coder = pppoeHeader();
    const packet: PppoeHeader = {
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.SESSION_DATA,
      sessionId: 0x1234,
      length: 0,
      payload: new Uint8Array(0),
    };

    const buffer = new Uint8Array(PPPOE_HEADER_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, PPPOE_HEADER_SIZE);
    assertEquals(read, PPPOE_HEADER_SIZE);
    assertEquals(decoded, packet);
  });

  await t.step("sizes the payload from the length field", () => {
    const coder = pppoeHeader();
    const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00]);
    const packet: PppoeHeader = {
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.PADR,
      sessionId: 0,
      length: payload.length,
      payload,
    };

    const buffer = new Uint8Array(64);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, PPPOE_HEADER_SIZE + payload.length);
    assertEquals(read, written);
    assertEquals(decoded.payload, payload);
  });

  await t.step("decodes a known PADO wire capture", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x11,       // version=1, type=1
      0x07,       // code = PADO
      0x00, 0x00, // sessionId = 0
      0x00, 0x08, // length = 8
      0x01, 0x01, 0x00, 0x04, 0x69, 0x73, 0x70, 0x31, // Service-Name tag: "isp1"
    ]);

    const [decoded, read] = pppoeHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.versionType, { version: 1, type: 1 });
    assertEquals(decoded.code, PPPOE_CODE.PADO);
    assertEquals(decoded.sessionId, 0);
    assertEquals(decoded.length, 8);
    assertEquals(decoded.payload.length, 8);
  });

  await t.step("decodes a known PADT wire capture", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x11,       // version=1, type=1
      0xa7,       // code = PADT
      0x00, 0x2a, // sessionId = 0x002a
      0x00, 0x00, // length = 0
    ]);

    const [decoded, read] = pppoeHeader().decode(wire);

    assertEquals(read, PPPOE_HEADER_SIZE);
    assertEquals(decoded.versionType, { version: 1, type: 1 });
    assertEquals(decoded.code, PPPOE_CODE.PADT);
    assertEquals(decoded.sessionId, 0x002a);
    assertEquals(decoded.length, 0);
    assertEquals(decoded.payload.length, 0);
  });

  await t.step("version/type nibbles pack into a single octet", () => {
    const buffer = new Uint8Array(PPPOE_HEADER_SIZE);
    pppoeHeader().encode({
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.SESSION_DATA,
      sessionId: 0,
      length: 0,
      payload: new Uint8Array(0),
    }, buffer);

    assertEquals(buffer[0], 0x11);
  });
});
