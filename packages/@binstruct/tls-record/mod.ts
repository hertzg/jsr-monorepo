/**
 * TLS record layer header encoding and decoding (RFC 8446 section 5.1).
 *
 * Every TLS record — regardless of higher-layer content — opens with a
 * 5-byte record header followed by a fragment of exactly `length` bytes:
 *
 * ```text
 * +--------+--------+--------+--------+--------+
 * |  Type  | Legacy Version  |     Length      |
 * +--------+--------+--------+--------+--------+
 * |                                            |
 * |            Fragment (variable)             |
 * |                                            |
 * +--------------------------------------------+
 * ```
 *
 * `type` identifies the record's content ({@linkcode TLS_CONTENT_TYPE}) and
 * `legacyVersion` is a compatibility field frozen at `{0x03, 0x01}` (TLS 1.0)
 * for the initial `ClientHello` and at `{0x03, 0x03}` (TLS 1.2) for every
 * other record — TLS 1.3 negotiates its actual version out-of-band via the
 * `supported_versions` extension, so this field is not a reliable version
 * indicator ({@linkcode TLS_VERSION} lists the assigned constants anyway,
 * for comparison and for protocols that still rely on it).
 *
 * `length` is the fragment size in bytes (at most `2^14 + 256` for encrypted
 * records, `2^14` for plaintext ones per the spec, though this coder does
 * not enforce either limit).
 *
 * This package covers the record header only — v0.0.1 scope is deliberately
 * shallow. The fragment is returned as raw, potentially still-encrypted
 * bytes; parsing handshake messages, alerts, or application data out of it,
 * decompressing, and decrypting are all left to higher layers.
 *
 * @example Round-trip a handshake record
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tlsRecord, TLS_CONTENT_TYPE, TLS_VERSION } from "@binstruct/tls-record";
 *
 * const coder = tlsRecord();
 * const fragment = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
 * const record = {
 *   contentType: TLS_CONTENT_TYPE.handshake,
 *   legacyVersion: TLS_VERSION.TLS1_0,
 *   length: fragment.length,
 *   fragment,
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(record, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded.contentType, TLS_CONTENT_TYPE.handshake);
 * assertEquals(decoded.legacyVersion, TLS_VERSION.TLS1_0);
 * assertEquals(decoded.fragment, fragment);
 * ```
 *
 * @module
 */

import { bytes, type Coder, ref, struct, u16be, u8be } from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed TLS record header (`type` + `legacyVersion` +
 * `length`), before the fragment.
 */
export const TLS_RECORD_HEADER_SIZE = 5;

/**
 * Content type values carried in a TLS record header's `type` field
 * (RFC 8446 section 5.1).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { TLS_CONTENT_TYPE } from "@binstruct/tls-record";
 *
 * assertEquals(TLS_CONTENT_TYPE.handshake, 22);
 * assertEquals(TLS_CONTENT_TYPE.applicationData, 23);
 * ```
 */
export const TLS_CONTENT_TYPE = {
  /** Post-handshake cipher state change (TLS 1.2 and below; a no-op placeholder in 1.3). */
  changeCipherSpec: 20,
  /** Warning or fatal alert, e.g. `close_notify` or a handshake failure. */
  alert: 21,
  /** Handshake messages: `ClientHello`, `ServerHello`, certificates, etc. */
  handshake: 22,
  /** Opaque application data, encrypted under the negotiated session keys. */
  applicationData: 23,
} as const;

/**
 * Version values used in the TLS record header's `legacyVersion` field and,
 * historically, in the handshake's own version negotiation
 * (RFC 8446 section 5.1, RFC 8446 appendix D).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { TLS_VERSION } from "@binstruct/tls-record";
 *
 * assertEquals(TLS_VERSION.TLS1_2, 0x0303);
 * assertEquals(TLS_VERSION.TLS1_3, 0x0304);
 * ```
 */
export const TLS_VERSION = {
  /** TLS 1.0 — the record-layer value a `ClientHello` record uses. */
  TLS1_0: 0x0301,
  /** TLS 1.1. */
  TLS1_1: 0x0302,
  /** TLS 1.2 — the record-layer value nearly every post-handshake record uses, including under TLS 1.3. */
  TLS1_2: 0x0303,
  /** TLS 1.3 — never appears in `legacyVersion`; negotiated via the `supported_versions` extension instead. */
  TLS1_3: 0x0304,
} as const;

/**
 * Decoded TLS record layer header and fragment.
 *
 * @property contentType    - Content type of the fragment. See {@linkcode TLS_CONTENT_TYPE}.
 * @property legacyVersion  - Record-layer compatibility version. See {@linkcode TLS_VERSION}.
 * @property length         - Fragment size in bytes.
 * @property fragment       - Raw fragment bytes, `length` bytes long. Not parsed, decompressed, or decrypted.
 */
export interface TlsRecord {
  contentType: number;
  legacyVersion: number;
  length: number;
  fragment: Uint8Array;
}

/**
 * Creates a coder for a TLS record layer header and fragment
 * (RFC 8446 section 5.1).
 *
 * The fragment's length is derived from the header's `length` field
 * (`fragment.length === length`), so `length` must match the fragment you
 * provide when encoding — nothing recomputes it for you. The fragment is
 * treated as opaque bytes: this coder does not parse handshake messages,
 * validate content types or versions, decompress, or decrypt.
 *
 * @returns A coder for {@linkcode TlsRecord} values.
 *
 * @example Decode a known ClientHello-shaped record header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tlsRecord, TLS_CONTENT_TYPE, TLS_VERSION } from "@binstruct/tls-record";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x16,       // type = handshake
 *   0x03, 0x01, // legacyVersion = TLS 1.0
 *   0x00, 0x02, // length = 2
 *   0xde, 0xad, // fragment
 * ]);
 *
 * const [decoded, read] = tlsRecord().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.contentType, TLS_CONTENT_TYPE.handshake);
 * assertEquals(decoded.legacyVersion, TLS_VERSION.TLS1_0);
 * assertEquals(decoded.length, 2);
 * assertEquals(decoded.fragment, new Uint8Array([0xde, 0xad]));
 * ```
 *
 * @example Empty application data record
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tlsRecord, TLS_CONTENT_TYPE, TLS_RECORD_HEADER_SIZE, TLS_VERSION } from "@binstruct/tls-record";
 *
 * const coder = tlsRecord();
 * const buffer = new Uint8Array(TLS_RECORD_HEADER_SIZE);
 * const written = coder.encode({
 *   contentType: TLS_CONTENT_TYPE.applicationData,
 *   legacyVersion: TLS_VERSION.TLS1_2,
 *   length: 0,
 *   fragment: new Uint8Array(0),
 * }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(written, TLS_RECORD_HEADER_SIZE);
 * assertEquals(decoded.fragment.length, 0);
 * ```
 */
export function tlsRecord(): Coder<TlsRecord> {
  const length = u16be();
  return struct({
    contentType: u8be(),
    legacyVersion: u16be(),
    length,
    fragment: bytes(ref(length)),
  });
}
