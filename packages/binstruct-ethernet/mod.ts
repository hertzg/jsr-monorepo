/**
 * Ethernet frame encoding and decoding utilities using binary structures.
 *
 * This module provides coders for Ethernet frame structures including:
 * - Ethernet II frames with standard headers
 * - MAC address encoding/decoding
 * - EtherType field handling
 * - Frame payload management
 *
 * @example Basic Ethernet frame encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 *
 * const frameCoder = ethernet2Frame();
 * const testFrame = {
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]),
 *   etherType: 0x0800, // IPv4
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14])
 * };
 *
 * const buffer = new Uint8Array(1500);
 * const bytesWritten = frameCoder.encode(testFrame, buffer);
 * const [decodedFrame, bytesRead] = frameCoder.decode(buffer);
 *
 * assertEquals(bytesRead, buffer.length);
 * assertEquals(bytesWritten, 18);
 * assertEquals(decodedFrame.dstMac, testFrame.dstMac);
 * assertEquals(decodedFrame.srcMac, testFrame.srcMac);
 * assertEquals(decodedFrame.etherType, testFrame.etherType);
 * ```
 *
 * @module @binstruct/ethernet
 */

import { bytes, struct, u16be } from "@hertzg/binstruct";
import type { Coder, LengthOrRef } from "@hertzg/binstruct";

/**
 * Represents an Ethernet II frame structure.
 *
 * @property dstMac - Destination MAC address as 6-byte array
 * @property srcMac - Source MAC address as 6-byte array
 * @property etherType - EtherType field indicating payload protocol (e.g., 0x0800 for IPv4)
 * @property payload - Frame payload data as array of bytes
 */
export interface Ethernet2Frame {
  dstMac: Uint8Array;
  srcMac: Uint8Array;
  etherType: number;
  payload: Uint8Array;
}

/**
 * Creates a coder for Ethernet II frames.
 *
 * Encodes and decodes Ethernet II frame structures with:
 * - 6-byte destination MAC address
 * - 6-byte source MAC address
 * - 2-byte EtherType field (big-endian)
 * - Variable-length payload
 *
 * @returns A coder that can encode/decode Ethernet2Frame objects
 *
 * @example Basic Ethernet frame encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 *
 * const frameCoder = ethernet2Frame();
 * const testFrame = {
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]),
 *   etherType: 0x0800, // IPv4
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14])
 * };
 *
 * const buffer = new Uint8Array(1500);
 * const bytesWritten = frameCoder.encode(testFrame, buffer);
 * const [decodedFrame, bytesRead] = frameCoder.decode(buffer);
 *
 * assertEquals(bytesRead, buffer.length);
 * assertEquals(bytesWritten, 18);
 * assertEquals(decodedFrame.dstMac, testFrame.dstMac);
 * assertEquals(decodedFrame.srcMac, testFrame.srcMac);
 * assertEquals(decodedFrame.etherType, testFrame.etherType);
 * ```
 */
export function ethernet2Frame(
  lengthOrRefOfPayload?: LengthOrRef | null,
): Coder<Ethernet2Frame> {
  return struct({
    dstMac: bytes(6),
    srcMac: bytes(6),
    etherType: u16be(),
    payload: bytes(lengthOrRefOfPayload),
  });
}

/**
 * Converts a MAC address byte array to a formatted string.
 *
 * Takes a Uint8Array containing MAC address bytes and formats them as a
 * colon-separated hexadecimal string (e.g., "00:11:22:33:44:55").
 *
 * @param bytes - MAC address as Uint8Array (first 6 bytes are used)
 * @param delimiter - String delimiter between bytes (default: ":")
 * @returns Formatted MAC address string
 *
 * @example Converting MAC address bytes to string
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyMacAddress } from "@binstruct/ethernet";
 *
 * const macBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
 * const macString = stringifyMacAddress(macBytes);
 * assertEquals(macString, "00:11:22:33:44:55");
 *
 * // With custom delimiter
 * const macStringDashes = stringifyMacAddress(macBytes, "-");
 * assertEquals(macStringDashes, "00-11-22-33-44-55");
 * ```
 */
export function stringifyMacAddress(
  bytes: Uint8Array,
  delimiter: string = ":",
): string {
  const macBytes = new Uint8Array(6);
  macBytes.set(bytes.subarray(0, 6), 0);
  return Array.from(macBytes).map((byte) => byte.toString(16).padStart(2, "0"))
    .join(delimiter);
}

/**
 * Parses a MAC address string into a byte array.
 *
 * Takes a formatted MAC address string (e.g., "00:11:22:33:44:55") and
 * converts it to a Uint8Array containing the 6 bytes of the MAC address.
 *
 * @param macString - MAC address string in format "XX:XX:XX:XX:XX:XX"
 * @param delimiter - String delimiter between bytes (default: ":")
 * @returns MAC address as Uint8Array
 * @throws {Error} When the MAC address format is invalid (not exactly 6 parts separated by delimiter)
 * @throws {Error} When any byte part is not a valid hexadecimal number or is out of range (0-255)
 *
 * @example Parsing MAC address string to bytes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMacAddress } from "@binstruct/ethernet";
 *
 * const macString = "00:11:22:33:44:55";
 * const macBytes = parseMacAddress(macString);
 * assertEquals(macBytes, new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]));
 *
 * // With custom delimiter
 * const macStringDashes = "00-11-22-33-44-55";
 * const macBytesDashes = parseMacAddress(macStringDashes, "-");
 * assertEquals(macBytesDashes, new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]));
 * ```
 */
export function parseMacAddress(
  macString: string,
  delimiter: string = ":",
): Uint8Array {
  const parts = macString.split(delimiter);
  if (parts.length !== 6) {
    throw new Error(
      `Invalid MAC address format: expected 6 parts separated by "${delimiter}", got ${parts.length}`,
    );
  }

  const bytes = new Uint8Array(6);
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const byte = Number.parseInt(part, 16);
    if (Number.isNaN(byte) || byte < 0 || byte > 255) {
      throw new Error(`Invalid MAC address byte: "${part}"`);
    }
    bytes[index] = byte;
  }

  return bytes;
}
