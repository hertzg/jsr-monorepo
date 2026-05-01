import { assert, assertEquals } from "@std/assert";
import { ethernet2Frame } from "@binstruct/ethernet";
import { ipv4Header } from "@binstruct/ipv4";
import { udpDatagram } from "@binstruct/udp";
import { icmpHeader } from "@binstruct/icmp";
import { arpEthernetIpv4, ARP_OPCODE } from "@binstruct/arp";
import { decodeFrame, internetChecksum } from "./mod.ts";

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

Deno.test("internetChecksum: empty buffer is the all-ones complement of zero", () => {
  assertEquals(internetChecksum(new Uint8Array(0)), 0xffff);
});

Deno.test("internetChecksum: carry folding wraps multiple times", () => {
  const data = new Uint8Array(0x10000).fill(0xff);
  assertEquals(internetChecksum(data), 0x0000);
});

function buildIpv4UdpFrame(udpPayload: Uint8Array): Uint8Array {
  const datagram = new Uint8Array(8 + udpPayload.length);
  udpDatagram().encode({
    srcPort: 53,
    dstPort: 49152,
    length: 8 + udpPayload.length,
    checksum: 0,
    payload: udpPayload,
  }, datagram);

  const ip = new Uint8Array(20 + datagram.length);
  ipv4Header().encode({
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: 20 + datagram.length,
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
  }, ip);
  ip.set(datagram, 20);

  const frame = new Uint8Array(14 + ip.length);
  ethernet2Frame().encode({
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0800,
    payload: ip,
  }, frame);
  return frame;
}

Deno.test("decodeFrame: walks ethernet → ipv4 → udp", () => {
  const frame = buildIpv4UdpFrame(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  const parsed = decodeFrame(frame);

  assert(parsed.l3.kind === "ipv4");
  assertEquals(parsed.l3.header.sourceAddress, "192.0.2.1");
  assertEquals(parsed.l3.header.destinationAddress, "192.0.2.2");
  assertEquals(parsed.l3.header.protocol, 17);

  assert(parsed.l3.l4.kind === "udp");
  assertEquals(parsed.l3.l4.datagram.srcPort, 53);
  assertEquals(parsed.l3.l4.datagram.dstPort, 49152);
  assertEquals(
    parsed.l3.l4.datagram.payload,
    new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
  );
});

Deno.test("decodeFrame: walks ethernet → ipv4 → icmp", () => {
  const icmp = new Uint8Array(8);
  icmpHeader().encode({
    type: 8,
    code: 0,
    checksum: 0,
    restOfHeader: new Uint8Array([0, 1, 0, 1]),
    payload: new Uint8Array(0),
  }, icmp);

  const ip = new Uint8Array(20 + 8);
  ipv4Header().encode({
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
  }, ip);
  ip.set(icmp, 20);

  const frame = new Uint8Array(14 + ip.length);
  ethernet2Frame().encode({
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0800,
    payload: ip,
  }, frame);

  const parsed = decodeFrame(frame);
  assert(parsed.l3.kind === "ipv4");
  assert(parsed.l3.l4.kind === "icmp");
  assertEquals(parsed.l3.l4.packet.type, 8);
  assertEquals(parsed.l3.l4.packet.code, 0);
});

Deno.test("decodeFrame: walks ethernet → arp", () => {
  const arp = new Uint8Array(28);
  arpEthernetIpv4().encode({
    htype: 1,
    ptype: 0x0800,
    hlen: 6,
    plen: 4,
    oper: ARP_OPCODE.REQUEST,
    sha: new Uint8Array([0, 0, 0, 0, 0, 2]),
    spa: 0xc0000201, // 192.0.2.1
    tha: new Uint8Array([0, 0, 0, 0, 0, 0]),
    tpa: 0xc0000202, // 192.0.2.2
  }, arp);

  const frame = new Uint8Array(14 + 28);
  ethernet2Frame().encode({
    dstMac: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0806,
    payload: arp,
  }, frame);

  const parsed = decodeFrame(frame);
  assert(parsed.l3.kind === "arp");
  assertEquals(parsed.l3.packet.oper, ARP_OPCODE.REQUEST);
  assertEquals(parsed.l3.packet.spa, 0xc0000201);
});

Deno.test("decodeFrame: unknown EtherType surfaces as unsupported", () => {
  const frame = new Uint8Array(14 + 4);
  ethernet2Frame().encode({
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x88cc,
    payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
  }, frame);

  const parsed = decodeFrame(frame);
  assert(parsed.l3.kind === "unsupported");
  assertEquals(parsed.l3.etherType, 0x88cc);
  assertEquals(parsed.l3.payload, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
});

Deno.test("decodeFrame: unknown IPv4 protocol surfaces as unsupported", () => {
  const inner = new Uint8Array([0xaa, 0xbb, 0xcc]);
  const ip = new Uint8Array(20 + inner.length);
  ipv4Header().encode({
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: 20 + inner.length,
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
  }, ip);
  ip.set(inner, 20);

  const frame = new Uint8Array(14 + ip.length);
  ethernet2Frame().encode({
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: 0x0800,
    payload: ip,
  }, frame);

  const parsed = decodeFrame(frame);
  assert(parsed.l3.kind === "ipv4");
  assert(parsed.l3.l4.kind === "unsupported");
  assertEquals(parsed.l3.l4.protocol, 6);
  assertEquals(parsed.l3.l4.payload, inner);
});
