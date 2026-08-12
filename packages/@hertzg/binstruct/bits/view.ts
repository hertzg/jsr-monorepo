/**
 * Bit-level access helpers for Uint8Array buffers.
 *
 * All bit operations use MSB-first ordering (bit 7 is the most significant
 * bit within each byte).
 *
 * @module
 */

/**
 * Reads bits from the buffer starting at the specified bit offset.
 *
 * Bits are read in MSB-first order. The function can read up to 32 bits at once.
 *
 * @param buffer - The Uint8Array buffer to read from
 * @param byteOffset - The byte offset in the buffer (0-based)
 * @param bitOffset - The bit offset within the byte (0-7, where 0 is MSB)
 * @param count - Number of bits to read (1-32)
 * @returns The value of the bits read as an unsigned integer
 */
export function getBits(
  buffer: Uint8Array,
  byteOffset: number,
  bitOffset: number,
  count: number,
): number {
  let result = 0;
  let remaining = count;
  let currentByteOffset = byteOffset;
  let currentBitOffset = bitOffset;

  while (remaining > 0) {
    // Calculate how many bits we can read from current byte
    const bitsAvailable = 8 - currentBitOffset;
    const bitsToRead = Math.min(remaining, bitsAvailable);

    // Read current byte
    const byte = buffer[currentByteOffset];

    // Extract the bits we need from current byte (MSB first)
    const shift = bitsAvailable - bitsToRead;
    const mask = (1 << bitsToRead) - 1;
    const bits = (byte >> shift) & mask;

    // Add bits to result
    // Use >>> 0 to ensure unsigned 32-bit integer
    result = ((result << bitsToRead) | bits) >>> 0;

    currentBitOffset += bitsToRead;
    remaining -= bitsToRead;

    // Move to next byte if current byte is fully consumed
    if (currentBitOffset === 8) {
      currentByteOffset++;
      currentBitOffset = 0;
    }
  }

  return result;
}

/**
 * Writes bits to the buffer starting at the specified bit offset.
 *
 * Bits are written in MSB-first order. The function can write up to 32 bits at once.
 *
 * @param buffer - The Uint8Array buffer to write into
 * @param byteOffset - The byte offset in the buffer (0-based)
 * @param bitOffset - The bit offset within the byte (0-7, where 0 is MSB)
 * @param value - The value to write (uses lowest `count` bits)
 * @param count - Number of bits to write (1-32)
 */
export function setBits(
  buffer: Uint8Array,
  byteOffset: number,
  bitOffset: number,
  value: number,
  count: number,
): void {
  let remaining = count;
  let currentByteOffset = byteOffset;
  let currentBitOffset = bitOffset;

  while (remaining > 0) {
    // Calculate how many bits we can write in current byte
    const bitsAvailable = 8 - currentBitOffset;
    const bitsToWrite = Math.min(remaining, bitsAvailable);

    // Extract the bits to write from value
    const shift = remaining - bitsToWrite;
    const bits = (value >> shift) & ((1 << bitsToWrite) - 1);

    // Place bits in current byte (MSB first)
    buffer[currentByteOffset] = buffer[currentByteOffset] |
      (bits << (bitsAvailable - bitsToWrite));

    currentBitOffset += bitsToWrite;
    remaining -= bitsToWrite;

    // Move to next byte if current byte is fully consumed
    if (currentBitOffset === 8) {
      currentByteOffset++;
      currentBitOffset = 0;
    }
  }
}
