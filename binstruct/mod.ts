/**
 * A comprehensive module providing type-safe binary structure encoding and decoding utilities for TypeScript.
 *
 * This library offers a complete toolkit for working with binary data formats, supporting:
 *
 * ## Core Data Types
 *
 * ### Numeric Types
 * - **Unsigned integers**: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - **Signed integers**: 8, 16, 32, 64 bits (big-endian and little-endian)
 * - **Floating point numbers**: 16, 32, 64 bits (big-endian and little-endian)
 *
 * ### String Types
 * - **Length-prefixed strings**: Variable-length strings with size prefix
 * - **Null-terminated strings**: Strings ending with null byte (0x00)
 * - **Fixed-length strings**: Strings of exact byte length
 *
 * ### Array Types
 * - **Length-prefixed arrays**: Variable-length arrays with size prefix
 * - **Fixed-length arrays**: Arrays of exact element count
 *
 * ### Complex Types
 * - **Structs**: Complex nested data structures with type safety
 * - **References**: Self-referential and circular data structures
 * - **Bytes**: Raw byte slices with fixed or variable length
 *
 * ## Main Functions
 *
 * ### Structure Creation
 * - {@link struct}: Create coders for structured data (objects)
 *
 * ### Array Handling
 * - {@link array}: Universal array coder with automatic type selection
 *
 * ### String Handling
 * - {@link string}: Universal string coder with automatic type selection
 *
 * ### Reference System
 * - {@link ref}: Create reference values for context-aware encoding/decoding
 * - {@link computedRef}: Create computed references from multiple values
 *
 * ### Data Refinement
 * - {@link refine}: Transform decoded values into refined types and vice versa
 *
 * ### Raw Data
 * - {@link bytes}: Handle raw byte slices with length control
 *
 * ### Buffer Management
 * - {@link autoGrowBuffer}: Automatically grow buffers during encoding operations
 *
 * ### Helper Functions
 * - {@link encode}: Simplified encoding with automatic buffer allocation
 * - {@link decode}: Simplified decoding that returns only the decoded value
 *
 * ### Numeric Coders
 *
 * **Unsigned Integers:**
 * - {@link u8}, {@link u8le}, {@link u8be}: 8-bit unsigned integer
 * - {@link u16}, {@link u16le}, {@link u16be}: 16-bit unsigned integer
 * - {@link u32}, {@link u32le}, {@link u32be}: 32-bit unsigned integer
 * - {@link u64}, {@link u64le}, {@link u64be}: 64-bit unsigned integer (bigint)
 *
 * **Signed Integers:**
 * - {@link s8}, {@link s8le}, {@link s8be}: 8-bit signed integer
 * - {@link s16}, {@link s16le}, {@link s16be}: 16-bit signed integer
 * - {@link s32}, {@link s32le}, {@link s32be}: 32-bit signed integer
 * - {@link s64}, {@link s64le}, {@link s64be}: 64-bit signed integer (bigint)
 *
 * **Floating Point:**
 * - {@link f16}, {@link f16le}, {@link f16be}: 16-bit floating point number
 * - {@link f32}, {@link f32le}, {@link f32be}: 32-bit floating point number
 * - {@link f64}, {@link f64le}, {@link f64be}: 64-bit floating point number
 *
 * ## Key Features
 *
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Endianness Control**: Explicit big-endian and little-endian support
 * - **Reference System**: Handle self-referential and circular structures
 * - **Context Management**: Advanced context handling for complex scenarios
 * - **Buffer Management**: Efficient buffer handling with offset support
 * - **Error Handling**: Comprehensive error handling for malformed data
 * - **Performance**: Optimized for high-performance binary operations
 *
 * ## Common Use Cases
 *
 * - **File Format Parsing**: WAV, PNG, ZIP, and other binary formats
 * - **Network Protocols**: TCP/IP, HTTP, custom protocols
 * - **Data Serialization**: Efficient binary data storage
 * - **Embedded Systems**: Device communication protocols
 * - **Game Development**: Save files, network packets
 * - **Scientific Computing**: Binary data analysis
 * - **Network Protocols**: MAC addresses, IP addresses, custom protocol transformations
 *
 * @example Reading and writing WAV (RIFF) file format:
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct, array, string } from "@hertzg/binstruct";
 * import { u16le, u32le, u8le } from "@hertzg/binstruct/numeric";
 *
 * // Define WAV file structure following RIFF format specification
 * const riffChunkCoder = struct({
 *   chunkID: string(4),           // "RIFF" (fixed 4-byte string)
 *   chunkSize: u32le(),           // File size - 8 bytes
 *   format: string(4),            // "WAVE" (fixed 4-byte string)
 * });
 *
 * const fmtChunkCoder = struct({
 *   chunkID: string(4),           // "fmt " (fixed 4-byte string)
 *   chunkSize: u32le(),           // Size of fmt chunk (16 for PCM)
 *   audioFormat: u16le(),         // Audio format (1 = PCM)
 *   numChannels: u16le(),         // Number of channels (1 = mono, 2 = stereo)
 *   sampleRate: u32le(),          // Sample rate (e.g., 44100 Hz)
 *   byteRate: u32le(),            // Byte rate (sampleRate * numChannels * bitsPerSample / 8)
 *   blockAlign: u16le(),          // Block align (numChannels * bitsPerSample / 8)
 *   bitsPerSample: u16le(),       // Bits per sample (8, 16, 24, 32)
 * });
 *
 * const dataChunkCoder = struct({
 *   chunkID: string(4),           // "data" (fixed 4-byte string)
 *   chunkSize: u32le(),           // Size of audio data
 *   audioData: array(u8le(), u32le()), // Audio samples as length-prefixed array
 * });
 *
 * // Complete WAV file structure
 * const wavFileCoder = struct({
 *   riff: riffChunkCoder,
 *   fmt: fmtChunkCoder,
 *   data: dataChunkCoder,
 * });
 *
 * // Create sample WAV data (8kHz, 8-bit, mono, 0.1 second - small example)
 * const sampleRate = 8000;
 * const numChannels = 1;
 * const bitsPerSample = 8;
 * const durationSeconds = 0.1;
 * const numSamples = Math.floor(sampleRate * durationSeconds);
 *
 * // Generate a simple sine wave (440 Hz) with 8-bit samples
 * const audioData = new Array(numSamples);
 * for (let i = 0; i < numSamples; i++) {
 *   const t = i / sampleRate;
 *   audioData[i] = Math.floor(Math.sin(2 * Math.PI * 440 * t) * 127) + 128; // 8-bit amplitude (0-255)
 * }
 *
 * const wavData = {
 *   riff: {
 *     chunkID: "RIFF",
 *     chunkSize: 0, // Will be calculated
 *     format: "WAVE",
 *   },
 *   fmt: {
 *     chunkID: "fmt ",
 *     chunkSize: 16,
 *     audioFormat: 1, // PCM
 *     numChannels,
 *     sampleRate,
 *     byteRate: sampleRate * numChannels * bitsPerSample / 8,
 *     blockAlign: numChannels * bitsPerSample / 8,
 *     bitsPerSample,
 *   },
 *   data: {
 *     chunkID: "data",
 *     chunkSize: 0, // Will be calculated
 *     audioData,
 *   },
 * };
 *
 * // Calculate chunk sizes
 * const dataSize = audioData.length * (bitsPerSample / 8);
 * wavData.data.chunkSize = dataSize;
 * wavData.riff.chunkSize = 36 + dataSize; // 36 = 12 (RIFF) + 24 (fmt) + data size
 *
 * // Encode WAV data to binary
 * const buffer = new Uint8Array(1024);
 * const bytesWritten = wavFileCoder.encode(wavData, buffer);
 *
 * // Decode WAV data from binary
 * const [decoded, bytesRead] = wavFileCoder.decode(buffer);
 *
 * // Verify the data matches using assertions
 * assertEquals(decoded.riff.chunkID, "RIFF", 'RIFF chunk ID should be "RIFF"');
 * assertEquals(decoded.riff.format, "WAVE", 'RIFF format should be "WAVE"');
 * assertEquals(decoded.fmt.chunkID, "fmt ", 'fmt chunk ID should be "fmt "');
 * assertEquals(decoded.fmt.audioFormat, 1, 'Audio format should be PCM (1)');
 * assertEquals(decoded.fmt.numChannels, numChannels, 'Number of channels should match');
 * assertEquals(decoded.fmt.sampleRate, sampleRate, 'Sample rate should match');
 * assertEquals(decoded.fmt.bitsPerSample, bitsPerSample, 'Bits per sample should match');
 * assertEquals(decoded.data.chunkID, "data", 'Data chunk ID should be "data"');
 * assertEquals(decoded.data.audioData.length, audioData.length, 'Audio data length should match');
 * assertEquals(bytesWritten, bytesRead, 'Bytes written should equal bytes read');
 * assertEquals(decoded.riff.chunkSize, wavData.riff.chunkSize, 'RIFF chunk size should match');
 * assertEquals(decoded.data.chunkSize, wavData.data.chunkSize, 'Data chunk size should match');
 *
 * // Verify audio data integrity
 * for (let i = 0; i < Math.min(100, audioData.length); i++) {
 *   assertEquals(decoded.data.audioData[i], audioData[i], `Audio sample at index ${i} should match`);
 * }
 * ```
 *
 * @example Parsing complete network stack (Ethernet + IP + TCP):
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct, array, string, refine } from "@hertzg/binstruct";
 * import { u16be, u32be, u8be } from "@hertzg/binstruct/numeric";
 *
 * const macAddr = refine(array(u8be(), 6), {
 *   refine: (arr: number[]) => arr.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':'),
 *   unrefine: (mac: string) => mac.split(':').map(hex => parseInt(hex, 16)),
 * });
 *
 * const ipAddr = refine(array(u8be(), 4), {
 *   refine: (arr: number[]) => arr.join('.'),
 *   unrefine: (ip: string) => ip.split('.').map(octet => parseInt(octet, 10)),
 * });
 *
 * // Define Ethernet frame structure (IEEE 802.3)
 * const ethernetFrameCoder = struct({
 *   destinationMAC: macAddr(),            // MAC address as colon-separated hex string
 *   sourceMAC: macAddr(),                 // MAC address as colon-separated hex string
 *   etherType: u16be(),                   // EtherType (0x0800 for IPv4)
 * });
 *
 * // Define IPv4 header structure (RFC 791)
 * const ipv4HeaderCoder = struct({
 *   version: u8be(),                      // Version (4) and IHL (5 words = 20 bytes)
 *   tos: u8be(),                          // Type of Service
 *   totalLength: u16be(),                 // Total packet length
 *   identification: u16be(),              // Packet identification
 *   flags: u16be(),                       // Flags and fragment offset
 *   ttl: u8be(),                          // Time to Live
 *   protocol: u8be(),                     // Protocol (6 for TCP)
 *   checksum: u16be(),                    // Header checksum
 *   sourceIP: ipAddr(),                   // IP address as dot-separated decimal string
 *   destIP: ipAddr(),                     // IP address as dot-separated decimal string
 *   options: array(u8be(), 0),            // IP options (empty for this example)
 * });
 *
 * // Define TCP header structure (RFC 793)
 * const tcpHeaderCoder = struct({
 *   sourcePort: u16be(),                   // Source port
 *   destPort: u16be(),                     // Destination port
 *   sequenceNumber: u32be(),               // Sequence number
 *   ackNumber: u32be(),                    // Acknowledgment number
 *   dataOffset: u8be(),                    // Data offset and flags
 *   flags: u8be(),                         // Control flags
 *   windowSize: u16be(),                   // Window size
 *   checksum: u16be(),                     // TCP checksum
 *   urgentPointer: u16be(),                // Urgent pointer
 *   options: array(u8be(), 0),             // TCP options (empty for this example)
 * });
 *
 * // Define complete network packet structure
 * const networkPacketCoder = struct({
 *   ethernet: ethernetFrameCoder,
 *   ip: ipv4HeaderCoder,
 *   tcp: tcpHeaderCoder,
 *   payload: array(u8be(), u16be()),       // Length-prefixed payload
 * });
 *
 * // Create sample network packet data
 * const networkPacket = {
 *   ethernet: {
 *     destinationMAC: "00:1B:21:BB:0F:3B",                    // Router MAC as string
 *     sourceMAC: "00:0C:29:2E:84:5A",                         // Host MAC as string
 *     etherType: 0x0800,                                      // IPv4
 *   },
 *   ip: {
 *     version: 0x45,                       // IPv4, 5 words header
 *     tos: 0x00,                          // Normal precedence
 *     totalLength: 0,                      // Will be calculated
 *     identification: 0x1234,              // Packet ID
 *     flags: 0x4000,                       // Don't fragment
 *     ttl: 64,                            // Time to live
 *     protocol: 6,                         // TCP
 *     checksum: 0,                         // Will be calculated
 *     sourceIP: "192.168.1.100",           // Source IP as string
 *     destIP: "10.0.0.50",                 // Destination IP as string
 *     options: [],                         // No IP options
 *   },
 *   tcp: {
 *     sourcePort: 49152,                   // Dynamic port
 *     destPort: 80,                        // HTTP port
 *     sequenceNumber: 0x12345678,          // Initial sequence
 *     ackNumber: 0,                        // No acknowledgment
 *     dataOffset: 0x50,                    // 5 words header
 *     flags: 0x02,                         // SYN flag
 *     windowSize: 65535,                   // Maximum window
 *     checksum: 0,                         // Will be calculated
 *     urgentPointer: 0,                    // No urgent data
 *     options: [],                         // No TCP options
 *   },
 *   payload: [0x48, 0x65, 0x6c, 0x6c, 0x6f], // "Hello" payload
 * };
 *
 * // Calculate packet lengths
 * const tcpHeaderLength = 20;              // Standard TCP header
 * const payloadLength = networkPacket.payload.length;
 * const payloadLengthPrefix = 2;           // u16 length prefix for array
 * const totalTcpLength = tcpHeaderLength + payloadLength + payloadLengthPrefix;
 * const ipHeaderLength = 20;               // Standard IP header
 * const totalPacketLength = ipHeaderLength + totalTcpLength;
 * const ethernetHeaderLength = 14;         // Ethernet header (6+6+2 bytes)
 * const totalFrameLength = ethernetHeaderLength + totalPacketLength;
 *
 * // Update length fields
 * networkPacket.ip.totalLength = totalPacketLength;
 * networkPacket.tcp.dataOffset = 0x50;     // 5 words header
 *
 * // Encode complete network packet
 * const buffer = new Uint8Array(2048);
 * const bytesWritten = networkPacketCoder.encode(networkPacket, buffer);
 *
 * // Decode complete network packet
 * const [decoded, bytesRead] = networkPacketCoder.decode(buffer);
 *
 * // Verify Ethernet frame using assertions
 * assertEquals(decoded.ethernet.destinationMAC, "00:1B:21:BB:0F:3B", 'Destination MAC should match router');
 * assertEquals(decoded.ethernet.sourceMAC, "00:0C:29:2E:84:5A", 'Source MAC should match host');
 * assertEquals(decoded.ethernet.etherType, 0x0800, 'EtherType should be IPv4 (0x0800)');
 *
 * // Verify IP header using assertions
 * assertEquals(decoded.ip.version, 0x45, 'IP version should be IPv4 with 5 words header');
 * assertEquals(decoded.ip.protocol, 6, 'Protocol should be TCP (6)');
 * assertEquals(decoded.ip.ttl, 64, 'TTL should be 64');
 * assertEquals(decoded.ip.sourceIP, "192.168.1.100", 'Source IP should match');
 * assertEquals(decoded.ip.destIP, "10.0.0.50", 'Destination IP should match');
 * assertEquals(decoded.ip.totalLength, totalPacketLength, 'IP total length should match calculated value');
 * assertEquals(decoded.ip.identification, 0x1234, 'Packet ID should match');
 * assertEquals(decoded.ip.flags, 0x4000, 'Flags should indicate no fragmentation');
 *
 * // Verify TCP header using assertions
 * assertEquals(decoded.tcp.sourcePort, 49152, 'Source port should be 49152');
 * assertEquals(decoded.tcp.destPort, 80, 'Destination port should be 80 (HTTP)');
 * assertEquals(decoded.tcp.sequenceNumber, 0x12345678, 'Sequence number should match');
 * assertEquals(decoded.tcp.ackNumber, 0, 'Acknowledgment number should be 0');
 * assertEquals(decoded.tcp.dataOffset, 0x50, 'Data offset should be 5 words');
 * assertEquals(decoded.tcp.flags, 0x02, 'SYN flag should be set');
 * assertEquals(decoded.tcp.windowSize, 65535, 'Window size should be maximum');
 * assertEquals(decoded.tcp.urgentPointer, 0, 'Urgent pointer should be 0');
 *
 * // Verify payload using assertions
 * assertEquals(decoded.payload.length, 5, 'Payload should have 5 bytes');
 * assertEquals(decoded.payload, [0x48, 0x65, 0x6c, 0x6c, 0x6f], 'Payload should be "Hello"');
 * assertEquals(String.fromCharCode(...decoded.payload), "Hello", 'Payload should decode to "Hello"');
 *
 * // Verify complete packet integrity using assertions
 * assertEquals(bytesWritten, bytesRead, 'Bytes written should equal bytes read');
 * assertEquals(decoded.ip.totalLength, totalPacketLength, 'IP total length should match calculated value');
 * assertEquals(decoded.tcp.dataOffset & 0xf0, 0x50, 'TCP data offset should be 5 words');
 *
 * // Verify frame size calculations
 * const calculatedFrameSize = ethernetHeaderLength + ipHeaderLength + tcpHeaderLength + payloadLength + payloadLengthPrefix;
 * assertEquals(bytesWritten, calculatedFrameSize, 'Total frame size should match calculated value');
 * assertEquals(calculatedFrameSize, 61, 'Frame size should be 61 bytes (14+20+20+2+5)');
 *
 * // Verify protocol stack hierarchy
 * assertEquals(decoded.ethernet.etherType, 0x0800, 'Ethernet should carry IPv4');
 * assertEquals(decoded.ip.protocol, 6, 'IPv4 should carry TCP');
 * assertEquals(decoded.tcp.destPort, 80, 'TCP should be destined for HTTP');
 * ```
 *
 * @module
 */

export {
  type Coder,
  type Context,
  createContext,
  type Decoder,
  type Encoder,
  isCoder,
  type ValueWithBytes,
} from "./core.ts";
export { computedRef, isRef, ref, type RefValue } from "./ref/ref.ts";
export { isValidLength, type LengthOrRef } from "./length.ts";
export { array, arrayWhile, type ArrayWhileCondition } from "./array/array.ts";

// deno-fmt-ignore
export {
  u8, u8be, u8le,
  u16, u16be, u16le,
  u32, u32be, u32le,
  u64, u64be, u64le,
  s8, s8be, s8le,
  s16, s16be, s16le,
  s32, s32be, s32le,
  s64, s64be, s64le,
  f16, f16be, f16le,
  f32, f32be, f32le,
  f64, f64be, f64le,
} from "./numeric/numeric.ts";
export { string } from "./string/string.ts";
export { struct } from "./struct/struct.ts";
export { bytes } from "./bytes/bytes.ts";
export { refine, type Refiner } from "./refine/refine.ts";
export { decode, encode } from "./helpers.ts";
export { autoGrowBuffer, type AutogrowOptions } from "./buffer.ts";
