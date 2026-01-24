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
 * Useful for generating preshared keys, but NOT private keys.
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
 * Useful for generating private key.
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
 * Useful for generating preshared keys.
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
 * Options for importing private key bytes into a CryptoKey.
 */
export type ImportPrivateBytesOptions = {
  /**
   * Algorithm identifier for the key. Defaults to `{ name: "x25519" }`.
   */
  algorithm?: AlgorithmIdentifier;
  /**
   * Whether the key can be exported. Defaults to `true`.
   */
  extractable?: boolean;
  /**
   * Array of key usages. Defaults to `["deriveKey", "deriveBits"]`.
   */
  keyUsages?: KeyUsage[];
};

/**
 * Imports x25519 private key bytes as a CryptoKey by wrapping them in PKCS8 format.
 *
 * This function wraps raw 32-byte x25519 private keys in the PKCS8 container format
 * required by the Web Crypto API. The PKCS8 wrapper includes the algorithm OID and
 * proper ASN.1 structure.
 *
 * @param privateKey The 32-byte private key to import
 * @param options Configuration options for key import
 * @returns A promise resolving to the imported CryptoKey
 *
 * @example Import private key with default options
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { importPrivateBytes, randomPrivateKeyBytes } from "@hertzg/wg-keys";
 *
 * const privateKeyBytes = randomPrivateKeyBytes();
 * const cryptoKey = await importPrivateBytes(privateKeyBytes);
 *
 * assertEquals(cryptoKey.type, "private");
 * ```
 *
 * @example Import private key with custom key usages
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { importPrivateBytes, randomPrivateKeyBytes } from "@hertzg/wg-keys";
 *
 * const privateKeyBytes = randomPrivateKeyBytes();
 * const cryptoKey = await importPrivateBytes(privateKeyBytes, {
 *   keyUsages: ["deriveKey", "deriveBits"],
 * });
 *
 * assertEquals(cryptoKey.type, "private");
 * assertEquals(cryptoKey.usages.length, 2);
 * ```
 */
export async function importPrivateBytes(
  privateKey: Uint8Array,
  options: ImportPrivateBytesOptions = {},
): Promise<CryptoKey> {
  const {
    algorithm = { name: "x25519" },
    extractable = true,
    keyUsages = ["deriveKey", "deriveBits"],
  } = options;

  const pkcs8 = new Uint8Array(privateKey.length + 16);
  pkcs8.set(PKCS8_PREAMBLE);
  pkcs8.set(privateKey, PKCS8_PREAMBLE.length);

  return await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    algorithm,
    extractable,
    keyUsages,
  );
}

/**
 * Derives public key from private key using x25519 curve.
 *
 * Useful for getting public key from private key.
 *
 * @param privateKey Private key bytes
 * @param options Configuration options for key import
 * @returns Public key bytes
 *
 * @example Derive public key from private key
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { randomPrivateKeyBytes, publicBytesFromPrivateBytes } from "@hertzg/wg-keys";
 *
 * const privateKeyBytes = randomPrivateKeyBytes();
 * const publicKeyBytes = await publicBytesFromPrivateBytes(privateKeyBytes);
 *
 * assertEquals(publicKeyBytes.length, 32);
 * ```
 */
export async function publicBytesFromPrivateBytes(
  privateKey: Uint8Array,
  options: ImportPrivateBytesOptions = {},
): Promise<Uint8Array> {
  const cryptoKey = await importPrivateBytes(privateKey, options);

  const jwk = await crypto.subtle.exportKey("jwk", cryptoKey);
  return decodeBase64Url(jwk.x!);
}

/**
 * Mimics WireGuard's `wg genkey` command.
 * Alias for randomPrivateKeyBytes, returns base64 encoded private key instead of Uint8Array.
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
 * Alias for randomPresharedKeyBytes, returns base64 encoded preshared key instead of Uint8Array.
 * Can be used directly by WireGuard as Peer PresharedKey.
 *
 * @see {@link https://git.zx2c4.com/wireguard-tools/tree/src/genkey.c}
 * @returns {string} base64 encoded preshared key
 */
export function wgGenPsk(): string {
  return encodeBase64(randomPresharedKeyBytes());
}

/**
 * Derives public key from private key using x25519 curve.
 *
 * When called with a base64 string, mimics WireGuard's `wg pubkey` command.
 * When called with Uint8Array, works directly with raw bytes.
 *
 * @param privateKeyBase64 Base64 encoded private key
 * @param options Configuration options for key import
 * @returns Base64 encoded public key
 *
 * @example Derive public key from base64 string
 * ```ts
 * import { assertExists } from "@std/assert";
 * import { wgGenKey, wgPubKey } from "@hertzg/wg-keys";
 *
 * const privateKey = wgGenKey();
 * const publicKey = await wgPubKey(privateKey);
 *
 * assertExists(publicKey);
 * ```
 *
 * @example Derive public key from Uint8Array
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { randomPrivateKeyBytes, wgPubKey } from "@hertzg/wg-keys";
 *
 * const privateKeyBytes = randomPrivateKeyBytes();
 * const publicKeyBytes = await wgPubKey(privateKeyBytes);
 *
 * assertEquals(publicKeyBytes.length, 32);
 * ```
 *
 * @example Derive public key with custom key usages
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { randomPrivateKeyBytes, wgPubKey } from "@hertzg/wg-keys";
 *
 * const privateKeyBytes = randomPrivateKeyBytes();
 * const publicKeyBytes = await wgPubKey(privateKeyBytes, {
 *   keyUsages: ["deriveBits"],
 * });
 *
 * assertEquals(publicKeyBytes.length, 32);
 * ```
 */
export async function wgPubKey(
  privateKeyBase64: string,
  options?: ImportPrivateBytesOptions,
): Promise<string>;
export async function wgPubKey(
  privateKey: Uint8Array,
  options?: ImportPrivateBytesOptions,
): Promise<Uint8Array>;
export async function wgPubKey(
  privateKey: string | Uint8Array,
  options?: ImportPrivateBytesOptions,
): Promise<string | Uint8Array> {
  if (typeof privateKey === "string") {
    return encodeBase64(
      await publicBytesFromPrivateBytes(decodeBase64(privateKey), options),
    );
  }
  return await publicBytesFromPrivateBytes(privateKey, options);
}
