/**
 * The two ciphers Baichuan uses for message bodies.
 *
 * - {@link xorCipher}: the fixed-key XOR scramble used before login, for the
 *   nonce reply and the login request itself.
 * - {@link aesCfbEncrypt} / {@link aesCfbDecrypt}: AES-128-CFB with 128-bit
 *   segments and the fixed IV `"0123456789abcdef"`, used once logged in. The
 *   key comes from the login nonce, see `@hertzg/reolink-api/protocol/login`.
 *
 * @example Scramble and unscramble a body with the XOR cipher
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { xorCipher } from "@hertzg/reolink-api/encoding/cipher";
 *
 * const plain = new TextEncoder().encode("<?xml");
 * const scrambled = xorCipher(plain, 250);
 *
 * assertEquals(scrambled, Uint8Array.of(0xfa, 0x8e, 0xd8, 0xfe, 0xee));
 * assertEquals(xorCipher(scrambled, 250), plain);
 * ```
 *
 * @module
 */

import { createCipheriv } from "node:crypto";

/**
 * Applies the Baichuan XOR cipher. The cipher is its own inverse, so the same
 * call encrypts and decrypts.
 *
 * Each byte is XORed with `key[(offset + i) % 8]` and with `offset`, where the
 * key is `1f 2d 3c 4b 5a 69 78 ff` and `offset` is the message's channel id.
 *
 * @param data The bytes to encrypt or decrypt.
 * @param offset The message's channel id, used modulo 256.
 * @returns A new array with the transformed bytes.
 *
 * @example Decrypt with the channel id of the message header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { xorCipher } from "@hertzg/reolink-api/encoding/cipher";
 *
 * const encrypted = Uint8Array.of(0xd1, 0xc3, 0xf1, 0xe7);
 *
 * assertEquals(new TextDecoder().decode(xorCipher(encrypted, 251)), "abcd");
 * ```
 */
export function xorCipher(data: Uint8Array, offset: number): Uint8Array {
  const key = [0x1f, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78, 0xff];
  const shift = offset & 0xff;
  return data.map((byte, i) => byte ^ key[(shift + i) % key.length] ^ shift);
}

/**
 * Encrypts a body with AES-128-CFB, 128-bit segments, IV `"0123456789abcdef"`.
 *
 * Baichuan encrypts a message's extension and body separately, each starting
 * from the IV, so call this once per part.
 *
 * @param key The 16-byte session key derived at login.
 * @param data The plaintext.
 * @returns The ciphertext, the same length as `data`.
 *
 * @example Encrypt and decrypt a body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   aesCfbDecrypt,
 *   aesCfbEncrypt,
 * } from "@hertzg/reolink-api/encoding/cipher";
 *
 * const key = new TextEncoder().encode("08822D7143979103");
 * const plain = new TextEncoder().encode("hello");
 * const encrypted = aesCfbEncrypt(key, plain);
 *
 * assertEquals(encrypted, Uint8Array.of(0x06, 0x2c, 0x91, 0x2d, 0xd6));
 * assertEquals(aesCfbDecrypt(key, encrypted), plain);
 * ```
 */
export function aesCfbEncrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  return aesCfb(key, data, "encrypt");
}

/**
 * Decrypts a body encrypted with AES-128-CFB, 128-bit segments, IV
 * `"0123456789abcdef"`.
 *
 * @param key The 16-byte session key derived at login.
 * @param data The ciphertext.
 * @returns The plaintext, the same length as `data`.
 *
 * @example Decrypt a body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { aesCfbDecrypt } from "@hertzg/reolink-api/encoding/cipher";
 *
 * const key = new TextEncoder().encode("08822D7143979103");
 * const encrypted = Uint8Array.of(0x06, 0x2c, 0x91, 0x2d, 0xd6);
 *
 * assertEquals(new TextDecoder().decode(aesCfbDecrypt(key, encrypted)), "hello");
 * ```
 */
export function aesCfbDecrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  return aesCfb(key, data, "decrypt");
}

// Deno's node:crypto has no CFB mode and Web Crypto has neither CFB nor ECB,
// so CFB is built here from single-block AES-ECB: each keystream block is the
// encryption of the previous ciphertext block, starting from the IV.
function aesCfb(
  key: Uint8Array,
  data: Uint8Array,
  direction: "encrypt" | "decrypt",
): Uint8Array {
  const block = createCipheriv("aes-128-ecb", key, null).setAutoPadding(false);
  const out = new Uint8Array(data.length);
  let previous: Uint8Array = new TextEncoder().encode("0123456789abcdef");
  for (let i = 0; i < data.length; i += 16) {
    const keystream = block.update(previous);
    const input = data.subarray(i, i + 16);
    const output = input.map((byte, j) => byte ^ keystream[j]);
    out.set(output, i);
    previous = direction === "encrypt" ? output : input;
  }
  return out;
}
