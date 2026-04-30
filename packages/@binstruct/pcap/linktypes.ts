/**
 * Common link-layer header type values used in the pcap global header.
 *
 * The pcap `network` field stores a numeric identifier describing the link-layer
 * protocol of the captured packets. The full registry is maintained by tcpdump;
 * this map only includes the most commonly encountered values to avoid bloating
 * the package. The field itself remains a raw `u32` — these constants are
 * provided purely as a convenience for callers.
 *
 * @see {@link https://www.tcpdump.org/linktypes.html | tcpdump LINKTYPE registry}
 *
 * @example Using a link type constant when constructing a global header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { LINKTYPE } from "@binstruct/pcap";
 *
 * assertEquals(LINKTYPE.ETHERNET, 1);
 * assertEquals(LINKTYPE.RAW, 101);
 * assertEquals(LINKTYPE.LINUX_SLL, 113);
 * ```
 */
export const LINKTYPE = {
  /** No link-layer header (BSD loopback). */
  NULL: 0,
  /** IEEE 802.3 Ethernet. */
  ETHERNET: 1,
  /** AX.25 packet, with no link-layer pseudo-header. */
  AX25: 3,
  /** IEEE 802.5 Token Ring. */
  IEEE802_5: 6,
  /** ARCNET, with BSD-style header. */
  ARCNET_BSD: 7,
  /** SLIP, with no direction indication. */
  SLIP: 8,
  /** PPP, as per RFC 1661 and RFC 1662. */
  PPP: 9,
  /** FDDI. */
  FDDI: 10,
  /** Raw IP packet (IPv4 or IPv6) with no link layer. */
  RAW: 101,
  /** IEEE 802.11 wireless LAN. */
  IEEE802_11: 105,
  /** Linux "cooked" capture encapsulation (SLL). */
  LINUX_SLL: 113,
  /** Apple PPP-over-HDLC. */
  PPP_HDLC: 50,
  /** IEEE 802.11 plus radiotap radio header. */
  IEEE802_11_RADIOTAP: 127,
  /** USB packets, beginning with a Linux USB header. */
  USB_LINUX: 189,
  /** Bluetooth HCI UART transport layer. */
  BLUETOOTH_HCI_H4: 187,
  /** Linux "cooked" capture encapsulation v2. */
  LINUX_SLL2: 276,
} as const;

/**
 * Numeric link-layer header type, as stored in the pcap global header.
 *
 * The named values from {@link LINKTYPE} are the most common, but any 32-bit
 * unsigned integer is technically valid — the pcap format does not constrain
 * this field.
 */
export type LinkType = number;
