import { assertEquals } from "@std/assert";
import { ipv4 } from "./mod.ts";
import type { Ipv4 } from "./mod.ts";

const IPV4_HEADER_MIN_LENGTH = 20;

Deno.test("ipv4: round-trips a minimal datagram (no options, empty payload)", () => {
  const coder = ipv4();
  const datagram: Ipv4 = {
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: 20,
    identification: 0x1234,
    flagsFragmentOffset: {
      reserved: 0,
      dontFragment: 1,
      moreFragments: 0,
      fragmentOffset: 0,
    },
    timeToLive: 64,
    protocol: 6,
    headerChecksum: 0xb1e6,
    sourceAddress: "192.168.1.100",
    destinationAddress: "10.0.0.50",
    options: new Uint8Array(0),
    payload: new Uint8Array(0),
  };

  const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
  const bytesWritten = coder.encode(datagram, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, IPV4_HEADER_MIN_LENGTH);
  assertEquals(bytesRead, IPV4_HEADER_MIN_LENGTH);
  assertEquals(decoded.versionIhl, datagram.versionIhl);
  assertEquals(decoded.flagsFragmentOffset, datagram.flagsFragmentOffset);
  assertEquals(decoded.sourceAddress, datagram.sourceAddress);
  assertEquals(decoded.destinationAddress, datagram.destinationAddress);
  assertEquals(decoded.headerChecksum, datagram.headerChecksum);
  assertEquals(decoded.options.length, 0);
  assertEquals(decoded.payload.length, 0);
});

Deno.test("ipv4: encodes version and IHL into byte 0", () => {
  const coder = ipv4();
  const datagram: Ipv4 = {
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: 20,
    identification: 0,
    flagsFragmentOffset: {
      reserved: 0,
      dontFragment: 0,
      moreFragments: 0,
      fragmentOffset: 0,
    },
    timeToLive: 0,
    protocol: 0,
    headerChecksum: 0,
    sourceAddress: "0.0.0.0",
    destinationAddress: "0.0.0.0",
    options: new Uint8Array(0),
    payload: new Uint8Array(0),
  };

  const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
  coder.encode(datagram, buffer);

  assertEquals(buffer[0], 0x45); // version=4 (0b0100), ihl=5 (0b0101)
});

