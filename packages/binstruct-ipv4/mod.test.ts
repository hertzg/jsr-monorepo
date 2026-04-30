import { assertEquals } from "@std/assert";
import { ipv4Header } from "./mod.ts";
import type { Ipv4Header } from "./mod.ts";

const IPV4_HEADER_MIN_LENGTH = 20;

Deno.test("ipv4Header: round-trips a minimal header (no options)", () => {
  const coder = ipv4Header();
  const header: Ipv4Header = {
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: 40,
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
  };

  const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
  const bytesWritten = coder.encode(header, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, IPV4_HEADER_MIN_LENGTH);
  assertEquals(bytesRead, IPV4_HEADER_MIN_LENGTH);
  assertEquals(decoded.versionIhl, header.versionIhl);
  assertEquals(decoded.flagsFragmentOffset, header.flagsFragmentOffset);
  assertEquals(decoded.sourceAddress, header.sourceAddress);
  assertEquals(decoded.destinationAddress, header.destinationAddress);
  assertEquals(decoded.headerChecksum, header.headerChecksum);
  assertEquals(decoded.options.length, 0);
});

Deno.test("ipv4Header: encodes version and IHL into byte 0", () => {
  const coder = ipv4Header();
  const header: Ipv4Header = {
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
  };

  const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
  coder.encode(header, buffer);

  assertEquals(buffer[0], 0x45); // version=4 (0b0100), ihl=5 (0b0101)
});

Deno.test("ipv4Header: round-trips fragmented packet flags", () => {
  const coder = ipv4Header();
  // deno-fmt-ignore
  const flagCases: Array<Ipv4Header["flagsFragmentOffset"]> = [
    { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
    { reserved: 0, dontFragment: 1, moreFragments: 0, fragmentOffset: 0 },
    { reserved: 0, dontFragment: 0, moreFragments: 1, fragmentOffset: 185 },
    { reserved: 0, dontFragment: 0, moreFragments: 1, fragmentOffset: 0x1fff },
  ];

  for (const flagsFragmentOffset of flagCases) {
    const header: Ipv4Header = {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 1500,
      identification: 0xdead,
      flagsFragmentOffset,
      timeToLive: 64,
      protocol: 6,
      headerChecksum: 0,
      sourceAddress: "10.0.0.1",
      destinationAddress: "10.0.0.2",
      options: new Uint8Array(0),
    };

    const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
    coder.encode(header, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.flagsFragmentOffset, flagsFragmentOffset);
  }
});

Deno.test("ipv4Header: options length tracks IHL", () => {
  const coder = ipv4Header();
  // deno-fmt-ignore
  const options = new Uint8Array([
    0x83, 0x07, 0x04, 0x0a, 0x00, 0x00, 0x01, 0x00, // Loose Source Routing
    0x00, 0x00, 0x00, 0x00,
  ]);

  const header: Ipv4Header = {
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
  };

  const buffer = new Uint8Array(32);
  const bytesWritten = coder.encode(header, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 32);
  assertEquals(bytesRead, 32);
  assertEquals(decoded.options.length, 12);
  assertEquals(Array.from(decoded.options), Array.from(options));
});

Deno.test("ipv4Header: decodes a real captured ICMP echo request", () => {
  // Captured IPv4 header preceding an ICMP echo request:
  //   45 00 00 54 a6 fb 40 00 40 01 b1 e6 c0 a8 01 64
  //   c0 a8 01 01
  // deno-fmt-ignore
  const captured = new Uint8Array([
    0x45, 0x00, 0x00, 0x54, 0xa6, 0xfb, 0x40, 0x00,
    0x40, 0x01, 0xb1, 0xe6, 0xc0, 0xa8, 0x01, 0x64,
    0xc0, 0xa8, 0x01, 0x01,
  ]);

  const coder = ipv4Header();
  const [decoded, bytesRead] = coder.decode(captured);

  assertEquals(bytesRead, IPV4_HEADER_MIN_LENGTH);
  assertEquals(decoded.versionIhl, { version: 4, ihl: 5 });
  assertEquals(decoded.typeOfService, 0);
  assertEquals(decoded.totalLength, 0x54);
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

  // Re-encode and verify the bytes match
  const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
  const bytesWritten = coder.encode(decoded, buffer);
  assertEquals(bytesWritten, IPV4_HEADER_MIN_LENGTH);
  assertEquals(Array.from(buffer), Array.from(captured));
});

Deno.test("ipv4Header: round-trips edge-case addresses", () => {
  const coder = ipv4Header();
  const addresses: Array<[string, string]> = [
    ["0.0.0.0", "255.255.255.255"],
    ["127.0.0.1", "127.0.0.1"],
    ["255.255.255.255", "0.0.0.0"],
  ];

  for (const [src, dst] of addresses) {
    const header: Ipv4Header = {
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
    };

    const buffer = new Uint8Array(IPV4_HEADER_MIN_LENGTH);
    coder.encode(header, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.sourceAddress, src);
    assertEquals(decoded.destinationAddress, dst);
  }
});
