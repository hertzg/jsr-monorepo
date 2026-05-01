import { bitStruct, type Coder, decode } from "@hertzg/binstruct";

/**
 * Zlib header structure (RFC 1950).
 *
 * The zlib format uses a 2-byte header with bit-packed fields:
 * - Byte 0 (CMF): Compression Method and Flags
 * - Byte 1 (FLG): Flags
 *
 * Note: RFC 1950 uses LSB-first bit numbering (bit 0 = rightmost),
 * while bitStruct reads MSB-first (bit 7 = leftmost).
 */
export interface ZlibHeader {
  /** Compression info (CMF bits 4-7 in RFC, bits 7-4 in MSB): base-2 logarithm of window size minus 8 */
  compressionInfo: number;
  /** Compression method (CMF bits 0-3 in RFC, bits 3-0 in MSB): 8 = deflate */
  compressionMethod: number;
  /** Compression level (FLG bits 6-7 in RFC, bits 7-6 in MSB): 0=fastest, 1=fast, 2=default, 3=max */
  flevel: number;
  /** Preset dictionary flag (FLG bit 5 in RFC, bit 5 in MSB): 1 if preset dictionary present */
  fdict: number;
  /** Check bits (FLG bits 0-4 in RFC, bits 4-0 in MSB): ensures (CMF*256 + FLG) % 31 === 0 */
  fcheck: number;
}

export function zlibHeaderCoder(): Coder<ZlibHeader> {
  return bitStruct({
    // Byte 0 (CMF) - MSB-first ordering
    compressionInfo: 4, // CMF bits 7-4 (RFC bits 4-7)
    compressionMethod: 4, // CMF bits 3-0 (RFC bits 0-3)
    // Byte 1 (FLG) - fields ordered MSB to LSB
    flevel: 2, // FLG bits 7-6 (RFC bits 6-7)
    fdict: 1, // FLG bit 5 (RFC bit 5)
    fcheck: 5, // FLG bits 4-0 (RFC bits 0-4)
  });
}

export function decodeHeader(bytes: Iterable<number>): ZlibHeader {
  return decode(zlibHeaderCoder(), new Uint8Array(bytes));
}