Deno.test("ipv4: round-trips fragmented packet flags", () => {
  const coder = ipv4();
  // deno-fmt-ignore
  const flagCases: Array<Ipv4["flagsFragmentOffset"]> = [
    { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
    { reserved: 0, dontFragment: 1, moreFragments: 0, fragmentOffset: 0 },
    { reserved: 0, dontFragment: 0, moreFragments: 1, fragmentOffset: 185 },
    { reserved: 0, dontFragment: 0, moreFragments: 1, fragmentOffset: 0x1fff },
  ];

  for (const flagsFragmentOffset of flagCases) {
    const datagram: Ipv4 = {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20,
      identification: 0xdead,
      flagsFragmentOffset,
      timeToLive: 64,
      protocol: 6,
      headerChecksum: 0,
      sourceAddress: "10.0.0.1",
      destinationAddress: "10.0.0.2",
      options: new Uint8Array(0),
      payload: new Uint8Array(0),
    };

    const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
    coder.encode(datagram, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.flagsFragmentOffset, flagsFragmentOffset);
  }
});

Deno.test("ipv4: options length tracks IHL", () => {
  const coder = ipv4();
  // deno-fmt-ignore
  const options = new Uint8Array([
    0x83, 0x07, 0x04, 0x0a, 0x00, 0x00, 0x01, 0x00, // Loose Source Routing
    0x00, 0x00, 0x00, 0x00,
  ]);

  const datagram: Ipv4 = {
    versionIhl: { version: 4, ihl: 8 }, // 32-byte header
    typeOfService: 0,
    totalLength: 32,
    identification: 1,
    flagsFragmentOffset: {
      reserved: 0,
      dontFragment: 1,
      moreFragments: 0,
      fragmentOffset: 0,
    },
    timeToLive: 64,
    protocol: 1,
    headerChecksum: 0,
    sourceAddress: "192.0.2.1",
    destinationAddress: "192.0.2.2",
    options,
    payload: new Uint8Array(0),
  };

  const buffer = new Uint8Array(32);
  const bytesWritten = coder.encode(datagram, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 32);
  assertEquals(bytesRead, 32);
  assertEquals(decoded.options.length, 12);
  assertEquals(Array.from(decoded.options), Array.from(options));
});

Deno.test("ipv4: decodes a real captured ICMP echo request", () => {
  // Captured IPv4 datagram preceding an ICMP echo request. The 20 header
  // bytes match the original capture; we set totalLength to 20 and append
  // no payload so the datagram is self-sized.
  // deno-fmt-ignore
  const captured = new Uint8Array([
    0x45, 0x00, 0x00, 0x14, 0xa6, 0xfb, 0x40, 0x00,
    0x40, 0x01, 0xb1, 0xe6, 0xc0, 0xa8, 0x01, 0x64,
    0xc0, 0xa8, 0x01, 0x01,
  ]);

  const coder = ipv4();
  const [decoded, bytesRead] = coder.decode(captured);

  assertEquals(bytesRead, IPV4_HEADER_MIN_LENGTH);
  assertEquals(decoded.versionIhl, { version: 4, ihl: 5 });
  assertEquals(decoded.typeOfService, 0);
  assertEquals(decoded.totalLength, 20);
  assertEquals(decoded.identification, 0xa6fb);
  assertEquals(decoded.flagsFragmentOffset, {
    reserved: 0,
    dontFragment: 1,
    moreFragments: 0,
    fragmentOffset: 0,
  });
  assertEquals(decoded.timeToLive, 64);
  assertEquals(decoded.protocol, 1); // ICMP
  assertEquals(decoded.headerChecksum, 0xb1e6);
  assertEquals(decoded.sourceAddress, "192.168.1.100");
  assertEquals(decoded.destinationAddress, "192.168.1.1");
  assertEquals(decoded.options.length, 0);
  assertEquals(decoded.payload.length, 0);

  // Re-encode and verify the bytes match
  const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
  const bytesWritten = coder.encode(decoded, buffer);
  assertEquals(bytesWritten, IPV4_HEADER_MIN_LENGTH);
  assertEquals(Array.from(buffer), Array.from(captured));
});

Deno.test("ipv4: round-trips edge-case addresses", () => {
  const coder = ipv4();
  const addresses: Array<[string, string]> = [
    ["0.0.0.0", "255.255.255.255"],
    ["127.0.0.1", "127.0.0.1"],
    ["255.255.255.255", "0.0.0.0"],
  ];

  for (const [src, dst] of addresses) {
    const datagram: Ipv4 = {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20,
      identification: 0,
      flagsFragmentOffset: {
        reserved: 0,
        dontFragment: 0,
        moreFragments: 0,
        fragmentOffset: 0,
      },
      timeToLive: 1,
      protocol: 0,
      headerChecksum: 0,
      sourceAddress: src,
      destinationAddress: dst,
      options: new Uint8Array(0),
      payload: new Uint8Array(0),
    };

    const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
    coder.encode(datagram, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.sourceAddress, src);
    assertEquals(decoded.destinationAddress, dst);
  }
});

Deno.test("ipv4: round-trips a datagram with payload bytes", () => {
  const coder = ipv4();
  const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const datagram: Ipv4 = {
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: 24,
    identification: 0,
    flagsFragmentOffset: {
      reserved: 0,
      dontFragment: 0,
      moreFragments: 0,
      fragmentOffset: 0,
    },
    timeToLive: 64,
    protocol: 17,
    headerChecksum: 0,
    sourceAddress: "10.0.0.1",
    destinationAddress: "10.0.0.2",
    options: new Uint8Array(0),
    payload,
  };

  const buffer = new Uint8Array(24);
  const bytesWritten = coder.encode(datagram, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 24);
  assertEquals(bytesRead, 24);
  assertEquals(decoded.payload, payload);
});
