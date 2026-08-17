import { assert, assertEquals } from "@std/assert";
import { parseAddressv4 } from "@hertzg/ip/addressv4";
import { ARP_OPCODE, ETHERTYPE_ARP } from "@binstruct/arp";
import { ETHERTYPE_IPV4 } from "@binstruct/ipv4";
import { ETHERTYPE_IPV6 } from "@binstruct/ipv6";
import { IP_PROTOCOL_ICMP } from "@binstruct/icmp";
import { ICMPV6_TYPE, IP_PROTOCOL_ICMPV6 } from "@binstruct/icmpv6";
import { IGMP_TYPE, IP_PROTOCOL_IGMP } from "@binstruct/igmp";
import { IP_PROTOCOL_ESP } from "@binstruct/esp";
import { IP_PROTOCOL_TCP } from "@binstruct/tcp";
import { IP_PROTOCOL_UDP, type UdpPacket } from "@binstruct/udp";
import { TPID_8021Q } from "@binstruct/vlan";
import {
  ETHERTYPE_PPPOE_DISCOVERY,
  ETHERTYPE_PPPOE_SESSION,
  PPPOE_CODE,
  type PppoeHeader,
} from "@binstruct/pppoe";
import {
  VXLAN_FLAG_VALID_VNI,
  VXLAN_HEADER_SIZE,
  VXLAN_PORT,
} from "@binstruct/vxlan";
import { NTP_MODE, NTP_PACKET_SIZE, NTP_PORT } from "@binstruct/ntp";
import { BFD_CONTROL_SIZE, BFD_PORT, BFD_STATE } from "@binstruct/bfd";
import { SLL_PACKET_TYPE } from "@binstruct/sll";
import {
  type FrameRefined,
  inetFrame,
  internetChecksum,
  type Ipv4EspPacket,
  type Ipv4Frame,
  type Ipv4IgmpPacket,
  type Ipv4TcpPacket,
  type Ipv4UdpPacket,
  type Ipv6EspPacket,
  type Ipv6Icmpv6Packet,
  type Ipv6Refined,
  type Ipv6TcpPacket,
  type Ipv6UdpPacket,
  type PppoeIpv4Frame,
  type PppoeIpv6Frame,
  type PppoeSessionPacket,
  type SllFrameRefined,
  sllInetFrame,
  type UdpBfdPacket,
  type UdpNtpPacket,
  type UdpRefined,
  type UdpVxlanPacket,
  type VlanIpv4Frame,
  type VlanQinQFrame,
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
      sourceAddress: parseAddressv4("192.0.2.1"),
      destinationAddress: parseAddressv4("192.0.2.2"),
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
  assertEquals(decoded.payload.sourceAddress, parseAddressv4("192.0.2.1"));
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
      sourceAddress: parseAddressv4("192.0.2.1"),
      destinationAddress: parseAddressv4("192.0.2.2"),
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
  assert("dataOffsetReserved" in decoded.payload.payload);
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
      sourceAddress: parseAddressv4("10.0.0.1"),
      destinationAddress: parseAddressv4("10.0.0.2"),
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
      protocol: 253, // Reserved for experimentation (RFC 3692) — no coder for it.
      headerChecksum: 0,
      sourceAddress: parseAddressv4("10.0.0.1"),
      destinationAddress: parseAddressv4("10.0.0.2"),
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

Deno.test("inetFrame: round-trips ethernet → vlan → ipv4 → udp", () => {
  const coder = inetFrame();
  const udpPayload = new Uint8Array([0xaa, 0xbb]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: TPID_8021Q,
    payload: {
      tci: { pcp: 0, dei: 0, vlanId: 100 },
      etherType: ETHERTYPE_IPV4,
      payload: {
        versionIhl: { version: 4, ihl: 5 },
        typeOfService: 0,
        totalLength: 20 + 8 + udpPayload.length,
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
        sourceAddress: parseAddressv4("10.0.0.1"),
        destinationAddress: parseAddressv4("10.0.0.2"),
        options: new Uint8Array(0),
        payload: {
          srcPort: 1111,
          dstPort: 2222,
          length: 8 + udpPayload.length,
          checksum: 0,
          payload: udpPayload,
        },
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const vlanFrame = decoded.payload as VlanIpv4Frame;
  assertEquals(vlanFrame.tci.vlanId, 100);
  const ip = vlanFrame.payload;
  assertEquals(ip.protocol, IP_PROTOCOL_UDP);
  const udp = ip.payload as UdpPacket;
  assertEquals(udp.srcPort, 1111);
  assertEquals(udp.payload, udpPayload);
});

Deno.test("inetFrame: round-trips ethernet → vlan → vlan → ipv4 (QinQ)", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: TPID_8021Q,
    payload: {
      tci: { pcp: 0, dei: 0, vlanId: 10 }, // outer (service) tag
      etherType: TPID_8021Q,
      payload: {
        tci: { pcp: 0, dei: 0, vlanId: 20 }, // inner (customer) tag
        etherType: ETHERTYPE_IPV4,
        payload: {
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
          timeToLive: 64,
          protocol: 253, // reserved for experimentation — no coder for it
          headerChecksum: 0,
          sourceAddress: parseAddressv4("10.0.0.1"),
          destinationAddress: parseAddressv4("10.0.0.2"),
          options: new Uint8Array(0),
          payload: new Uint8Array(0),
        },
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const outer = decoded.payload as VlanQinQFrame;
  assertEquals(outer.tci.vlanId, 10);
  const inner = outer.payload as VlanIpv4Frame;
  assertEquals(inner.tci.vlanId, 20);
  assertEquals(inner.payload.protocol, 253);
});

Deno.test("inetFrame: a third stacked VLAN tag decodes raw (QinQ depth is bounded)", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: TPID_8021Q,
    payload: {
      tci: { pcp: 0, dei: 0, vlanId: 10 },
      etherType: TPID_8021Q,
      payload: {
        tci: { pcp: 0, dei: 0, vlanId: 20 },
        // A third 0x8100 EtherType — depth is already exhausted at this
        // level, so this tag's payload stays raw bytes rather than being
        // parsed as yet another VlanTag.
        etherType: TPID_8021Q,
        payload: new Uint8Array([0x11, 0x22, 0x33, 0x44]),
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  const outer = decoded.payload as VlanQinQFrame;
  const middle = outer.payload;
  // The third tag is never unwrapped — it stays a raw VlanTag whose
  // payload is the undecoded bytes, proving the QinQ depth bound.
  assert(middle.payload instanceof Uint8Array);
  assertEquals(middle.payload, new Uint8Array([0x11, 0x22, 0x33, 0x44]));
});

Deno.test("inetFrame: round-trips ethernet → pppoe-session → ppp(ipv4) → tcp", () => {
  const coder = inetFrame();
  const tcpPayload = new Uint8Array([0x68, 0x69]);
  const ipv4TotalLength = 20 + 20 + tcpPayload.length;
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_PPPOE_SESSION,
    payload: {
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.SESSION_DATA,
      sessionId: 0x1234,
      // The PPP protocol ID (2 bytes) is inside PPPoE's payload, so it
      // counts toward `length` in addition to the IPv4 datagram.
      length: 2 + ipv4TotalLength,
      payload: {
        pppProtocol: 0x0021,
        payload: {
          versionIhl: { version: 4, ihl: 5 },
          typeOfService: 0,
          totalLength: ipv4TotalLength,
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
          sourceAddress: parseAddressv4("192.0.2.1"),
          destinationAddress: parseAddressv4("192.0.2.2"),
          options: new Uint8Array(0),
          payload: {
            sourcePort: 49152,
            destinationPort: 80,
            sequenceNumber: 1,
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
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const session = decoded.payload as PppoeSessionPacket;
  assertEquals(session.sessionId, 0x1234);
  const ppp = session.payload as PppoeIpv4Frame;
  assertEquals(ppp.pppProtocol, 0x0021);
  const ip = ppp.payload as Ipv4TcpPacket;
  assertEquals(ip.payload.sourcePort, 49152);
  assertEquals(ip.payload.payload, tcpPayload);
});

Deno.test("inetFrame: round-trips ethernet → pppoe-session → ppp(ipv6) → tcp", () => {
  const coder = inetFrame();
  const tcpPayload = new Uint8Array([0x68, 0x69]);
  const tcpTotalLength = 20 + tcpPayload.length;
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_PPPOE_SESSION,
    payload: {
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.SESSION_DATA,
      sessionId: 0x5678,
      length: 2 + 40 + tcpTotalLength,
      payload: {
        pppProtocol: 0x0057,
        payload: {
          versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
          payloadLength: tcpTotalLength,
          nextHeader: IP_PROTOCOL_TCP,
          hopLimit: 64,
          sourceAddress: new Uint8Array(16).fill(0x11),
          destinationAddress: new Uint8Array(16).fill(0x22),
          payload: {
            sourcePort: 49152,
            destinationPort: 80,
            sequenceNumber: 1,
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
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const session = decoded.payload as PppoeSessionPacket;
  const ppp = session.payload as PppoeIpv6Frame;
  assertEquals(ppp.pppProtocol, 0x0057);
  const ip = ppp.payload as Ipv6TcpPacket;
  assertEquals(ip.nextHeader, IP_PROTOCOL_TCP);
  assertEquals(ip.payload.sourcePort, 49152);
  assertEquals(ip.payload.payload, tcpPayload);
});

Deno.test("inetFrame: round-trips ethernet → pppoe-discovery (PADI)", () => {
  const coder = inetFrame();
  const tags = new Uint8Array([0x01, 0x01, 0x00, 0x00]); // Service-Name tag, empty
  const value: FrameRefined = {
    dstMac: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_PPPOE_DISCOVERY,
    payload: {
      versionType: { version: 1, type: 1 },
      code: PPPOE_CODE.PADI,
      sessionId: 0,
      length: tags.length,
      payload: tags,
    },
  };

  const buf = new Uint8Array(32);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  assertEquals(decoded.etherType, ETHERTYPE_PPPOE_DISCOVERY);
  const discovery = decoded.payload as PppoeHeader;
  assertEquals(discovery.code, PPPOE_CODE.PADI);
  assertEquals(discovery.payload, tags);
});

Deno.test("inetFrame: round-trips ethernet → ipv6 → udp → ntp", () => {
  const coder = inetFrame();
  const ntpPacket = {
    leapVersionMode: { leapIndicator: 0, version: 4, mode: NTP_MODE.CLIENT },
    stratum: 0,
    poll: 4,
    precision: -20,
    rootDelay: 0,
    rootDispersion: 0,
    referenceId: 0,
    referenceTimestamp: 0n,
    originTimestamp: 0n,
    receiveTimestamp: 0n,
    transmitTimestamp: 0xe4c5c46700000000n,
  };
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV6,
    payload: {
      versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
      payloadLength: 8 + NTP_PACKET_SIZE,
      nextHeader: IP_PROTOCOL_UDP,
      hopLimit: 64,
      sourceAddress: new Uint8Array(16).fill(0x11),
      destinationAddress: new Uint8Array(16).fill(0x22),
      payload: {
        srcPort: 49152,
        dstPort: NTP_PORT,
        length: 8 + NTP_PACKET_SIZE,
        checksum: 0,
        payload: ntpPacket,
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const ip = decoded.payload as Ipv6UdpPacket;
  const udp = ip.payload as UdpNtpPacket;
  assertEquals(udp.dstPort, NTP_PORT);
  assertEquals(udp.payload.leapVersionMode.mode, NTP_MODE.CLIENT);
  assertEquals(udp.payload.transmitTimestamp, 0xe4c5c46700000000n);
});

Deno.test("inetFrame: round-trips ethernet → ipv6 → icmpv6", () => {
  const coder = inetFrame();
  const body = new Uint8Array([0xbe, 0xef, 0x00, 0x2a]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV6,
    payload: {
      versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
      payloadLength: 4 + body.length,
      nextHeader: IP_PROTOCOL_ICMPV6,
      hopLimit: 64,
      sourceAddress: new Uint8Array(16).fill(0x11),
      destinationAddress: new Uint8Array(16).fill(0x22),
      payload: {
        type: ICMPV6_TYPE.ECHO_REQUEST,
        code: 0,
        checksum: 0,
        body,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const ip = decoded.payload as Ipv6Icmpv6Packet;
  assertEquals(ip.payload.type, ICMPV6_TYPE.ECHO_REQUEST);
  assertEquals(ip.payload.body, body);
});

Deno.test("inetFrame: round-trips ethernet → ipv6 → esp", () => {
  const coder = inetFrame();
  const payloadData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV6,
    payload: {
      versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
      payloadLength: 8 + payloadData.length,
      nextHeader: IP_PROTOCOL_ESP,
      hopLimit: 64,
      sourceAddress: new Uint8Array(16).fill(0x11),
      destinationAddress: new Uint8Array(16).fill(0x22),
      payload: {
        spi: 0x12345678,
        sequenceNumber: 1,
        payloadData,
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const ip = decoded.payload as Ipv6EspPacket;
  assertEquals(ip.payload.spi, 0x12345678);
  assertEquals(ip.payload.payloadData, payloadData);
});

Deno.test("inetFrame: round-trips ethernet → ipv4 → igmp", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20 + 8,
      identification: 0,
      flagsFragmentOffset: {
        reserved: 0,
        dontFragment: 0,
        moreFragments: 0,
        fragmentOffset: 0,
      },
      timeToLive: 1,
      protocol: IP_PROTOCOL_IGMP,
      headerChecksum: 0,
      sourceAddress: parseAddressv4("10.0.0.5"),
      destinationAddress: parseAddressv4("224.0.0.1"),
      options: new Uint8Array(0),
      payload: {
        type: IGMP_TYPE.V2_MEMBERSHIP_REPORT,
        maxResponseTime: 0,
        checksum: 0,
        groupAddress: 0xe0000005,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const ip = decoded.payload as Ipv4IgmpPacket;
  assertEquals(ip.payload.type, IGMP_TYPE.V2_MEMBERSHIP_REPORT);
  assertEquals(ip.payload.groupAddress, 0xe0000005);
});

Deno.test("inetFrame: round-trips ethernet → ipv4 → esp", () => {
  const coder = inetFrame();
  const payloadData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20 + 8 + payloadData.length,
      identification: 0,
      flagsFragmentOffset: {
        reserved: 0,
        dontFragment: 0,
        moreFragments: 0,
        fragmentOffset: 0,
      },
      timeToLive: 64,
      protocol: IP_PROTOCOL_ESP,
      headerChecksum: 0,
      sourceAddress: parseAddressv4("10.0.0.1"),
      destinationAddress: parseAddressv4("10.0.0.2"),
      options: new Uint8Array(0),
      payload: {
        spi: 0x12345678,
        sequenceNumber: 1,
        payloadData,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const ip = decoded.payload as Ipv4EspPacket;
  assertEquals(ip.payload.spi, 0x12345678);
  assertEquals(ip.payload.payloadData, payloadData);
});

Deno.test("inetFrame: round-trips a full VXLAN tunnel (udp:4789 → vxlan → ethernet → ipv4 → udp)", () => {
  const coder = inetFrame();

  const innerUdpPayload = new Uint8Array([0xca, 0xfe]);
  const innerUdp = {
    srcPort: 5000,
    dstPort: 6000,
    length: 8 + innerUdpPayload.length,
    checksum: 0,
    payload: innerUdpPayload,
  };
  const innerIpv4TotalLength = 20 + 8 + innerUdpPayload.length;
  const innerIpv4 = {
    versionIhl: { version: 4, ihl: 5 },
    typeOfService: 0,
    totalLength: innerIpv4TotalLength,
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
    sourceAddress: parseAddressv4("192.168.1.1"),
    destinationAddress: parseAddressv4("192.168.1.2"),
    options: new Uint8Array(0),
    payload: innerUdp,
  };
  const innerFrame: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 0xaa]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 0xbb]),
    etherType: ETHERTYPE_IPV4,
    payload: innerIpv4,
  };
  const innerFrameSize = 14 + innerIpv4TotalLength;

  const vxlan = {
    flagsReserved1: { flags: VXLAN_FLAG_VALID_VNI, reserved1: 0 },
    vniReserved2: { vni: 42, reserved2: 0 },
    innerFrame,
  };
  const vxlanSize = VXLAN_HEADER_SIZE + innerFrameSize;

  const outerUdp = {
    srcPort: 33333,
    dstPort: VXLAN_PORT,
    length: 8 + vxlanSize,
    checksum: 0,
    payload: vxlan,
  };
  const outerIpv4TotalLength = 20 + 8 + vxlanSize;
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: outerIpv4TotalLength,
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
      sourceAddress: parseAddressv4("10.1.1.1"),
      destinationAddress: parseAddressv4("10.1.1.2"),
      options: new Uint8Array(0),
      payload: outerUdp,
    },
  };

  const buf = new Uint8Array(256);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const outerIp = decoded.payload as Ipv4UdpPacket;
  const outerUdpDecoded = outerIp.payload as UdpVxlanPacket;
  assertEquals(outerUdpDecoded.dstPort, VXLAN_PORT);
  const vxlanDecoded = outerUdpDecoded.payload;
  assertEquals(vxlanDecoded.vniReserved2.vni, 42);
  const innerFrameDecoded = vxlanDecoded.innerFrame as Ipv4Frame;
  assertEquals(innerFrameDecoded.etherType, ETHERTYPE_IPV4);
  const innerIpDecoded = innerFrameDecoded.payload as Ipv4UdpPacket;
  const innerUdpDecoded = innerIpDecoded.payload as UdpPacket;
  assertEquals(innerUdpDecoded.srcPort, 5000);
  assertEquals(innerUdpDecoded.payload, innerUdpPayload);
});

Deno.test("inetFrame: decodes a hand-built VXLAN tunnel from known wire bytes", () => {
  // Outer Ethernet(14) + IPv4(20) + UDP(8) + VXLAN(8) + inner Ethernet(14) +
  // inner IPv4(20, no payload) = 84 bytes total.
  // deno-fmt-ignore
  const wire = new Uint8Array([
    // Outer Ethernet
    0x00, 0x00, 0x00, 0x00, 0x00, 0x01, // dstMac
    0x00, 0x00, 0x00, 0x00, 0x00, 0x02, // srcMac
    0x08, 0x00,                         // etherType: IPv4
    // Outer IPv4
    0x45, 0x00,             // version=4, ihl=5, tos=0
    0x00, 0x46,             // totalLength = 70
    0x00, 0x00,             // identification
    0x00, 0x00,             // flags/fragmentOffset
    0x40,                   // ttl = 64
    0x11,                   // protocol = UDP
    0x00, 0x00,             // headerChecksum
    0x0a, 0x00, 0x00, 0x01, // srcIP 10.0.0.1
    0x0a, 0x00, 0x00, 0x02, // dstIP 10.0.0.2
    // Outer UDP
    0x82, 0x3e,             // srcPort = 33342
    0x12, 0xb5,             // dstPort = 4789 (VXLAN)
    0x00, 0x32,             // length = 50
    0x00, 0x00,             // checksum
    // VXLAN header
    0x08, 0x00, 0x00, 0x00, // flags = VALID_VNI, reserved1 = 0
    0x00, 0x00, 0x2a, 0x00, // vni = 42, reserved2 = 0
    // Inner Ethernet
    0x00, 0x00, 0x00, 0x00, 0x00, 0xaa, // dstMac
    0x00, 0x00, 0x00, 0x00, 0x00, 0xbb, // srcMac
    0x08, 0x00,                         // etherType: IPv4
    // Inner IPv4 (no payload)
    0x45, 0x00,             // version=4, ihl=5, tos=0
    0x00, 0x14,             // totalLength = 20
    0x00, 0x00,             // identification
    0x00, 0x00,             // flags/fragmentOffset
    0x40,                   // ttl = 64
    0xfd,                   // protocol = 253 (reserved for experimentation)
    0x00, 0x00,             // headerChecksum
    0x0a, 0x01, 0x01, 0x01, // srcIP 10.1.1.1
    0x0a, 0x01, 0x01, 0x02, // dstIP 10.1.1.2
  ]);

  const coder = inetFrame();
  const [decoded, read] = coder.decode(wire);

  assertEquals(read, wire.length);
  const outerIp = decoded.payload as Ipv4UdpPacket;
  const outerUdp = outerIp.payload as UdpVxlanPacket;
  assertEquals(outerUdp.dstPort, VXLAN_PORT);
  const vxlan = outerUdp.payload;
  assertEquals(vxlan.vniReserved2.vni, 42);
  const innerFrame = vxlan.innerFrame as Ipv4Frame;
  assertEquals(innerFrame.etherType, ETHERTYPE_IPV4);
  assertEquals(innerFrame.payload.protocol, 253);

  // Re-encoding the decoded value reproduces the exact same bytes.
  const buf = new Uint8Array(wire.length);
  const written = coder.encode(decoded, buf);
  assertEquals(written, wire.length);
  assertEquals(buf, wire);
});

Deno.test("inetFrame: two independent decodes through the same coder instance both resolve nested VXLAN tunnels", () => {
  // deno-fmt-ignore
  const wire = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
    0x08, 0x00,
    0x45, 0x00,
    0x00, 0x46,
    0x00, 0x00,
    0x00, 0x00,
    0x40,
    0x11,
    0x00, 0x00,
    0x0a, 0x00, 0x00, 0x01,
    0x0a, 0x00, 0x00, 0x02,
    0x82, 0x3e,
    0x12, 0xb5,
    0x00, 0x32,
    0x00, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x2a, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0xaa,
    0x00, 0x00, 0x00, 0x00, 0x00, 0xbb,
    0x08, 0x00,
    0x45, 0x00,
    0x00, 0x14,
    0x00, 0x00,
    0x00, 0x00,
    0x40,
    0xfd,
    0x00, 0x00,
    0x0a, 0x01, 0x01, 0x01,
    0x0a, 0x01, 0x01, 0x02,
  ]);

  const coder = inetFrame();

  const [firstDecoded] = coder.decode(wire);
  const firstOuterUdp = (firstDecoded.payload as Ipv4UdpPacket)
    .payload as UdpVxlanPacket;
  assertEquals(firstOuterUdp.payload.vniReserved2.vni, 42);

  const [secondDecoded] = coder.decode(wire);
  const secondOuterUdp = (secondDecoded.payload as Ipv4UdpPacket)
    .payload as UdpVxlanPacket;
  assertEquals(secondOuterUdp.payload.vniReserved2.vni, 42);

  assertEquals(firstDecoded, secondDecoded);
});

Deno.test("inetFrame: UDP port ambiguity — destination port wins over source port", () => {
  const coder = inetFrame();
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20 + 8 + BFD_CONTROL_SIZE,
      identification: 0,
      flagsFragmentOffset: {
        reserved: 0,
        dontFragment: 0,
        moreFragments: 0,
        fragmentOffset: 0,
      },
      timeToLive: 255,
      protocol: IP_PROTOCOL_UDP,
      headerChecksum: 0,
      sourceAddress: parseAddressv4("10.0.0.1"),
      destinationAddress: parseAddressv4("10.0.0.2"),
      options: new Uint8Array(0),
      payload: {
        // srcPort matches NTP, dstPort matches BFD — dstPort must win.
        srcPort: NTP_PORT,
        dstPort: BFD_PORT,
        length: 8 + BFD_CONTROL_SIZE,
        checksum: 0,
        payload: {
          versionDiagnostic: { version: 1, diagnostic: 0 },
          flags: {
            state: BFD_STATE.UP,
            poll: 0,
            final: 0,
            controlPlaneIndependent: 0,
            authenticationPresent: 0,
            demand: 0,
            multipoint: 0,
          },
          detectMultiplier: 3,
          length: BFD_CONTROL_SIZE,
          myDiscriminator: 0x11111111,
          yourDiscriminator: 0x22222222,
          desiredMinTxInterval: 1_000_000,
          requiredMinRxInterval: 1_000_000,
          requiredMinEchoRxInterval: 0,
        },
      },
    },
  };

  const buf = new Uint8Array(96);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  const ip = decoded.payload as Ipv4UdpPacket;
  const udp = ip.payload as UdpBfdPacket;
  assertEquals(udp.payload.flags.state, BFD_STATE.UP);
});

Deno.test("inetFrame: unknown UDP port stays a plain UdpPacket", () => {
  const coder = inetFrame();
  const payload = new Uint8Array([0x01, 0x02, 0x03]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20 + 8 + payload.length,
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
      sourceAddress: parseAddressv4("10.0.0.1"),
      destinationAddress: parseAddressv4("10.0.0.2"),
      options: new Uint8Array(0),
      payload: {
        srcPort: 40000,
        dstPort: 40001,
        length: 8 + payload.length,
        checksum: 0,
        payload,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  const ip = decoded.payload as Ipv4UdpPacket;
  const udp = ip.payload as UdpRefined;
  assert(udp.payload instanceof Uint8Array);
  assertEquals(udp.payload, payload);
});

Deno.test("inetFrame: unknown IPv6 nextHeader stays a plain Ipv6Packet", () => {
  const coder = inetFrame();
  const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  const value: FrameRefined = {
    dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
    srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
    etherType: ETHERTYPE_IPV6,
    payload: {
      versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
      payloadLength: payload.length,
      nextHeader: 200, // unassigned — no coder for it
      hopLimit: 64,
      sourceAddress: new Uint8Array(16).fill(0x11),
      destinationAddress: new Uint8Array(16).fill(0x22),
      payload,
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded] = coder.decode(buf.subarray(0, written));

  const ip = decoded.payload as Ipv6Refined;
  assert(ip.payload instanceof Uint8Array);
  assertEquals(ip.payload, payload);
});

Deno.test("sllInetFrame: round-trips sll → ipv4 → udp", () => {
  const coder = sllInetFrame();
  const udpPayload = new Uint8Array([0x01, 0x02]);
  const value: SllFrameRefined = {
    packetType: SLL_PACKET_TYPE.HOST,
    arphrdType: 1,
    linkLayerAddressLength: 6,
    linkLayerAddress: new Uint8Array([
      0x00,
      0x11,
      0x22,
      0x33,
      0x44,
      0x55,
      0x00,
      0x00,
    ]),
    protocol: ETHERTYPE_IPV4,
    payload: {
      versionIhl: { version: 4, ihl: 5 },
      typeOfService: 0,
      totalLength: 20 + 8 + udpPayload.length,
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
      sourceAddress: parseAddressv4("10.0.0.1"),
      destinationAddress: parseAddressv4("10.0.0.2"),
      options: new Uint8Array(0),
      payload: {
        srcPort: 1234,
        dstPort: 53,
        length: 8 + udpPayload.length,
        checksum: 0,
        payload: udpPayload,
      },
    },
  };

  const buf = new Uint8Array(64);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  assertEquals(decoded.protocol, ETHERTYPE_IPV4);
  const ip = decoded.payload as Ipv4UdpPacket;
  const udp = ip.payload as UdpPacket;
  assertEquals(udp.payload, udpPayload);
});

Deno.test("sllInetFrame: round-trips sll → arp", () => {
  const coder = sllInetFrame();
  const value: SllFrameRefined = {
    packetType: SLL_PACKET_TYPE.HOST,
    arphrdType: 1,
    linkLayerAddressLength: 6,
    linkLayerAddress: new Uint8Array([
      0x00,
      0x11,
      0x22,
      0x33,
      0x44,
      0x55,
      0x00,
      0x00,
    ]),
    protocol: ETHERTYPE_ARP,
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
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  assertEquals(decoded.protocol, ETHERTYPE_ARP);
  assert(!(decoded.payload instanceof Uint8Array));
  assert("operation" in decoded.payload);
  assertEquals(decoded.payload.operation, ARP_OPCODE.REQUEST);
});

Deno.test("sllInetFrame: round-trips sll → vlan → ipv4 → udp", () => {
  const coder = sllInetFrame();
  const udpPayload = new Uint8Array([0xaa, 0xbb]);
  const value: SllFrameRefined = {
    packetType: SLL_PACKET_TYPE.HOST,
    arphrdType: 1,
    linkLayerAddressLength: 6,
    linkLayerAddress: new Uint8Array([
      0x00,
      0x11,
      0x22,
      0x33,
      0x44,
      0x55,
      0x00,
      0x00,
    ]),
    protocol: TPID_8021Q,
    payload: {
      tci: { pcp: 0, dei: 0, vlanId: 100 },
      etherType: ETHERTYPE_IPV4,
      payload: {
        versionIhl: { version: 4, ihl: 5 },
        typeOfService: 0,
        totalLength: 20 + 8 + udpPayload.length,
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
        sourceAddress: parseAddressv4("10.0.0.1"),
        destinationAddress: parseAddressv4("10.0.0.2"),
        options: new Uint8Array(0),
        payload: {
          srcPort: 1111,
          dstPort: 2222,
          length: 8 + udpPayload.length,
          checksum: 0,
          payload: udpPayload,
        },
      },
    },
  };

  const buf = new Uint8Array(128);
  const written = coder.encode(value, buf);
  const [decoded, read] = coder.decode(buf.subarray(0, written));

  assertEquals(read, written);
  assertEquals(decoded.protocol, TPID_8021Q);
  const vlan = decoded.payload as VlanIpv4Frame;
  assertEquals(vlan.tci.vlanId, 100);
  const ip = vlan.payload;
  assertEquals(ip.protocol, IP_PROTOCOL_UDP);
  const udp = ip.payload as UdpPacket;
  assertEquals(udp.payload, udpPayload);
});
