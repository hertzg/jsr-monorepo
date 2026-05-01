import { assertEquals } from "@std/assert";
import { refine } from "@hertzg/binstruct";
import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
import { parse as parseMac, stringify as stringifyMac } from "@hertzg/mac";
import {
  ARP_ETHERNET_IPV4_SIZE,
  ARP_HARDWARE_TYPE,
  ARP_HW_LEN_ETHERNET,
  ARP_OPCODE,
  ARP_PROTO_LEN_IPV4,
  ARP_PROTOCOL_TYPE,
  arp,
} from "./mod.ts";
import type { Arp } from "./mod.ts";

// deno-fmt-ignore
const REQUEST_WIRE = new Uint8Array([
  0x00, 0x01,                         // hardwareType: Ethernet
  0x08, 0x00,                         // protocolType: IPv4
  0x06,                               // hardwareAddressLength
  0x04,                               // protocolAddressLength
  0x00, 0x01,                         // operation: request
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, // senderHardwareAddress
  0xc0, 0xa8, 0x01, 0x01,             // senderProtocolAddress: 192.168.1.1
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // targetHardwareAddress (unknown)
  0xc0, 0xa8, 0x01, 0x02,             // targetProtocolAddress: 192.168.1.2
]);

// deno-fmt-ignore
const REPLY_WIRE = new Uint8Array([
  0x00, 0x01,                         // hardwareType
  0x08, 0x00,                         // protocolType
  0x06,                               // hardwareAddressLength
  0x04,                               // protocolAddressLength
  0x00, 0x02,                         // operation: reply
  0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, // senderHardwareAddress
  0xc0, 0xa8, 0x01, 0x02,             // senderProtocolAddress: 192.168.1.2
  0x00, 0x11, 0x22, 0x33, 0x44, 0x55, // targetHardwareAddress
  0xc0, 0xa8, 0x01, 0x01,             // targetProtocolAddress: 192.168.1.1
]);

Deno.test("arp — decode known request bytes", () => {
  const [packet, bytesRead] = arp().decode(REQUEST_WIRE);

  assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(packet.hardwareType, ARP_HARDWARE_TYPE.ETHERNET);
  assertEquals(packet.protocolType, ARP_PROTOCOL_TYPE.IPV4);
  assertEquals(packet.hardwareAddressLength, ARP_HW_LEN_ETHERNET);
  assertEquals(packet.protocolAddressLength, ARP_PROTO_LEN_IPV4);
  assertEquals(packet.operation, ARP_OPCODE.REQUEST);
  assertEquals(stringifyMac(packet.senderHardwareAddress), "00:11:22:33:44:55");
  assertEquals(stringifyMac(packet.targetHardwareAddress), "00:00:00:00:00:00");
  assertEquals(stringifyIpv4(packet.senderProtocolAddress), "192.168.1.1");
  assertEquals(stringifyIpv4(packet.targetProtocolAddress), "192.168.1.2");
});

Deno.test("arp — decode known reply bytes", () => {
  const [packet, bytesRead] = arp().decode(REPLY_WIRE);

  assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(packet.operation, ARP_OPCODE.REPLY);
  assertEquals(stringifyMac(packet.senderHardwareAddress), "aa:bb:cc:dd:ee:ff");
  assertEquals(stringifyMac(packet.targetHardwareAddress), "00:11:22:33:44:55");
  assertEquals(stringifyIpv4(packet.senderProtocolAddress), "192.168.1.2");
  assertEquals(stringifyIpv4(packet.targetProtocolAddress), "192.168.1.1");
});

