import { assertEquals } from "@std/assert";
import { refine } from "@hertzg/binstruct";
import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
import { parseMac, stringifyMac } from "@hertzg/mac";
import {
  ARP_ETHERNET_IPV4_SIZE,
  ARP_HARDWARE_TYPE,
  ARP_HW_LEN_ETHERNET,
  ARP_OPCODE,
  ARP_PROTO_LEN_IPV4,
  ARP_PROTOCOL_TYPE,
  arpEthernetIpv4,
} from "./mod.ts";
import type { ArpEthernetIpv4Packet } from "./mod.ts";

// deno-fmt-ignore
const REQUEST_WIRE = new Uint8Array([
  0x00, 0x01,                         // htype: Ethernet
  0x08, 0x00,                         // ptype: IPv4
  0x06,                               // hlen
  0x04,                               // plen
  0x00, 0x01,                         // oper: request
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, // sha
  0xc0, 0xa8, 0x01, 0x01,             // spa: 192.168.1.1
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // tha (unknown)
  0xc0, 0xa8, 0x01, 0x02,             // tpa: 192.168.1.2
]);

// deno-fmt-ignore
const REPLY_WIRE = new Uint8Array([
  0x00, 0x01,                         // htype
  0x08, 0x00,                         // ptype
  0x06,                               // hlen
  0x04,                               // plen
  0x00, 0x02,                         // oper: reply
  0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, // sha
  0xc0, 0xa8, 0x01, 0x02,             // spa: 192.168.1.2
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, // tha
  0xc0, 0xa8, 0x01, 0x01,             // tpa: 192.168.1.1
]);

Deno.test("arpEthernetIpv4 — decode known request bytes", () => {
  const [packet, bytesRead] = arpEthernetIpv4().decode(REQUEST_WIRE);

  assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(packet.htype, ARP_HARDWARE_TYPE.ETHERNET);
  assertEquals(packet.ptype, ARP_PROTOCOL_TYPE.IPV4);
  assertEquals(packet.hlen, ARP_HW_LEN_ETHERNET);
  assertEquals(packet.plen, ARP_PROTO_LEN_IPV4);
  assertEquals(packet.oper, ARP_OPCODE.REQUEST);
  assertEquals(stringifyMac(packet.sha), "00:11:22:33:44:55");
  assertEquals(stringifyMac(packet.tha), "00:00:00:00:00:00");
  assertEquals(stringifyIpv4(packet.spa), "192.168.1.1");
  assertEquals(stringifyIpv4(packet.tpa), "192.168.1.2");
});

Deno.test("arpEthernetIpv4 — decode known reply bytes", () => {
  const [packet, bytesRead] = arpEthernetIpv4().decode(REPLY_WIRE);

  assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(packet.oper, ARP_OPCODE.REPLY);
  assertEquals(stringifyMac(packet.sha), "aa:bb:cc:dd:ee:ff");
  assertEquals(stringifyMac(packet.tha), "00:11:22:33:44:55");
  assertEquals(stringifyIpv4(packet.spa), "192.168.1.2");
  assertEquals(stringifyIpv4(packet.tpa), "192.168.1.1");
});

