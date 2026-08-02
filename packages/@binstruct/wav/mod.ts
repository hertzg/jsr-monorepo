/**
 * WAV (RIFF) file encoding and decoding utilities using binary structures.
 *
 * This module provides coders for WAV file structures including:
 * - RIFF chunk with WAVE format identification
 * - Format chunk supporting multiple audio formats (PCM, IEEE float, A-law, μ-law, extensible)
 * - Data chunk with raw audio samples
 * - Optional chunks (fact, LIST)
 * - Complete WAV file structure (RIFF, fmt, data)
 *
 * Chunk sizes are taken from the structure as given; they are never recomputed,
 * and payload lengths are driven by the `chunkSize` field of their chunk.
 *
 * @example Basic WAV file encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { wavFile } from "@binstruct/wav";
 *
 * const wavCoder = wavFile();
 * const testWav = {
 *   riff: {
 *     chunkId: "RIFF" as const,
 *     chunkSize: 1038, // total file size minus the 8-byte RIFF header
 *     format: "WAVE" as const
 *   },
 *   fmt: {
 *     chunkId: "fmt " as const,
 *     chunkSize: 18, // 16 PCM fields plus the 2-byte cbSize
 *     audioFormat: 1, // PCM
 *     numChannels: 1, // Mono
 *     sampleRate: 44100,
 *     byteRate: 88200,
 *     blockAlign: 2,
 *     bitsPerSample: 16,
 *     cbSize: 0
 *   },
 *   data: {
 *     chunkId: "data" as const,
 *     chunkSize: 1000,
 *     audioData: new Array(1000).fill(0)
 *   }
 * };
 *
 * const buffer = new Uint8Array(2048);
 * const bytesWritten = wavCoder.encode(testWav, buffer);
 * const [decodedWav, bytesRead] = wavCoder.decode(buffer);
 *
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
 * assertEquals(decodedWav.riff.chunkId, "RIFF");
 * assertEquals(decodedWav.riff.format, "WAVE");
 * assertEquals(decodedWav.fmt.audioFormat, 1);
 * assertEquals(decodedWav.fmt.numChannels, 1);
 * assertEquals(decodedWav.fmt.sampleRate, 44100);
 * assertEquals(decodedWav.data.audioData.length, 1000);
 * ```
 *
 * @example IEEE float format
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { wavFile } from "@binstruct/wav";
 *
 * const floatWavCoder = wavFile();
 * const floatWav = {
 *   riff: {
 *     chunkId: "RIFF",
 *     chunkSize: 838, // total file size minus the 8-byte RIFF header
 *     format: "WAVE"
 *   },
 *   fmt: {
 *     chunkId: "fmt ",
 *     chunkSize: 18,
 *     audioFormat: 3, // IEEE Float
 *     numChannels: 2, // Stereo
 *     sampleRate: 48000,
 *     byteRate: 384000,
 *     blockAlign: 8,
 *     bitsPerSample: 32,
 *     cbSize: 0
 *   },
 *   data: {
 *     chunkId: "data",
 *     chunkSize: 800,
 *     audioData: new Array(800).fill(0)
 *   }
 * };
 *
 * const buffer = new Uint8Array(2048);
 * const bytesWritten = floatWavCoder.encode(floatWav, buffer);
 * const [decoded, bytesRead] = floatWavCoder.decode(buffer);
 *
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(bytesWritten, 846); // 12 (RIFF) + 26 (fmt) + 808 (data)
 * assertEquals(decoded.fmt.audioFormat, 3);
 * assertEquals(decoded.fmt.numChannels, 2);
 * assertEquals(decoded.data.audioData.length, 800);
 * ```
 *
 * @module @binstruct/wav
 */

import {
  array,
  computedRef,
  ref,
  string,
  struct,
  u16le,
  u32le,
  u8le,
} from "@hertzg/binstruct";
import type { Coder } from "@hertzg/binstruct";

/**
 * Represents a RIFF chunk structure.
 *
 * @property chunkId - Always "RIFF" (4 bytes)
 * @property chunkSize - Size of the file minus 8 bytes
 * @property format - Always "WAVE" (4 bytes)
 */
