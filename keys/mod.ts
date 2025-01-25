/**
 * ## Overview
 * This module provides functions to generate wireguard private keys, preshared keys and public keys.
 * Exposes functions that mimic `wg genkey`, `wg genpsk` and `wg pubkey` commands that work with {@link string}s.
 * As well as underlying functions that work with {@link Uint8Array}s.
 *
 * ```typescript
 * import { wgGenKey, wgGenPsk, wgPubKey } from "@hertzg/wg-keys";
 *
 * const privateKey = wgGenKey(); // returns string
 * const publicKey = wgPubKey(privateKey); // returns string
 * const presharedKey = wgGenPsk(); // returns string
 *
 * console.log({ privateKey, publicKey, presharedKey });
 * ```
 *
 * or
 *
 * ```typescript
 * import { randomPrivateKeyBytes, publicBytesFromPrivateBytes, randomPresharedKeyBytes } from "@hertzg/wg-keys";
 *
 * const privateKey = randomPrivateKeyBytes(); // returns Uint8Array
 * const publicKey = publicBytesFromPrivateBytes(privateKey); // returns Uint8Array
 * const presharedKey = randomPresharedKeyBytes(); // returns Uint8Array
 *
 * console.log({ privateKey, publicKey, presharedKey });
 * ```
 *
 * ## OK, But Why?
 * Normally one can use {@link CryptoSubtle} to generate and export keys, but since in Deno `x25519` private key export
 * as `jwk` is not implemented, this module provides a workaround using @noble/curves package. See
 * [X25519 issue]({@link https://github.com/denoland/deno/issues/26431#issuecomment-2592044073 }) for more info.
 *
 * ## References
 * - [RFC 7748](https://datatracker.ietf.org/doc/html/rfc7748)
 * - [Curve25519](https://en.wikipedia.org/wiki/Curve25519)
 *
 * @module
 */
import { x25519 } from "@noble/curves/ed25519";
import { Buffer } from "node:buffer";

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

/**
 * Derives public key from private key using x25519 curve.
 *
 * Usefull for getting public key from private key.
 *
 * @param {Uint8Array} privateKey private key bytes
 * @returns {Uint8Array} publicKey bytes
 */
export function publicBytesFromPrivateBytes(
  privateKey: Uint8Array,
): Uint8Array {
  return x25519.scalarMultBase(privateKey);
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
  return toBase64(randomPrivateKeyBytes());
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
  return toBase64(randomPresharedKeyBytes());
}

/**
 * Mimics WireGuard's `wg pubkey` command.
 * Alias for getPublicKey, deals with inputs and outputs as base64 encoded string instead of Uin8Arrays.
 * Can be used directly by WireGuard as Peer PublicKey.
 *
 * @param {string} privateKeyBase64 base64 encoded private key
 * @returns
 */
export function wgPubKey(privateKeyBase64: string): string {
  return toBase64(publicBytesFromPrivateBytes(toBytes(privateKeyBase64)));
}

/**
 * Converts bytes to base64 string.
 *
 * @param {Uint8Array} bytes
 * @returns {string} base64 string
 */
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Converts base64 string to bytes.
 *
 * @param {string} base64
 * @returns {Uint8Array} bytes
 */
function toBytes(base64: string): Uint8Array {
  const buffer = Buffer.from(base64, "base64");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