Deno.test("arp — encode produces expected wire bytes", () => {
  const coder = arp();
  const request: Arp = {
    hardwareType: ARP_HARDWARE_TYPE.ETHERNET,
    protocolType: ARP_PROTOCOL_TYPE.IPV4,
    hardwareAddressLength: ARP_HW_LEN_ETHERNET,
    protocolAddressLength: ARP_PROTO_LEN_IPV4,
    operation: ARP_OPCODE.REQUEST,
    senderHardwareAddress: parseMac("00:11:22:33:44:55"),
    senderProtocolAddress: parseIpv4("192.168.1.1"),
    targetHardwareAddress: new Uint8Array(ARP_HW_LEN_ETHERNET),
    targetProtocolAddress: parseIpv4("192.168.1.2"),
  };

  const buffer = new Uint8Array(ARP_ETHERNET_IPV4_SIZE);
  const bytesWritten = coder.encode(request, buffer);

  assertEquals(bytesWritten, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(buffer, REQUEST_WIRE);
});

Deno.test("arp — round-trip request and reply", () => {
  const coder = arp();
  const cases: Arp[] = [
    {
      hardwareType: ARP_HARDWARE_TYPE.ETHERNET,
      protocolType: ARP_PROTOCOL_TYPE.IPV4,
      hardwareAddressLength: ARP_HW_LEN_ETHERNET,
      protocolAddressLength: ARP_PROTO_LEN_IPV4,
      operation: ARP_OPCODE.REQUEST,
      senderHardwareAddress: parseMac("00:11:22:33:44:55"),
      senderProtocolAddress: parseIpv4("10.0.0.1"),
      targetHardwareAddress: new Uint8Array(ARP_HW_LEN_ETHERNET),
      targetProtocolAddress: parseIpv4("10.0.0.42"),
    },
    {
      hardwareType: ARP_HARDWARE_TYPE.ETHERNET,
      protocolType: ARP_PROTOCOL_TYPE.IPV4,
      hardwareAddressLength: ARP_HW_LEN_ETHERNET,
      protocolAddressLength: ARP_PROTO_LEN_IPV4,
      operation: ARP_OPCODE.REPLY,
      senderHardwareAddress: parseMac("aa:bb:cc:dd:ee:ff"),
      senderProtocolAddress: parseIpv4("10.0.0.42"),
      targetHardwareAddress: parseMac("00:11:22:33:44:55"),
      targetProtocolAddress: parseIpv4("10.0.0.1"),
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

Deno.test("arp — composes with refine for human-readable form", () => {
  type RefinedArp =
    & Omit<
      Arp,
      | "senderHardwareAddress"
      | "targetHardwareAddress"
      | "senderProtocolAddress"
      | "targetProtocolAddress"
    >
    & {
      senderHardwareAddress: string;
      targetHardwareAddress: string;
      senderProtocolAddress: string;
      targetProtocolAddress: string;
    };

  const refinedArp = refine(arp(), {
    refine: (raw: Arp): RefinedArp => ({
      hardwareType: raw.hardwareType,
      protocolType: raw.protocolType,
      hardwareAddressLength: raw.hardwareAddressLength,
      protocolAddressLength: raw.protocolAddressLength,
      operation: raw.operation,
      senderHardwareAddress: stringifyMac(raw.senderHardwareAddress),
      targetHardwareAddress: stringifyMac(raw.targetHardwareAddress),
      senderProtocolAddress: stringifyIpv4(raw.senderProtocolAddress),
      targetProtocolAddress: stringifyIpv4(raw.targetProtocolAddress),
    }),
    unrefine: (refined: RefinedArp): Arp => ({
      hardwareType: refined.hardwareType,
      protocolType: refined.protocolType,
      hardwareAddressLength: refined.hardwareAddressLength,
      protocolAddressLength: refined.protocolAddressLength,
      operation: refined.operation,
      senderHardwareAddress: parseMac(refined.senderHardwareAddress),
      targetHardwareAddress: parseMac(refined.targetHardwareAddress),
      senderProtocolAddress: parseIpv4(refined.senderProtocolAddress),
      targetProtocolAddress: parseIpv4(refined.targetProtocolAddress),
    }),
  });

  const coder = refinedArp();
  const original: RefinedArp = {
    hardwareType: ARP_HARDWARE_TYPE.ETHERNET,
    protocolType: ARP_PROTOCOL_TYPE.IPV4,
    hardwareAddressLength: ARP_HW_LEN_ETHERNET,
    protocolAddressLength: ARP_PROTO_LEN_IPV4,
    operation: ARP_OPCODE.REPLY,
    senderHardwareAddress: "aa:bb:cc:dd:ee:ff",
    targetHardwareAddress: "00:11:22:33:44:55",
    senderProtocolAddress: "192.168.1.2",
    targetProtocolAddress: "192.168.1.1",
  };

  const buffer = new Uint8Array(ARP_ETHERNET_IPV4_SIZE);
  const bytesWritten = coder.encode(original, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
  assertEquals(buffer, REPLY_WIRE);
  assertEquals(decoded, original);
});
