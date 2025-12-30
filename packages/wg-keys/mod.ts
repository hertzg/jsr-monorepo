/**
 * ## Overview
 * This module provides functions to generate wireguard private keys, preshared keys and public keys.
 * Exposes functions that mimic `wg genkey`, `wg genpsk` and `wg pubkey` commands that work with {@link string}s.
 * As well as underlying functions that work with {@link Uint8Array}s.
 *
 * ```typescript
 * import { wgGenKey, wgGenPsk, wgPubKey } from "@hertzg/wg-keys";
 * import { assertExists, assertNotEquals } from "@std/assert";
 *
 * const privateKey = wgGenKey(); // returns string
 * const publicKey = await wgPubKey(privateKey); // returns string
 * const presharedKey = wgGenPsk(); // returns string
 *
 * assertExists(privateKey);
 * assertExists(presharedKey);
 * assertExists(publicKey);
 *
 * assertNotEquals(privateKey, publicKey);
 * assertNotEquals(privateKey, presharedKey);
 * assertNotEquals(publicKey, presharedKey);
 * ```
 *
 * or
 *
 * ```typescript
 * import { randomPrivateKeyBytes, publicBytesFromPrivateBytes, randomPresharedKeyBytes } from "@hertzg/wg-keys";
 * import { assertEquals, assertNotEquals } from "@std/assert";
 *
 * const privateKey = randomPrivateKeyBytes(); // returns Uint8Array
 * const publicKey = await publicBytesFromPrivateBytes(privateKey); // returns Uint8Array
 * const presharedKey = randomPresharedKeyBytes(); // returns Uint8Array
 *
 * assertEquals(privateKey.length, 32);
 * assertEquals(publicKey.length, 32);
 * assertEquals(presharedKey.length, 32);
 *
 * assertNotEquals(privateKey, publicKey);
 * assertNotEquals(privateKey, presharedKey);
 * assertNotEquals(publicKey, presharedKey);
 * ```
 *
 * ## OK, But Why?
 * ℹ️ Since [deno v2.1.4](https://github.com/denoland/deno/issues/26431#issuecomment-2638264802) supports JWK export of
 * x25519 private keys, this module has dropped the dependency on `@noble/curves` and uses `CryptoSubtle` directly.
 * If you need to support older versions of Deno, you can use [wg-keys@0.1.7](https://jsr.io/@hertzg/wg-keys@0.1.7) version
 * of this module
 *
 * See [X25519 issue](https://github.com/denoland/deno/issues/26431#issuecomment-2592044073) for more info.
 *
 * ## References
 * - [RFC 7748](https://datatracker.ietf.org/doc/html/rfc7748)
 * - [Curve25519](https://en.wikipedia.org/wiki/Curve25519)
 *
 * @module
 */
import { decodeBase64Url } from "@std/encoding/base64url";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

/**
 * Generates __UNCLAMPED__ 32 bytes of random data.
 *
 * Usefull for generating preshared keys, but NOT private keys.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7748#section-5}
 * @returns {Uint8Array} 32 bytes of random data
 */
export function randomBytes(): Uint8Array {
  const randomBytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(randomBytes);
  return randomBytes;
}

/**
 * Generates clamped private key from random data.
 *
 * Clamping is done by clearing bits 0, 1, 2 of the first byte, bit 7 of last byte and setting bit 6 of the last byte.
 *
 * Usefull for generating private key.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7748#section-5}
 * @returns {Uint8Array} private key bytes
 */
export function randomPrivateKeyBytes(): Uint8Array {
  const bytes = randomBytes();
  bytes[0] &= 0b11111000; // clear bits 0, 1, 2
  bytes[31] = (bytes[31] & 0b01111111) | 0b01000000; // clear bit 7, set bit 6
  return bytes;
}

/**
 * Generates random preshared key bytes.
 *
 * Usefull for generating preshared keys.
 *
 * @alias randomBytes
 * @returns {Uint8Array} preshared key bytes
 */
export function randomPresharedKeyBytes(): Uint8Array {
  return randomBytes();
}

// deno-fmt-ignore
const PKCS8_PREAMBLE = new Uint8Array([
  0x30, 0x2e, // SEQUENCE(46)
  0x02, 0x01, 0x00, // INTEGER(1) - version 0
  0x30, 0x05, // SEQUENCE(5)
    0x06, 0x03, 0x2b, 0x65, 0x6e, // OID: 1.3.101.110 (x25519)
  0x04, 0x22, // OCTET STRING(34)
  0x20, 0x04, // OCTET STRING(32): private key bytes follow 
]);

/**
 * Derives public key from private key using x25519 curve.
 *
 * Usefull for getting public key from private key.
 *
 * @param {Uint8Array} privateKey private key bytes
 * @returns {Uint8Array} publicKey bytes
 */
export async function publicBytesFromPrivateBytes(
  privateKey: Uint8Array,
): Promise<Uint8Array> {
  const pkcs8 = new Uint8Array(privateKey.length + 16);
  pkcs8.set(
    PKCS8_PREAMBLE,
  );
  pkcs8.set(privateKey, PKCS8_PREAMBLE.length);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "x25519" },
    true,
    ["deriveBits", "deriveKey"],
  );

  const jwk = await crypto.subtle.exportKey("jwk", cryptoKey);
  return decodeBase64Url(jwk.x!);
}

/**
 * Mimics WireGuard's `wg genkey` command.
 * Alias for randomPrivateKeyBytes, returns base64 encoded private key instead of Uin8Array.
 * Can be used directly by WireGuard as Interface PrivateKey.
 *
 * @see {@link https://git.zx2c4.com/wireguard-tools/tree/src/genkey.c}
 * @returns {string} base64 encoded private key
 */
export function wgGenKey(): string {
  return encodeBase64(randomPrivateKeyBytes());
}

/**
 * Mimics WireGuard's `wg genpsk` command.
 * Alias for randomPresharedKeyBytes, returns base64 encoded preshared key instead of Uin8Array.
 * Can be used directly by WireGuard as Peer PresharedKey.
 *
 * @see {@link https://git.zx2c4.com/wireguard-tools/tree/src/genkey.c}
 * @returns {string} base64 encoded preshared key
 */
export function wgGenPsk(): string {
  return encodeBase64(randomPresharedKeyBytes());
}

/**
 * Mimics WireGuard's `wg pubkey` command.
 * Alias for getPublicKey, deals with inputs and outputs as base64 encoded string instead of Uin8Arrays.
 * Can be used directly by WireGuard as Peer PublicKey.
 *
 * @param {string} privateKeyBase64 base64 encoded private key
 * @returns
 */
export async function wgPubKey(privateKeyBase64: string): Promise<string> {
  return encodeBase64(
    await publicBytesFromPrivateBytes(decodeBase64(privateKeyBase64)),
  );
}
