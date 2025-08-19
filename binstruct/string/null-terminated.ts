import { type Coder, createContext, kCoderKind } from "../core.ts";
import { refSetValue } from "@hertzg/binstruct/ref";

export const kKindStringNT = Symbol("stringNT");

/**
 * Creates a Coder for null-terminated strings.
 *
 * The string is encoded as UTF-8 bytes followed by a null byte (0x00).
 * Decoding reads until a null byte is encountered.
 *
 * @returns A Coder that can encode/decode null-terminated strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringNT } from "@hertzg/binstruct/string";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 *
 * // Define a network packet structure with null-terminated strings
 * const networkPacketCoder = struct({
 *   packetId: u32le(),           // Packet identifier
 *   sourceAddress: stringNT(),   // Source IP address (null-terminated)
 *   destinationAddress: stringNT(), // Destination IP address (null-terminated)
 *   protocol: u16le(),           // Protocol type
 *   payload: stringNT(),         // Payload data (null-terminated)
 * });
 *
 * // Create sample network packet
 * const packet = {
 *   packetId: 12345,
 *   sourceAddress: "192.168.1.100",
 *   destinationAddress: "192.168.1.200",
 *   protocol: 80, // HTTP
 *   payload: "GET /index.html HTTP/1.1",
 * };
 *
 * const buffer = new Uint8Array(500);
 * const bytesWritten = networkPacketCoder.encode(packet, buffer);
 * const [decoded, bytesRead] = networkPacketCoder.decode(buffer);
 * assertEquals(decoded, packet);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */

export function stringNT(): Coder<string> {
  let self: Coder<string>;
  return self = {
    [kCoderKind]: kKindStringNT,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      refSetValue(ctx, self, decoded);
      const stringBytes = new TextEncoder().encode(decoded);
      target.set(stringBytes, 0);
      target[stringBytes.length] = 0; // null terminator
      return stringBytes.length + 1;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");

      const cursor = encoded.indexOf(0x00);
      if (cursor === -1) {
        throw new Error("No null terminator found");
      }

      const stringBytes = encoded.subarray(0, cursor);
      const decoded = new TextDecoder().decode(stringBytes);
      refSetValue(ctx, self, decoded);
      return [decoded, cursor + 1];
    },
  };
}
