import { assertEquals } from "@std/assert";
import {
  TLS_CONTENT_TYPE,
  TLS_RECORD_HEADER_SIZE,
  TLS_VERSION,
  type TlsRecord,
  tlsRecord,
} from "./mod.ts";

Deno.test("tlsRecord", async (t) => {
  await t.step("round-trips a handshake record", () => {
    const coder = tlsRecord();
    // deno-fmt-ignore
    const fragment = new Uint8Array([0x01, 0x00, 0x00, 0x04, 0xde, 0xad, 0xbe, 0xef]);
    const record: TlsRecord = {
      contentType: TLS_CONTENT_TYPE.handshake,
      legacyVersion: TLS_VERSION.TLS1_0,
      length: fragment.length,
      fragment,
    };

    const buffer = new Uint8Array(64);
    const written = coder.encode(record, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, TLS_RECORD_HEADER_SIZE + fragment.length);
    assertEquals(read, written);
    assertEquals(decoded, record);
  });

  await t.step("round-trips an empty application data record", () => {
    const coder = tlsRecord();
    const record: TlsRecord = {
      contentType: TLS_CONTENT_TYPE.applicationData,
      legacyVersion: TLS_VERSION.TLS1_2,
      length: 0,
      fragment: new Uint8Array(0),
    };

    const buffer = new Uint8Array(TLS_RECORD_HEADER_SIZE);
    const written = coder.encode(record, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, TLS_RECORD_HEADER_SIZE);
    assertEquals(read, TLS_RECORD_HEADER_SIZE);
    assertEquals(decoded, record);
  });

  await t.step("decodes a known ClientHello-shaped record header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x16,       // contentType = handshake
      0x03, 0x01, // legacyVersion = TLS 1.0
      0x00, 0x04, // length = 4
      0x01, 0x00, 0x00, 0x00, // fragment
    ]);

    const [decoded, read] = tlsRecord().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.contentType, TLS_CONTENT_TYPE.handshake);
    assertEquals(decoded.legacyVersion, TLS_VERSION.TLS1_0);
    assertEquals(decoded.length, 4);
    assertEquals(decoded.fragment, new Uint8Array([0x01, 0x00, 0x00, 0x00]));
  });

  await t.step("decodes a known alert record with a trailing buffer", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x15,       // contentType = alert
      0x03, 0x03, // legacyVersion = TLS 1.2
      0x00, 0x02, // length = 2
      0x02, 0x0a, // fragment: fatal, unexpected_message
      0xff, 0xff, // trailing bytes not part of this record
    ]);

    const [decoded, read] = tlsRecord().decode(wire);

    assertEquals(read, TLS_RECORD_HEADER_SIZE + 2);
    assertEquals(decoded.contentType, TLS_CONTENT_TYPE.alert);
    assertEquals(decoded.legacyVersion, TLS_VERSION.TLS1_2);
    assertEquals(decoded.fragment, new Uint8Array([0x02, 0x0a]));
  });

  await t.step("content type and version constants match RFC 8446", () => {
    assertEquals(TLS_CONTENT_TYPE.changeCipherSpec, 20);
    assertEquals(TLS_CONTENT_TYPE.alert, 21);
    assertEquals(TLS_CONTENT_TYPE.handshake, 22);
    assertEquals(TLS_CONTENT_TYPE.applicationData, 23);
    assertEquals(TLS_VERSION.TLS1_0, 0x0301);
    assertEquals(TLS_VERSION.TLS1_1, 0x0302);
    assertEquals(TLS_VERSION.TLS1_2, 0x0303);
    assertEquals(TLS_VERSION.TLS1_3, 0x0304);
  });
});
