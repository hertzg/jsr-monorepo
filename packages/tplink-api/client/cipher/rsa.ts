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
 * Pad a bigint value with zeros on the right (low bits) via bit shift.
 *
 * @param value The bigint value to pad
 * @param valueBytes The byte length of the original value (before conversion)
 * @param targetBytes The target byte length after padding
 */
export function rsaPad(
  value: bigint,
  valueBytes: number,
  targetBytes: number,
): bigint {
  if (valueBytes >= targetBytes) {
    return value;
  }
  return value << BigInt((targetBytes - valueBytes) * 8);
}
