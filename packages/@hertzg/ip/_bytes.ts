/**
 * Private byte primitives shared by the `bytesv4`, `bytesv6` and `bytes`
 * submodules. Not an entrypoint — nothing here is part of the public API.
 *
 * The 32-bit read and write live here rather than in either version's module
 * because both need them: `bytesv4` calls each once, `bytesv6` four times.
 * Keeping them in one place keeps the network-order convention stated once.
 */

/** The wire width of an IPv4 address, in bytes. */
export const IPV4_BYTE_LENGTH = 4;

/** The wire width of an IPv6 address, in bytes. */
export const IPV6_BYTE_LENGTH = 16;

// Index arithmetic rather than a `DataView`: the view has to be constructed
// per call, since the buffer differs per call, and that constructor is the
// whole cost — 3.7 ns against 47.5 ns on the IPv4 read. See ADR 0012.

/**
 * Reads four bytes in network order as a 32-bit unsigned integer. The caller
 * is responsible for the span being in bounds.
 *
 * @param bytes The buffer to read from
 * @param offset The offset of the first byte
 * @returns The 32-bit unsigned integer
 */
export function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]) >>> 0;
}

/**
 * Writes a 32-bit unsigned integer as four bytes in network order. The caller
 * is responsible for the span being in bounds.
 *
 * @param value The 32-bit unsigned integer
 * @param into The buffer to write into
 * @param offset The offset of the first byte
 */
export function writeUint32(
  value: number,
  into: Uint8Array,
  offset: number,
): void {
  into[offset] = value >>> 24;
  into[offset + 1] = (value >>> 16) & 0xFF;
  into[offset + 2] = (value >>> 8) & 0xFF;
  into[offset + 3] = value & 0xFF;
}
