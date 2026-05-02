import { assert, assertEquals } from "@std/assert";
import { parseIpv4 } from "@hertzg/ip/ipv4";
import { ARP_OPCODE, ETHERTYPE_ARP } from "@binstruct/arp";
import { ETHERTYPE_IPV4 } from "@binstruct/ipv4";
import { IP_PROTOCOL_ICMP } from "@binstruct/icmp";
import { IP_PROTOCOL_TCP } from "@binstruct/tcp";
import { IP_PROTOCOL_UDP } from "@binstruct/udp";
import {
  type FrameRefined,
  inetFrame,
  internetChecksum,
} from "./mod.ts";

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

Deno.test("inetFrame: round-trips ethernet → ipv4 → udp", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
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
      protocol: IP_PROTOCOL_UDP,
      headerChecksum: 0,
      sourceAddress: parseIpv4("192.0.2.1"),
      destinationAddress: parseIpv4("192.0.2.2"),
      options: new Uint8Array(0),
      payload: {
        srcPort: 53,
        dstPort: 49152,
        length: 12,
        checksum: 0,
        payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  assertEquals(decoded.etherType, ETHERTYPE_IPV4);
  assert(!(decoded.payload instanceof Uint8Array));
  assert("protocol" in decoded.payload);
  assertEquals(decoded.payload.sourceAddress, parseIpv4("192.0.2.1"));
  assertEquals(decoded.payload.protocol, IP_PROTOCOL_UDP);
  assert(!(decoded.payload.payload instanceof Uint8Array));
  assert("srcPort" in decoded.payload.payload);
  assertEquals(decoded.payload.payload.srcPort, 53);
  assertEquals(
    decoded.payload.payload.payload,
    new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
  );
});

Deno.test("inetFrame: round-trips ethernet → ipv4 → tcp", () => {
  const coder = inetFrame();
  const tcpPayload = new Uint8Array([0x68, 0x69]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20 + 20 + tcpPayload.length,
      identification: 0,
      flagsFragmentOffset: {
        reserved: 0,
        dontFragment: 0,
        moreFragments: 0,
        fragmentOffset: 0,
      },
      timeToLive: 64,
      protocol: IP_PROTOCOL_TCP,
      headerChecksum: 0,
      sourceAddress: parseIpv4("192.0.2.1"),
      destinationAddress: parseIpv4("192.0.2.2"),
      options: new Uint8Array(0),
      payload: {
        sourcePort: 49152,
        destinationPort: 80,
        sequenceNumber: 0xdeadbeef,
        acknowledgmentNumber: 0,
        dataOffsetReserved: { dataOffset: 5, reserved: 0 },
        flags: {
          cwr: 0,
          ece: 0,
          urg: 0,
          ack: 0,
          psh: 0,
          rst: 0,
          syn: 1,
          fin: 0,
        },
        window: 65535,
        checksum: 0,
        urgentPointer: 0,
        options: new Uint8Array(0),
        payload: tcpPayload,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  assert(!(decoded.payload instanceof Uint8Array));
  assert("protocol" in decoded.payload);
  assertEquals(decoded.payload.protocol, IP_PROTOCOL_TCP);
  assert(!(decoded.payload.payload instanceof Uint8Array));
  assert("sequenceNumber" in decoded.payload.payload);
  assertEquals(decoded.payload.payload.sourcePort, 49152);
  assertEquals(decoded.payload.payload.destinationPort, 80);
  assertEquals(decoded.payload.payload.sequenceNumber, 0xdeadbeef);
  assertEquals(decoded.payload.payload.flags.syn, 1);
  assertEquals(decoded.payload.payload.payload, tcpPayload);

  // Round-trip back to bytes
  const buf2 = new Uint8Array(written);
  const written2 = coder.encode(decoded, buf2);
  assertEquals(written2, written);
  assertEquals(buf2, buf.subarray(0, written));
});

Deno.test("inetFrame: round-trips ethernet → ipv4 → icmp", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
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
      protocol: IP_PROTOCOL_ICMP,
      headerChecksum: 0,
      sourceAddress: parseIpv4("10.0.0.1"),
      destinationAddress: parseIpv4("10.0.0.2"),
      options: new Uint8Array(0),
      payload: {
        type: 8,
        code: 0,
        checksum: 0,
        // First 4 payload bytes are the Echo identifier/sequence.
        payload: new Uint8Array([0, 1, 0, 1]),
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  assertEquals(decoded.etherType, ETHERTYPE_IPV4);
  assert(!(decoded.payload instanceof Uint8Array));
  assert("protocol" in decoded.payload);
  assertEquals(decoded.payload.protocol, IP_PROTOCOL_ICMP);
  assert(!(decoded.payload.payload instanceof Uint8Array));
  assert("type" in decoded.payload.payload);
  assertEquals(decoded.payload.payload.type, 8);
});

Deno.test("inetFrame: round-trips ethernet → arp", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_ARP,
    payload: {
      hardwareType: 1,
      protocolType: 0x0800,
      hardwareAddressLength: 6,
      protocolAddressLength: 4,
      operation: ARP_OPCODE.REQUEST,
      senderHardwareAddress: new Uint8Array([0, 0, 0, 0, 0, 2]),
      senderProtocolAddress: 0xc0000201,
      targetHardwareAddress: new Uint8Array([0, 0, 0, 0, 0, 0]),
      targetProtocolAddress: 0xc0000202,
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  assertEquals(decoded.etherType, ETHERTYPE_ARP);
  assert(!(decoded.payload instanceof Uint8Array));
  assert("operation" in decoded.payload);
  assertEquals(decoded.payload.operation, ARP_OPCODE.REQUEST);
  assertEquals(decoded.payload.senderProtocolAddress, 0xc0000201);
});

Deno.test("inetFrame: unknown EtherType surfaces as a raw Uint8Array", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x88cc, // LLDP
    payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
  };

  const buf = new Uint8Array(32);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  assert(decoded.payload instanceof Uint8Array);
  assertEquals(decoded.payload, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
});

Deno.test("inetFrame: unknown IPv4 protocol surfaces as a raw Uint8Array", () => {
  const coder = inetFrame();
  const innerBytes = new Uint8Array([0xaa, 0xbb, 0xcc]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
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
      protocol: 50, // ESP — no coder for it in the family yet.
      headerChecksum: 0,
      sourceAddress: parseIpv4("10.0.0.1"),
      destinationAddress: parseIpv4("10.0.0.2"),
      options: new Uint8Array(0),
      payload: innerBytes,
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  assertEquals(decoded.etherType, ETHERTYPE_IPV4);
  assert(!(decoded.payload instanceof Uint8Array));
  assert("protocol" in decoded.payload);
  assert(decoded.payload.payload instanceof Uint8Array);
  assertEquals(decoded.payload.payload, innerBytes);
});
