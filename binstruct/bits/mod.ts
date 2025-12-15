/**
 * Bit-level encoding and decoding utilities for binary structures.
 *
 * This module provides support for encoding and decoding bit-packed structures
 * where fields are not byte-aligned. This is essential for working with binary
 * formats that pack multiple small values into single bytes to save space.
 *
 * ## Features
 *
 * - **Bit-packed Structures**: Define structures with bit-level granularity (1-32 bits per field)
 * - **MSB-first Ordering**: Bits are read/written from most significant bit first (standard for network protocols)
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Byte Alignment Enforcement**: Total bits must be multiple of 8 (compile-time validation)
 * - **Integration**: Works seamlessly with {@link import("../struct/struct.ts").struct} and other coders
 *
 * ## Key Function
 *
 * - {@link bitStruct}: Create coders for bit-packed structures
 *
 * ## Use Cases
 *
 * - **Network Protocol Headers**: TCP/IP flags, Ethernet VLAN tags, IPv4 fragment fields
 * - **Compression Formats**: PNG/Zlib headers, Deflate block headers
 * - **File Format Headers**: BMP compression flags, FAT attributes, MPEG frame headers
 * - **Hardware Registers**: USB descriptors, embedded device configuration
 * - **Compact Binary Formats**: Any format requiring sub-byte field granularity
 *
 * ## MSB-first Bit Ordering
 *
 * All bits are processed in MSB-first order, meaning bit 7 (the leftmost bit in
 * binary notation) is read/written first:
 *
 * ```
 * Byte: 0b1010_0110
 *       ^^^^-------- bits 7-4 (first 4 bits)
 *           ^^^^---- bits 3-0 (last 4 bits)
 * ```
 *
 * This ordering is standard for:
 * - Network protocols (big-endian style)
 * - Binary file formats
 * - Hardware register layouts
 *
 * @example Basic bit-packed structure
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // Define a bit-packed header (total 8 bits = 1 byte)
 * const flags = bitStruct({
 *   enabled: 1,      // 1 bit
 *   priority: 3,     // 3 bits
 *   category: 4,     // 4 bits
 * });
 *
 * // Encode
 * const value = { enabled: 1, priority: 5, category: 2 };
 * const buffer = new Uint8Array(1);
 * const bytesWritten = flags.encode(value, buffer);
 *
 * // Buffer contains: 0b1_101_0010 = 0xD2
 * assertEquals(buffer[0], 0xD2);
 * assertEquals(bytesWritten, 1);
 *
 * // Decode
 * const [decoded, bytesRead] = flags.decode(buffer);
 * assertEquals(decoded, value);
 * assertEquals(bytesRead, 1);
 * ```
 *
 * @example Network protocol header (multi-byte)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // 32-bit protocol header
 * const header = bitStruct({
 *   version: 4,      // 4 bits
 *   type: 4,         // 4 bits
 *   flags: 8,        // 8 bits
 *   length: 16,      // 16 bits
 * });                // Total: 32 bits = 4 bytes
 *
 * const buffer = new Uint8Array(4);
 * const data = { version: 1, type: 2, flags: 0xFF, length: 1024 };
 *
 * header.encode(data, buffer);
 * const [decoded, bytesRead] = header.decode(buffer);
 *
 * assertEquals(decoded, data);
 * assertEquals(bytesRead, 4);
 * ```
 *
 * @example Padding to byte boundaries
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // Fields don't align to byte boundary - add explicit padding
 * const flags = bitStruct({
 *   ready: 1,
 *   error: 1,
 *   mode: 2,
 *   _reserved: 4,    // Padding to reach 8 bits
 * });
 *
 * const buffer = new Uint8Array(1);
 * flags.encode({ ready: 1, error: 0, mode: 3, _reserved: 0 }, buffer);
 *
 * assertEquals(buffer[0], 0b1_0_11_0000);
 * ```
 *
 * @example Integration with struct
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u32le } from "@hertzg/binstruct/numeric";
 *
 * const flags = bitStruct({
 *   compressed: 1,
 *   encrypted: 1,
 *   version: 6,
 * });
 *
 * const packet = struct({
 *   flags: flags,
 *   payloadSize: u32le(),
 * });
 *
 * const buffer = new Uint8Array(5);
 * const data = {
 *   flags: { compressed: 1, encrypted: 0, version: 2 },
 *   payloadSize: 1024,
 * };
 *
 * packet.encode(data, buffer);
 * const [decoded] = packet.decode(buffer);
 *
 * assertEquals(decoded.flags.compressed, 1);
 * assertEquals(decoded.flags.version, 2);
 * assertEquals(decoded.payloadSize, 1024);
 * ```
 *
 * @example Real-world: PNG/Zlib header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // Zlib header (RFC 1950): 2 bytes with bit fields
 * // MSB-first ordering means fields are listed in bit order (7→0)
 * const zlibHeader = bitStruct({
 *   compressionInfo: 4,      // CMF bits 7-4: Compression info
 *   compressionMethod: 4,    // CMF bits 3-0: Compression method
 *   fcheck: 5,               // FLG bits 7-3: Check bits
 *   fdict: 1,                // FLG bit 2: Preset dictionary
 *   flevel: 2,               // FLG bits 1-0: Compression level
 * });
 *
 * // Decode a common zlib header: 0x78 0x9C
 * const header = new Uint8Array([0x78, 0x9C]);
 * const [decoded] = zlibHeader.decode(header);
 *
 * assertEquals(decoded.compressionMethod, 8);   // Deflate
 * assertEquals(decoded.compressionInfo, 7);     // 32KB window
 * ```
 *
 * @example Real-world: Ethernet VLAN tag
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bitStruct } from "@hertzg/binstruct/bits";
 *
 * // 802.1Q VLAN tag: 2 bytes
 * const vlanTCI = bitStruct({
 *   pcp: 3,              // Priority Code Point (0-7)
 *   dei: 1,              // Drop Eligible Indicator
 *   vid: 12,             // VLAN Identifier (0-4095)
 * });
 *
 * // VLAN 100 with priority 5
 * const value = { pcp: 5, dei: 0, vid: 100 };
 * const buffer = new Uint8Array(2);
 *
 * vlanTCI.encode(value, buffer);
 * const [decoded] = vlanTCI.decode(buffer);
 *
 * assertEquals(decoded.pcp, 5);
 * assertEquals(decoded.vid, 100);
 * ```
 *
 * @module
 */

export { bitStruct, type BitSchema, type BitStructDecoded } from "./bit-struct.ts";
