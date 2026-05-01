/**
 * BigInt utilities for RSA
 */

/**
 * Convert Uint8Array to BigInt (big-endian).
 *
 * Uses hex string conversion for better performance with larger byte arrays.
 *
 * @param bytes The byte array to convert
 * @returns The BigInt representation of the bytes
 */
export function bytesToBigInt(bytes: Uint8Array): bigint {
  if (bytes.length === 0) {
    return 0n;
  }
  return BigInt("0x" + bytes.toHex());
}

/**
 * Convert BigInt to Uint8Array (big-endian, fixed length).
 *
 * Uses hex string conversion for better performance with larger byte arrays.
 *
 * @param n The BigInt to convert
 * @param length The desired byte array length
 * @returns The byte array representation, zero-padded to the specified length
 */
export function bigIntToBytes(n: bigint, length: number): Uint8Array {
  if (length === 0) {
    return new Uint8Array(0);
  }
  const hex = n.toString(16).padStart(length * 2, "0");
  return Uint8Array.fromHex(hex);
}