export interface RiffChunk {
  chunkId: string;
  chunkSize: number;
  format: string;
}

/**
 * Represents a format chunk structure.
 *
 * @property chunkId - Always "fmt " (4 bytes)
 * @property chunkSize - Size of the format chunk (16 for PCM, 18+ for extended)
 * @property audioFormat - Audio format code (1=PCM, 3=IEEE float, 6=A-law, 7=μ-law, 65534=extensible)
 * @property numChannels - Number of audio channels (1=mono, 2=stereo, etc.)
 * @property sampleRate - Sample rate in Hz
 * @property byteRate - Byte rate (sampleRate * numChannels * bitsPerSample / 8)
 * @property blockAlign - Block align (numChannels * bitsPerSample / 8)
 * @property bitsPerSample - Bits per sample (8, 16, 24, 32)
 * @property cbSize - Size of extra format bytes (0 for PCM, 2+ for extended formats)
 */
export interface FmtChunk {
  chunkId: string;
  chunkSize: number;
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  cbSize: number;
}

/**
 * Represents a data chunk structure.
 *
 * @property chunkId - Always "data" (4 bytes)
 * @property chunkSize - Size of audio data in bytes
 * @property audioData - Raw audio samples as array of bytes, exactly `chunkSize` long
 */
export interface DataChunk {
  chunkId: string;
  chunkSize: number;
  audioData: number[];
}

/**
 * Represents an optional fact chunk structure.
 *
 * @property chunkId - Always "fact" (4 bytes)
 * @property chunkSize - Always 4 for fact chunk
 * @property sampleLength - Number of samples (required for compressed formats)
 */
export interface FactChunk {
  chunkId: string;
  chunkSize: number;
  sampleLength: number;
}

/**
 * Represents an optional LIST chunk structure.
 *
 * @property chunkId - Always "LIST" (4 bytes)
 * @property chunkSize - Size of the list type plus the list data
 * @property listType - Type of list (e.g., "INFO")
 * @property data - List data as array of bytes, exactly `chunkSize - 4` long
 */
export interface ListChunk {
  chunkId: string;
  chunkSize: number;
  listType: string;
  data: number[];
}

/**
 * Represents a complete WAV file structure.
 *
 * @property riff - RIFF header chunk
 * @property fmt - Format chunk
 * @property data - Audio data chunk
 */
export interface WavFile {
  riff: RiffChunk;
  fmt: FmtChunk;
  data: DataChunk;
}

/**
 * Creates a coder for RIFF chunks.
 *
 * Encodes and decodes RIFF header structures with:
 * - 4-byte chunk ID ("RIFF")
 * - 4-byte chunk size (little-endian)
 * - 4-byte format ("WAVE")
 *
 * @returns A coder that can encode/decode RiffChunk objects
 *
 * @example Basic RIFF chunk encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { riffChunk } from "@binstruct/wav";
 *
 * const riffCoder = riffChunk();
 * const testRiff = {
 *   chunkId: "RIFF",
 *   chunkSize: 44,
 *   format: "WAVE"
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = riffCoder.encode(testRiff, buffer);
 * const [decoded, bytesRead] = riffCoder.decode(buffer);
 *
 * assertEquals(bytesRead, 12);
 * assertEquals(bytesWritten, 12);
 * assertEquals(decoded.chunkId, "RIFF");
 * assertEquals(decoded.chunkSize, 44);
 * assertEquals(decoded.format, "WAVE");
 * ```
 */
export function riffChunk(): Coder<RiffChunk> {
  return struct({
    chunkId: string(4),
    chunkSize: u32le(),
    format: string(4),
  });
}

