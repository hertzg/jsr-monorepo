/**
 * RSA encryption using BigInt modular exponentiation
 *
 * Required because Deno's node:crypto doesn't implement publicEncrypt
 * See: https://github.com/denoland/deno/issues/27295
 */

import { bytesToBigInt, bigIntToBytes } from "./utils.ts";

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
  modulus: Uint8Array,
  exponent: Uint8Array
): Uint8Array {
  const m = bytesToBigInt(message);
  const n = bytesToBigInt(modulus);
  const e = bytesToBigInt(exponent);
  const c = modPow(m, e, n);
  return bigIntToBytes(c, modulus.length);
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
