/**
 * RSA encryption using BigInt modular exponentiation
 *
 * Required because Deno's node:crypto doesn't implement publicEncrypt
 * See: https://github.com/denoland/deno/issues/27295
 */

import { bytesToBigInt } from "./utils.ts";

/**
 * Modular exponentiation using binary method
 * Computes: base^exp mod mod
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Raw RSA encryption (no padding): c = m^e mod n
 */
export function rsaEncrypt(
  message: Uint8Array,
  modulus: bigint,
  exponent: bigint,
): bigint {
  const m = bytesToBigInt(message);
  return modPow(m, exponent, modulus);
}

/**
 * Pad message to specified size (for RSA chunks)
 */
export function rsaPad(message: Uint8Array, size: number): Uint8Array {
  if (message.length >= size) {
    return message;
  }
  const padded = new Uint8Array(size);
  padded.set(message);
  return padded;
}