/**
 * Creates a coder for format chunks.
 *
 * Encodes and decodes format chunk structures supporting:
 * - Extended formats with cbSize field (18+ bytes)
 * - Multiple audio format codes (PCM, IEEE float, A-law, μ-law, extensible)
 *
 * The `cbSize` field is always encoded and decoded, so the chunk payload is
 * always 18 bytes and `chunkSize` should be 18. The canonical 16-byte PCM
 * `fmt ` chunk, which omits `cbSize`, is not supported.
 *
 * @returns A coder that can encode/decode FmtChunk objects
 *
 * @example Basic format chunk encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { fmtChunk } from "@binstruct/wav";
 *
 * const fmtCoder = fmtChunk();
 * const testFmt = {
 *   chunkId: "fmt ",
 *   chunkSize: 18, // 16 PCM fields plus the 2-byte cbSize
 *   audioFormat: 1, // PCM
 *   numChannels: 2, // Stereo
 *   sampleRate: 44100,
 *   byteRate: 176400,
 *   blockAlign: 4,
 *   bitsPerSample: 16,
 *   cbSize: 0
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = fmtCoder.encode(testFmt, buffer);
 * const [decoded, bytesRead] = fmtCoder.decode(buffer);
 *
 * assertEquals(bytesRead, 26);
 * assertEquals(bytesWritten, 26); // 4 (chunkId) + 4 (chunkSize) + 18 (fmt data)
 * assertEquals(decoded.chunkId, "fmt ");
 * assertEquals(decoded.audioFormat, 1);
 * assertEquals(decoded.numChannels, 2);
 * assertEquals(decoded.sampleRate, 44100);
 * assertEquals(decoded.bitsPerSample, 16);
 * ```
 */
export function fmtChunk(): Coder<FmtChunk> {
  return struct({
    chunkId: string(4),
    chunkSize: u32le(),
    audioFormat: u16le(),
    numChannels: u16le(),
    sampleRate: u32le(),
    byteRate: u32le(),
    blockAlign: u16le(),
    bitsPerSample: u16le(),
    cbSize: u16le(),
  });
}

/**
 * Creates a coder for data chunks.
 *
 * Encodes and decodes data chunk structures with:
 * - 4-byte chunk ID ("data")
 * - 4-byte chunk size (little-endian)
 * - Exactly `chunkSize` bytes of audio data
 *
 * The audio data length is driven by the `chunkSize` field, as required by RIFF:
 * a `data` chunk carries no length of its own beyond `chunkSize`.
 *
 * @returns A coder that can encode/decode DataChunk objects
 *
 * @example Basic data chunk encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dataChunk } from "@binstruct/wav";
 *
 * const dataCoder = dataChunk();
 * const testData = {
 *   chunkId: "data",
 *   chunkSize: 1000,
 *   audioData: new Array(1000).fill(0)
 * };
 *
 * const buffer = new Uint8Array(2048);
 * const bytesWritten = dataCoder.encode(testData, buffer);
 * const [decoded, bytesRead] = dataCoder.decode(buffer);
 *
 * assertEquals(bytesRead, 1008);
 * assertEquals(bytesWritten, 1008); // 4 (chunkId) + 4 (chunkSize) + 1000 (audioData)
 * assertEquals(decoded.chunkId, "data");
 * assertEquals(decoded.chunkSize, 1000);
 * assertEquals(decoded.audioData.length, 1000); // Uses chunkSize reference
 * ```
 */
export function dataChunk(): Coder<DataChunk> {
  const chunkSize = u32le();
  return struct({
    chunkId: string(4),
    chunkSize,
    audioData: array(u8le(), ref(chunkSize)),
  });
}

/**
 * Creates a coder for fact chunks.
 *
 * Encodes and decodes fact chunk structures with:
 * - 4-byte chunk ID ("fact")
 * - 4-byte chunk size (always 4)
 * - 4-byte sample length
 *
 * @returns A coder that can encode/decode FactChunk objects
 *
 * @example Basic fact chunk encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { factChunk } from "@binstruct/wav";
 *
 * const factCoder = factChunk();
 * const testFact = {
 *   chunkId: "fact",
 *   chunkSize: 4,
 *   sampleLength: 44100
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = factCoder.encode(testFact, buffer);
 * const [decoded, bytesRead] = factCoder.decode(buffer);
 *
 * assertEquals(bytesRead, 12);
 * assertEquals(bytesWritten, 12);
 * assertEquals(decoded.chunkId, "fact");
 * assertEquals(decoded.chunkSize, 4);
 * assertEquals(decoded.sampleLength, 44100);
 * ```
 */
