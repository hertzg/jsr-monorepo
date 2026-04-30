/**
 * Internet checksum (RFC 1071) used by ICMP, IPv4, UDP and TCP.
 *
 * The checksum is the 16-bit one's complement of the one's complement sum of
 * all 16-bit words in the header and data. If the byte length is odd, the
 * trailing byte is padded with zero for the purposes of the sum.
 *
 * @module
 */

/**
 * Computes the 16-bit Internet checksum over a span of bytes.
 *
 * For ICMP, callers typically zero out the checksum field before computing.
 * The returned value is suitable for direct assignment into a `u16be` field.
 *
 * @param data Bytes to checksum.
 * @returns A 16-bit unsigned integer.
 *
 * @example RFC 1071 sample data
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@binstruct/icmp";
 *
 * // Worked example from RFC 1071 §3 (with bytes that already sum to 0xFFFF
 * // before complementing yield 0x0000):
 * // deno-fmt-ignore
 * const sample = new Uint8Array([
 *   0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7,
 * ]);
 * assertEquals(internetChecksum(sample), 0x220d);
 * ```
 *
 * @example Verify a checksum by re-checksumming the whole packet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@binstruct/icmp";
 *
 * // An ICMP echo request with checksum already filled in must checksum to 0.
 * // deno-fmt-ignore
 * const echoRequest = new Uint8Array([
 *   0x08, 0x00, 0xf7, 0xfd, 0x00, 0x01, 0x00, 0x01,
 * ]);
 * assertEquals(internetChecksum(echoRequest), 0x0000);
 * ```
 */
export function internetChecksum(data: Uint8Array): number {
  let sum = 0;
  const limit = data.length & ~1;
  for (let i = 0; i < limit; i += 2) {
    sum += (data[i] << 8) | data[i + 1];
  }
  if (data.length & 1) {
    sum += data[data.length - 1] << 8;
  }
  while (sum >>> 16) {
    sum = (sum & 0xffff) + (sum >>> 16);
  }
  return (~sum) & 0xffff;
}
