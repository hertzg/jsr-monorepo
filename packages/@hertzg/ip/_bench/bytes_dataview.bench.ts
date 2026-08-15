// Apples-to-apples, unlike the rest of this directory: both sides implement
// the same `ByteCodec` interface, take the same arguments, return the same
// values and throw the same errors. The only difference is how the bytes are
// moved — index arithmetic versus a `DataView`.
//
// The baseline is imported from `../bytes.ts`, so it is the shipped code
// rather than a copy that can drift away from it. The `DataView` side lives
// here because it is the rejected alternative; ADR 0012 records the decision
// and these numbers are what it rests on.
//
//   deno task bench:bytes

import {
  ipv4FromBytes,
  ipv4ToBytes,
  ipv6FromBytes,
  ipv6ToBytes,
} from "../bytes.ts";

/**
 * The surface both implementations provide. Splitting it out is what makes
 * the comparison meaningful: the `DataView` side cannot quietly do less work
 * than the shipped one and look faster for it.
 */
type ByteCodec = {
  ipv4FromBytes(bytes: Uint8Array, offset?: number): number;
  ipv4ToBytes(address: number, into?: Uint8Array, offset?: number): Uint8Array;
  ipv6FromBytes(bytes: Uint8Array, offset?: number): bigint;
  ipv6ToBytes(address: bigint, into?: Uint8Array, offset?: number): Uint8Array;
};

/** The shipped implementation: index arithmetic over the `Uint8Array`. */
const indexed: ByteCodec = {
  ipv4FromBytes,
  ipv4ToBytes,
  ipv6FromBytes,
  ipv6ToBytes,
};

const IPV4_BYTE_LENGTH = 4;
const IPV6_BYTE_LENGTH = 16;

function spanRangeError(
  version: string,
  width: number,
  offset: number,
  byteLength: number,
): RangeError {
  return new RangeError(
    `${version} needs ${width} bytes at offset ${offset} of a ${byteLength}-byte buffer`,
  );
}

/**
 * The rejected alternative: a `DataView` per call. It cannot be hoisted —
 * the buffer differs on every call — which is the whole point of the
 * measurement.
 */