export function factChunk(): Coder<FactChunk> {
  return struct({
    chunkId: string(4),
    chunkSize: u32le(),
    sampleLength: u32le(),
  });
}

/**
 * Creates a coder for LIST chunks.
 *
 * Encodes and decodes LIST chunk structures with:
 * - 4-byte chunk ID ("LIST")
 * - 4-byte chunk size
 * - 4-byte list type
 * - Exactly `chunkSize - 4` bytes of list data
 *
 * A RIFF `LIST` chunk counts its list type towards `chunkSize`, so the payload
 * that follows the list type is four bytes shorter than `chunkSize`.
 *
 * @returns A coder that can encode/decode ListChunk objects
 *
 * @example Basic LIST chunk encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { listChunk } from "@binstruct/wav";
 *
 * const listCoder = listChunk();
 * const testList = {
 *   chunkId: "LIST",
 *   chunkSize: 20,
 *   listType: "INFO",
 *   data: new Array(16).fill(0)
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = listCoder.encode(testList, buffer);
 * const [decoded, bytesRead] = listCoder.decode(buffer);
 *
 * assertEquals(bytesRead, 28);
 * assertEquals(bytesWritten, 28); // 4 (chunkId) + 4 (chunkSize) + 4 (listType) + 16 (data)
 * assertEquals(decoded.chunkId, "LIST");
 * assertEquals(decoded.chunkSize, 20);
 * assertEquals(decoded.listType, "INFO");
 * assertEquals(decoded.data.length, 16); // chunkSize - 4 (listType)
 * ```
 */
export function listChunk(): Coder<ListChunk> {
  const chunkSize = u32le();
  return struct({
    chunkId: string(4),
    chunkSize,
    listType: string(4),
    data: array(u8le(), computedRef([ref(chunkSize)], (size) => size - 4)),
  });
}

/**
 * Creates a coder for complete WAV files.
 *
 * Encodes and decodes WAV files laid out as exactly three chunks in this order:
 * - RIFF header chunk
 * - Format chunk
 * - Data chunk with audio samples
 *
 * Files carrying additional chunks (`fact`, `LIST`) or a different chunk order
 * are not handled; compose {@link factChunk} and {@link listChunk} manually for
 * those.
 *
 * @returns A coder that can encode/decode WavFile objects
 *
 * @example Complete WAV file encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { wavFile } from "@binstruct/wav";
 *
 * const wavCoder = wavFile();
 * const testWav = {
 *   riff: {
 *     chunkId: "RIFF" as const,
 *     chunkSize: 1038, // total file size minus the 8-byte RIFF header
 *     format: "WAVE" as const
 *   },
 *   fmt: {
 *     chunkId: "fmt " as const,
 *     chunkSize: 18, // 16 PCM fields plus the 2-byte cbSize
 *     audioFormat: 1, // PCM
 *     numChannels: 1, // Mono
 *     sampleRate: 44100,
 *     byteRate: 88200,
 *     blockAlign: 2,
 *     bitsPerSample: 16,
 *     cbSize: 0
 *   },
 *   data: {
 *     chunkId: "data" as const,
 *     chunkSize: 1000,
 *     audioData: new Array(1000).fill(0)
 *   }
 * };
 *
 * const buffer = new Uint8Array(2048);
 * const bytesWritten = wavCoder.encode(testWav, buffer);
 * const [decoded, bytesRead] = wavCoder.decode(buffer);
 *
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
 * assertEquals(decoded.riff.chunkId, "RIFF");
 * assertEquals(decoded.riff.format, "WAVE");
 * assertEquals(decoded.fmt.audioFormat, 1);
 * assertEquals(decoded.fmt.numChannels, 1);
 * assertEquals(decoded.fmt.sampleRate, 44100);
 * assertEquals(decoded.data.audioData.length, 1000);
 * ```
 */
export function wavFile(): Coder<WavFile> {
  return struct({
    riff: riffChunk(),
    fmt: fmtChunk(),
    data: dataChunk(),
  });
}
