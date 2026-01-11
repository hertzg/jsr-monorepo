/**
 * RSA encryption using BigInt modular exponentiation
 *
 * Required because Deno's node:crypto doesn't implement publicEncrypt
 * See: https://github.com/denoland/deno/issues/27295
 */

import {
  type MontgomeryParams,
  modPowMontgomery,
} from "./montgomery.ts";

/**
 * Raw RSA encryption (no padding): c = m^e mod n
 */
export function rsaEncrypt(
  message: bigint,
  exponent: bigint,
  params: MontgomeryParams,
): bigint {
  return modPowMontgomery(message, exponent, params);
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