const dataview: ByteCodec = {
  ipv4FromBytes(bytes: Uint8Array, offset = 0): number {
    if (offset < 0 || offset + IPV4_BYTE_LENGTH > bytes.length) {
      throw spanRangeError("IPv4", IPV4_BYTE_LENGTH, offset, bytes.length);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getUint32(offset, false);
  },

  ipv4ToBytes(address: number, into?: Uint8Array, offset = 0): Uint8Array {
    if (address < 0 || address > 4294967295 || !Number.isInteger(address)) {
      throw new RangeError(
        `IPv4 value out of range: ${address} (must be 0 to 4294967295)`,
      );
    }

    if (into === undefined) {
      const bytes = new Uint8Array(IPV4_BYTE_LENGTH);
      new DataView(bytes.buffer).setUint32(0, address, false);
      return bytes;
    }

    if (offset < 0 || offset + IPV4_BYTE_LENGTH > into.length) {
      throw spanRangeError("IPv4", IPV4_BYTE_LENGTH, offset, into.length);
    }
    new DataView(into.buffer, into.byteOffset, into.byteLength)
      .setUint32(offset, address, false);
    return into.subarray(offset, offset + IPV4_BYTE_LENGTH);
  },

  ipv6FromBytes(bytes: Uint8Array, offset = 0): bigint {
    if (offset < 0 || offset + IPV6_BYTE_LENGTH > bytes.length) {
      throw spanRangeError("IPv6", IPV6_BYTE_LENGTH, offset, bytes.length);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return (view.getBigUint64(offset, false) << 64n) |
      view.getBigUint64(offset + 8, false);
  },

  ipv6ToBytes(address: bigint, into?: Uint8Array, offset = 0): Uint8Array {
    if (address < 0n || address > 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) {
      throw new RangeError(
        `IPv6 value out of range: ${address} (must be 0 to 2^128-1)`,
      );
    }

    const low = 0xFFFF_FFFF_FFFF_FFFFn;
    if (into === undefined) {
      const bytes = new Uint8Array(IPV6_BYTE_LENGTH);
      const view = new DataView(bytes.buffer);
      view.setBigUint64(0, address >> 64n, false);
      view.setBigUint64(8, address & low, false);
      return bytes;
    }

    if (offset < 0 || offset + IPV6_BYTE_LENGTH > into.length) {
      throw spanRangeError("IPv6", IPV6_BYTE_LENGTH, offset, into.length);
    }
    const view = new DataView(into.buffer, into.byteOffset, into.byteLength);
    view.setBigUint64(offset, address >> 64n, false);
    view.setBigUint64(offset + 8, address & low, false);
    return into.subarray(offset, offset + IPV6_BYTE_LENGTH);
  },
};

// A benchmark of two implementations is worthless if they disagree, so prove
// they don't before measuring. Throws at module load if they ever diverge.
function assertAgreement(): void {
  const packet = new Uint8Array(64);
  for (let i = 0; i < packet.length; i++) {
    packet[i] = (i * 37 + 11) & 0xFF;
  }

  for (let offset = 0; offset <= 48; offset++) {
    if (
      indexed.ipv4FromBytes(packet, offset) !==
        dataview.ipv4FromBytes(packet, offset)
    ) {
      throw new Error(`ipv4FromBytes disagree at offset ${offset}`);
    }
    if (
      indexed.ipv6FromBytes(packet, offset) !==
        dataview.ipv6FromBytes(packet, offset)
    ) {
      throw new Error(`ipv6FromBytes disagree at offset ${offset}`);
    }
  }

  for (const address of [0, 1, 167772161, 3232235777, 4294967295]) {
    const a = new Uint8Array(20).fill(0xAA);
    const b = new Uint8Array(20).fill(0xAA);
    const wroteA = indexed.ipv4ToBytes(address, a, 6);
    const wroteB = dataview.ipv4ToBytes(address, b, 6);
    if (a.join() !== b.join() || wroteA.join() !== wroteB.join()) {
      throw new Error(`ipv4ToBytes disagree for ${address}`);
    }
    if (
      indexed.ipv4ToBytes(address).join() !==
        dataview.ipv4ToBytes(address).join()
    ) {
      throw new Error(`ipv4ToBytes allocating disagree for ${address}`);
    }
  }

  const addresses = [
    0n,
    1n,
    0x2001_0db8_0000_0000_0000_0000_0000_0001n,
    0xFFFF_0000_0000n | 3232235777n,
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
  ];
  for (const address of addresses) {
    const a = new Uint8Array(40).fill(0xAA);
    const b = new Uint8Array(40).fill(0xAA);
    const wroteA = indexed.ipv6ToBytes(address, a, 8);
    const wroteB = dataview.ipv6ToBytes(address, b, 8);
    if (a.join() !== b.join() || wroteA.join() !== wroteB.join()) {
      throw new Error(`ipv6ToBytes disagree for ${address}`);
    }
    if (
      indexed.ipv6ToBytes(address).join() !==
        dataview.ipv6ToBytes(address).join()
    ) {
      throw new Error(`ipv6ToBytes allocating disagree for ${address}`);
    }
  }
}

assertAgreement();

// A 20-byte IPv4 header: source at offset 12, destination at 16.
// deno-fmt-ignore
const PACKET = new Uint8Array([
  0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
  0x40, 0x06, 0x00, 0x00,
  10, 0, 0, 1,
  192, 168, 1, 1,
]);

// Reads get their own populated buffer. An all-zero one would flatter the
// index implementation: every 32-bit group converts to `0n`, which is far
// cheaper bigint work than a real address.
// deno-fmt-ignore
const IPV6_PACKET = new Uint8Array([
  0x60, 0x00, 0x00, 0x00, 0x00, 0x14, 0x06, 0x40,
  0x20, 0x01, 0x0d, 0xb8, 0x85, 0xa3, 0x00, 0x00,
  0x00, 0x00, 0x8a, 0x2e, 0x03, 0x70, 0x73, 0x34,
]);

const FRAME = new Uint8Array(64);
const IPV4 = 3232235777;
const IPV6 = 0x2001_0db8_85a3_0000_0000_8a2e_0370_7334n;

Deno.bench("index arithmetic", {
  group: "ipv4 from bytes",
  baseline: true,
}, () => {
  indexed.ipv4FromBytes(PACKET, 12);
});

Deno.bench("DataView", { group: "ipv4 from bytes" }, () => {
  dataview.ipv4FromBytes(PACKET, 12);
});

Deno.bench("index arithmetic", {
  group: "ipv4 to bytes (into)",
  baseline: true,
}, () => {
  indexed.ipv4ToBytes(IPV4, FRAME, 12);
});

Deno.bench("DataView", { group: "ipv4 to bytes (into)" }, () => {
  dataview.ipv4ToBytes(IPV4, FRAME, 12);
});

Deno.bench("index arithmetic", {
  group: "ipv4 to bytes (allocating)",
  baseline: true,
}, () => {
  indexed.ipv4ToBytes(IPV4);
});

Deno.bench("DataView", { group: "ipv4 to bytes (allocating)" }, () => {
  dataview.ipv4ToBytes(IPV4);
});

Deno.bench("index arithmetic", {
  group: "ipv6 from bytes",
  baseline: true,
}, () => {
  indexed.ipv6FromBytes(IPV6_PACKET, 8);
});

Deno.bench("DataView", { group: "ipv6 from bytes" }, () => {
  dataview.ipv6FromBytes(IPV6_PACKET, 8);
});

Deno.bench("index arithmetic", {
  group: "ipv6 to bytes (into)",
  baseline: true,
}, () => {
  indexed.ipv6ToBytes(IPV6, FRAME, 8);
});

Deno.bench("DataView", { group: "ipv6 to bytes (into)" }, () => {
  dataview.ipv6ToBytes(IPV6, FRAME, 8);
});

Deno.bench("index arithmetic", {
  group: "ipv6 to bytes (allocating)",
  baseline: true,
}, () => {
  indexed.ipv6ToBytes(IPV6);
});

Deno.bench("DataView", { group: "ipv6 to bytes (allocating)" }, () => {
  dataview.ipv6ToBytes(IPV6);
});
