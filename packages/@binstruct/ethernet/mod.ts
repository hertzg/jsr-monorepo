/**
 * Ethernet II frame encoding and decoding.
 *
 * For MAC address parsing/stringification, use the sister package
 * {@link https://jsr.io/@hertzg/mac @hertzg/mac}.
 *
 * ## Migration from 0.x
 *
 * The `parseMacAddress` and `stringifyMacAddress` exports were removed in
 * 1.0. Replace with `@hertzg/mac`:
 *
 * ```ts ignore
 * // before
 * import { parseMacAddress, stringifyMacAddress } from "@binstruct/ethernet";
 * // after
 * import { parse as parseMac, stringify as stringifyMac } from "@hertzg/mac";
 * ```
 *
 * @example Basic encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 *
 * const frameCoder = ethernet2Frame();
 * const testFrame = {
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]),
 *   etherType: 0x0800, // IPv4
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
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
 * @example Compose with `@hertzg/mac` for string-form addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { refine } from "@hertzg/binstruct";
 * import { ethernet2Frame, type Ethernet2Frame } from "@binstruct/ethernet";
 * import { parse as parseMac, stringify as stringifyMac } from "@hertzg/mac";
 *
 * type StringMacFrame = Omit<Ethernet2Frame, "dstMac" | "srcMac"> & {
 *   dstMac: string;
 *   srcMac: string;
 * };
 *
 * const frameCoder = refine(ethernet2Frame(), {
 *   refine: (frame: Ethernet2Frame): StringMacFrame => ({
 *     ...frame,
 *     dstMac: stringifyMac(frame.dstMac),
 *     srcMac: stringifyMac(frame.srcMac),
 *   }),
 *   unrefine: (frame: StringMacFrame): Ethernet2Frame => ({
 *     ...frame,
 *     dstMac: parseMac(frame.dstMac),
 *     srcMac: parseMac(frame.srcMac),
 *   }),
 * })();
 *
 * const buffer = new Uint8Array(1500);
 * frameCoder.encode({
 *   dstMac: "00:11:22:33:44:55",
 *   srcMac: "66:77:88:99:aa:bb",
 *   etherType: 0x0800,
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
 * }, buffer);
 * const [decoded] = frameCoder.decode(buffer);
 * assertEquals(decoded.dstMac, "00:11:22:33:44:55");
 * ```
 *
 * @module @binstruct/ethernet
 */

import { bytes, struct, u16be } from "@hertzg/binstruct";
import type { Coder } from "@hertzg/binstruct";

/**
 * Ethernet II frame.
 *
 * @property dstMac - Destination MAC address as 6-byte array
 * @property srcMac - Source MAC address as 6-byte array
 * @property etherType - EtherType field indicating payload protocol (e.g., 0x0800 for IPv4)
 * @property payload - Frame payload as bytes
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
 * Layout: 6-byte destination MAC, 6-byte source MAC, 2-byte EtherType
 * (big-endian), then variable-length payload (default: "rest of buffer").
 *
 * Pass `parts` to override individual sub-coders — for example, hand in your
 * own `bytes(N)` to fix the payload size, or your own `u16be()` for `etherType`
 * so a composer can `ref()` it for protocol dispatch.
 *
 * @param parts Optional per-field sub-coder overrides.
 * @returns A `Coder<Ethernet2Frame>`.
 *
 * @example Basic encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 *
 * const frameCoder = ethernet2Frame();
 * const testFrame = {
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB]),
 *   etherType: 0x0800,
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
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
export function ethernet2Frame(): Coder<Ethernet2Frame> {
  return struct({
    dstMac: bytes(6),
    srcMac: bytes(6),
    etherType: u16be(),
    payload: bytes(),
  });
}