Deno.test("arpEthernetIpv4 — encode produces expected wire bytes", () => {
  const coder = arpEthernetIpv4();
  const request: ArpEthernetIpv4Packet = {
    htype: ARP_HARDWARE_TYPE.ETHERNET,
    ptype: ARP_PROTOCOL_TYPE.IPV4,
    hlen: ARP_HW_LEN_ETHERNET,
    plen: ARP_PROTO_LEN_IPV4,
    oper: ARP_OPCODE.REQUEST,
    sha: parseMac("00:11:22:33:44:55"),
    spa: parseIpv4("192.168.1.1"),
    tha: new Uint8Array(ARP_HW_LEN_ETHERNET),
    tpa: parseIpv4("192.168.1.2"),
  };

  const buffer = new Uint8Array(ARP_ETHERNET_IPV4_SIZE);
  const bytesWritten = coder.encode(request, buffer);

  assertEquals(bytesWritten, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(buffer, REQUEST_WIRE);
});

Deno.test("arpEthernetIpv4 — round-trip request and reply", () => {
  const coder = arpEthernetIpv4();
  const cases: ArpEthernetIpv4Packet[] = [
    {
      htype: ARP_HARDWARE_TYPE.ETHERNET,
      ptype: ARP_PROTOCOL_TYPE.IPV4,
      hlen: ARP_HW_LEN_ETHERNET,
      plen: ARP_PROTO_LEN_IPV4,
      oper: ARP_OPCODE.REQUEST,
      sha: parseMac("00:11:22:33:44:55"),
      spa: parseIpv4("10.0.0.1"),
      tha: new Uint8Array(ARP_HW_LEN_ETHERNET),
      tpa: parseIpv4("10.0.0.42"),
    },
    {
      htype: ARP_HARDWARE_TYPE.ETHERNET,
      ptype: ARP_PROTOCOL_TYPE.IPV4,
      hlen: ARP_HW_LEN_ETHERNET,
      plen: ARP_PROTO_LEN_IPV4,
      oper: ARP_OPCODE.REPLY,
      sha: parseMac("aa:bb:cc:dd:ee:ff"),
      spa: parseIpv4("10.0.0.42"),
      tha: parseMac("00:11:22:33:44:55"),
      tpa: parseIpv4("10.0.0.1"),
    },
  ];

  for (const original of cases) {
    const buffer = new Uint8Array(ARP_ETHERNET_IPV4_SIZE);
    const bytesWritten = coder.encode(original, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(bytesWritten, ARP_ETHERNET_IPV4_SIZE);
    assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
    assertEquals(decoded, original);
  }
});

Deno.test("arpEthernetIpv4 — composes with refine for human-readable form", () => {
  type RefinedArp =
    & Omit<ArpEthernetIpv4Packet, "sha" | "tha" | "spa" | "tpa">
    & {
      sha: string;
      tha: string;
      spa: string;
      tpa: string;
    };

  const refinedArp = refine(arpEthernetIpv4(), {
    refine: (raw: ArpEthernetIpv4Packet): RefinedArp => ({
      htype: raw.htype,
      ptype: raw.ptype,
      hlen: raw.hlen,
      plen: raw.plen,
      oper: raw.oper,
      sha: stringifyMac(raw.sha),
      tha: stringifyMac(raw.tha),
      spa: stringifyIpv4(raw.spa),
      tpa: stringifyIpv4(raw.tpa),
    }),
    unrefine: (refined: RefinedArp): ArpEthernetIpv4Packet => ({
      htype: refined.htype,
      ptype: refined.ptype,
      hlen: refined.hlen,
      plen: refined.plen,
      oper: refined.oper,
      sha: parseMac(refined.sha),
      tha: parseMac(refined.tha),
      spa: parseIpv4(refined.spa),
      tpa: parseIpv4(refined.tpa),
    }),
  });

  const coder = refinedArp();
  const original: RefinedArp = {
    htype: ARP_HARDWARE_TYPE.ETHERNET,
    ptype: ARP_PROTOCOL_TYPE.IPV4,
    hlen: ARP_HW_LEN_ETHERNET,
    plen: ARP_PROTO_LEN_IPV4,
    oper: ARP_OPCODE.REPLY,
    sha: "aa:bb:cc:dd:ee:ff",
    tha: "00:11:22:33:44:55",
    spa: "192.168.1.2",
    tpa: "192.168.1.1",
  };

  const buffer = new Uint8Array(ARP_ETHERNET_IPV4_SIZE);
  const bytesWritten = coder.encode(original, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(buffer, REPLY_WIRE);
  assertEquals(decoded, original);
});
