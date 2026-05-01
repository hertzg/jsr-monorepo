import { assert, assertEquals } from "@std/assert";
import { ARP_OPCODE } from "@binstruct/arp";
import { inetCoder, type InetFrameRefined, internetChecksum } from "./mod.ts";

Deno.test("internetChecksum: RFC 1071 §3 worked example", () => {
  // deno-fmt-ignore
  const sample = new Uint8Array([
    0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7,
  ]);
  assertEquals(internetChecksum(sample), 0x220d);
});

Deno.test("internetChecksum: a fully checksummed packet sums to zero", () => {
  // deno-fmt-ignore
  const echoRequest = new Uint8Array([
    0x08, 0x00, 0xf7, 0xfd, 0x00, 0x01, 0x00, 0x01,
  ]);
  assertEquals(internetChecksum(echoRequest), 0x0000);
});

Deno.test("internetChecksum: compute then verify on a longer packet", () => {
  // deno-fmt-ignore
  const packet = new Uint8Array([
    0x08, 0x00, 0x00, 0x00, 0x00, 0x05, 0x00, 0x07,
    0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xff, 0x00,
  ]);
  const sum = internetChecksum(packet);
  new DataView(packet.buffer).setUint16(2, sum);
  assertEquals(internetChecksum(packet), 0x0000);
});

Deno.test("internetChecksum: odd length pads with a trailing zero", () => {
  assertEquals(internetChecksum(new Uint8Array([0x01, 0x02, 0x03])), 0xfbfd);
});

Deno.test("internetChecksum: empty buffer is 0xffff", () => {
  assertEquals(internetChecksum(new Uint8Array(0)), 0xffff);
});

Deno.test("internetChecksum: carry folding wraps multiple times", () => {
  const data = new Uint8Array(0x10000).fill(0xff);
  assertEquals(internetChecksum(data), 0x0000);
});

Deno.test("inetCoder: round-trips ethernet → ipv4 → udp", () => {
  const value: InetFrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0800,
    payload: {
      kind: "ipv4",
      ipv4: {
        versionIhl: { version: 4, ihl: 5 },
        typeOfService: 0,
        totalLength: 32,
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
        sourceAddress: "192.0.2.1",
        destinationAddress: "192.0.2.2",
        options: new Uint8Array(0),
        payload: {
          kind: "udp",
          udp: {
            srcPort: 53,
            dstPort: 49152,
            length: 12,
            checksum: 0,
            payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
          },
        },
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = inetCoder.encode(value, buf);
  const [decoded] = inetCoder.decode(buf.subarray(0, written));

  assert(!(decoded.payload instanceof Uint8Array));
  assert(decoded.payload.kind === "ipv4");
  assertEquals(decoded.payload.ipv4.sourceAddress, "192.0.2.1");
  assert(!(decoded.payload.ipv4.payload instanceof Uint8Array));
  assert(decoded.payload.ipv4.payload.kind === "udp");
  assertEquals(decoded.payload.ipv4.payload.udp.srcPort, 53);
  assertEquals(
    decoded.payload.ipv4.payload.udp.payload,
    new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
  );
});

Deno.test("inetCoder: round-trips ethernet → ipv4 → icmp", () => {
  const value: InetFrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0800,
    payload: {
      kind: "ipv4",
      ipv4: {
        versionIhl: { version: 4, ihl: 5 },
        typeOfService: 0,
        totalLength: 28,
        identification: 0,
        flagsFragmentOffset: {
          reserved: 0,
          dontFragment: 0,
          moreFragments: 0,
          fragmentOffset: 0,
        },
        timeToLive: 64,
        protocol: 1,
        headerChecksum: 0,
        sourceAddress: "10.0.0.1",
        destinationAddress: "10.0.0.2",
        options: new Uint8Array(0),
        payload: {
          kind: "icmp",
          icmp: {
            type: 8,
            code: 0,
            checksum: 0,
            restOfHeader: new Uint8Array([0, 1, 0, 1]),
            payload: new Uint8Array(0),
          },
        },
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = inetCoder.encode(value, buf);
  const [decoded] = inetCoder.decode(buf.subarray(0, written));

  assert(!(decoded.payload instanceof Uint8Array));
  assert(decoded.payload.kind === "ipv4");
  assert(!(decoded.payload.ipv4.payload instanceof Uint8Array));
  assert(decoded.payload.ipv4.payload.kind === "icmp");
  assertEquals(decoded.payload.ipv4.payload.icmp.type, 8);
});

Deno.test("inetCoder: round-trips ethernet → arp", () => {
  const value: InetFrameRefined = {
    dstMac: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0806,
    payload: {
      kind: "arp",
      arp: {
        htype: 1,
        ptype: 0x0800,
        hlen: 6,
        plen: 4,
        oper: ARP_OPCODE.REQUEST,
        sha: new Uint8Array([0, 0, 0, 0, 0, 2]),
        spa: 0xc0000201,
        tha: new Uint8Array([0, 0, 0, 0, 0, 0]),
        tpa: 0xc0000202,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = inetCoder.encode(value, buf);
  const [decoded] = inetCoder.decode(buf.subarray(0, written));

  assert(!(decoded.payload instanceof Uint8Array));
  assert(decoded.payload.kind === "arp");
  assertEquals(decoded.payload.arp.oper, ARP_OPCODE.REQUEST);
  assertEquals(decoded.payload.arp.spa, 0xc0000201);
});

Deno.test("inetCoder: unknown EtherType surfaces as a raw Uint8Array", () => {
  const value: InetFrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x88cc, // LLDP
    payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
  };

  const buf = new Uint8Array(32);
  const written = inetCoder.encode(value, buf);
  const [decoded] = inetCoder.decode(buf.subarray(0, written));

  assert(decoded.payload instanceof Uint8Array);
  assertEquals(decoded.payload, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
});

Deno.test("inetCoder: unknown IPv4 protocol surfaces as a raw Uint8Array", () => {
  const innerBytes = new Uint8Array([0xaa, 0xbb, 0xcc]);
  const value: InetFrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0800,
    payload: {
      kind: "ipv4",
      ipv4: {
        versionIhl: { version: 4, ihl: 5 },
        typeOfService: 0,
        totalLength: 23,
        identification: 0,
        flagsFragmentOffset: {
          reserved: 0,
          dontFragment: 0,
          moreFragments: 0,
          fragmentOffset: 0,
        },
        timeToLive: 64,
        protocol: 6, // TCP — no coder for it in the family yet.
        headerChecksum: 0,
        sourceAddress: "10.0.0.1",
        destinationAddress: "10.0.0.2",
        options: new Uint8Array(0),
        payload: innerBytes,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = inetCoder.encode(value, buf);
  const [decoded] = inetCoder.decode(buf.subarray(0, written));

  assert(!(decoded.payload instanceof Uint8Array));
  assert(decoded.payload.kind === "ipv4");
  assert(decoded.payload.ipv4.payload instanceof Uint8Array);
  assertEquals(decoded.payload.ipv4.payload, innerBytes);
});
