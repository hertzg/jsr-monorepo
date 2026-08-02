/**
 * Inet stack coder for the `@binstruct/*` packet family.
 *
 * `@binstruct/inet` is a thin orchestration layer: each protocol package
 * (`@binstruct/ethernet`, `@binstruct/sll`, `@binstruct/vlan`,
 * `@binstruct/pppoe`, `@binstruct/ipv4`, `@binstruct/ipv6`, `@binstruct/arp`,
 * `@binstruct/tcp`, `@binstruct/udp`, `@binstruct/icmp`, `@binstruct/icmpv6`,
 * `@binstruct/igmp`, `@binstruct/esp`, `@binstruct/vxlan`, `@binstruct/ntp`,
 * `@binstruct/bfd`) only knows how to decode its own layer's bytes. This
 * package wires them together via `refineSwitch` and `refineFields` —
 * dispatching on a host discriminator field at every layer (`etherType` /
 * `protocol`, `nextHeader`, IP `protocol`, UDP port, PPP protocol ID) — into
 * round-trippable coder factories that walk a captured frame top-down. Each
 * layer's payload field is surfaced as the typed value of the next layer;
 * layers we don't have a coder for default to a raw {@linkcode Uint8Array},
 * so the coders are safe to point at arbitrary captured traffic.
 *
 * Coverage:
 *
 * - L2 — Ethernet II ({@linkcode inetFrame}, `@binstruct/ethernet`) and Linux
 *   cooked capture ({@linkcode sllInetFrame}, `@binstruct/sll`), each a
 *   separate root sharing the same L3 dispatch logic.
 * - L2.5 — IEEE 802.1Q VLAN tagging (`@binstruct/vlan`), including a single
 *   bounded level of QinQ double-tagging, and PPPoE (`@binstruct/pppoe`)
 *   Discovery and Session stages, the latter carrying an internal PPP
 *   protocol-ID mini-layer that dispatches to IPv4/IPv6.
 * - L3 — IPv4 (`@binstruct/ipv4`), IPv6 (`@binstruct/ipv6`), ARP
 *   (`@binstruct/arp`).
 * - L4 (under IPv4/IPv6) — TCP (`@binstruct/tcp`), UDP (`@binstruct/udp`),
 *   ICMPv4 (`@binstruct/icmp`), ICMPv6 (`@binstruct/icmpv6`), IGMP
 *   (`@binstruct/igmp`, IPv4 only), ESP (`@binstruct/esp`).
 * - L4 (under UDP) — port-based dispatch to VXLAN (`@binstruct/vxlan`, whose
 *   inner Ethernet frame tunnels back through {@linkcode inetFrame} via a
 *   `lazy()` coder to break the build-time recursion), NTP (`@binstruct/ntp`),
 *   and BFD (`@binstruct/bfd`).
 *
 * Adding a layer is one new `refineFields` arm in the relevant
 * `refineSwitch` plus an entry in its selector.
 *
 * Also exports {@linkcode internetChecksum} (RFC 1071) for callers that need
 * to fill in IPv4/UDP/ICMP/TCP checksum fields.
 *
 * Each refined `payload` is the typed value directly — no `{ kind, ... }`
 * wrapper. The on-wire tag (`etherType` / `protocol` at L3, IP `protocol` /
 * `nextHeader` at L4, UDP port, PPP protocol ID) on the host record is the
 * discriminator; narrow the union with property-existence checks
 * (`"protocol" in payload`, `"srcPort" in payload`, …) when reading decoded
 * values.
 *
 * @example Round-trip a UDP-over-IPv4-over-Ethernet frame
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { ETHERTYPE_IPV4 } from "@binstruct/ipv4";
 * import { IP_PROTOCOL_UDP } from "@binstruct/udp";
 * import { inetFrame } from "@binstruct/inet";
 *
 * const value = {
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: ETHERTYPE_IPV4,
 *   payload: {
 *     versionIhl: { version: 4, ihl: 5 },
 *     typeOfService: 0,
 *     totalLength: 32,
 *     identification: 0,
 *     flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *     timeToLive: 64,
 *     protocol: IP_PROTOCOL_UDP,
 *     headerChecksum: 0,
 *     sourceAddress: parseIpv4("192.0.2.1"),
 *     destinationAddress: parseIpv4("192.0.2.2"),
 *     options: new Uint8Array(0),
 *     payload: {
 *       srcPort: 53,
 *       dstPort: 49152,
 *       length: 12,
 *       checksum: 0,
 *       payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *     },
 *   },
 * };
 *
 * const coder = inetFrame();
 * const buf = new Uint8Array(64);
 * const written = coder.encode(value, buf);
 * const [decoded] = coder.decode(buf.subarray(0, written));
 *
 * assert(!(decoded.payload instanceof Uint8Array));
 * assert("protocol" in decoded.payload);
 * assert(!(decoded.payload.payload instanceof Uint8Array));
 * assert("srcPort" in decoded.payload.payload);
 * assertEquals(decoded.payload.payload.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * ```
 *
 * @module
 */

import {
  bytes,
  type Coder,
  lazy,
  refine,
  refineFields,
  type Refiner,
  refineSwitch,
  struct,
  u16be,
} from "@hertzg/binstruct";
import {
  type Ethernet2Frame as Frame,
  ethernet2Frame,
} from "@binstruct/ethernet";
import { type SllHeader, sllHeader } from "@binstruct/sll";
import { TPID_8021Q, type VlanTag, vlanTag } from "@binstruct/vlan";
import {
  ETHERTYPE_PPPOE_DISCOVERY,
  ETHERTYPE_PPPOE_SESSION,
  type PppoeHeader,
  pppoeHeader,
} from "@binstruct/pppoe";
import { type ArpData, arpData, ETHERTYPE_ARP } from "@binstruct/arp";
import { ETHERTYPE_IPV4, type Ipv4Packet, ipv4Packet } from "@binstruct/ipv4";
import { ETHERTYPE_IPV6, type Ipv6Packet, ipv6Packet } from "@binstruct/ipv6";
import { type IcmpPacket, icmpPacket, IP_PROTOCOL_ICMP } from "@binstruct/icmp";
import {
  type Icmpv6Message,
  icmpv6Message,
  IP_PROTOCOL_ICMPV6,
} from "@binstruct/icmpv6";
import {
  type IgmpMessage,
  igmpMessage,
  IP_PROTOCOL_IGMP,
} from "@binstruct/igmp";
import { type EspPacket, espPacket, IP_PROTOCOL_ESP } from "@binstruct/esp";
import { IP_PROTOCOL_TCP, type TcpPacket, tcpPacket } from "@binstruct/tcp";
import { IP_PROTOCOL_UDP, type UdpPacket, udpPacket } from "@binstruct/udp";
import { VXLAN_PORT, type VxlanHeader, vxlanHeader } from "@binstruct/vxlan";
import { NTP_PORT, type NtpPacket, ntpPacket } from "@binstruct/ntp";
import {
  BFD_PORT,
  type BfdControlPacket,
  bfdControlPacket,
} from "@binstruct/bfd";

/**
 * Creates a coder for a VXLAN-tunneled Ethernet frame — the 8-byte VXLAN
 * header (`@binstruct/vxlan`) whose inner frame is the *same* Ethernet
 * encapsulation stack this module already knows how to decode.
 *
 * The inner frame is wrapped in `lazy()` rather than calling
 * {@linkcode inetFrame} directly: `udpFrame()` (built below) has a "vxlan"
 * arm that reaches this function, and this function's inner frame reaches
 * back to `inetFrame()` — a genuine build-time cycle. `lazy()` defers
 * resolving `inetFrame()` until the first encode/decode of an actual VXLAN
 * packet, breaking the cycle at coder-*construction* time. It does not
 * bound *decode-time* recursion — a maliciously nested VXLAN-in-VXLAN
 * capture still recurses once per level actually present in the bytes.
 *
 * @returns A coder for {@linkcode VxlanEthernetFrame} values.
 */
function vxlanFrame(): Coder<VxlanEthernetFrame> {
  return refine(
    vxlanHeader(),
    refineFields({ innerFrame: lazy(() => inetFrame()) }),
  )();
}

/** VXLAN header whose inner frame is a typed Ethernet stack. */
export type VxlanEthernetFrame = Omit<VxlanHeader, "innerFrame"> & {
  innerFrame: FrameRefined;
};

function classifyPort(port: number): "vxlan" | "ntp" | "bfd" | null {
  switch (port) {
    case VXLAN_PORT:
      return "vxlan";
    case NTP_PORT:
      return "ntp";
    case BFD_PORT:
      return "bfd";
    default:
      return null;
  }
}

/**
 * Creates a coder for a UDP datagram whose payload is dispatched by UDP
 * port, on top of the base header/length framing from `@binstruct/udp`.
 *
 * The selector is a heuristic — `classifyPort(dstPort) ?? classifyPort(srcPort)`
 * (destination port wins, falling back to the source port) — since UDP has
 * no in-band type tag. It round-trips symmetrically for well-formed traffic
 * but can misclassify adversarial or reused-port traffic; that's inherent to
 * port-based dispatch, not fixable at this layer.
 *
 * @returns A coder for {@linkcode UdpRefined} values.
 */
function udpFrame(): Coder<UdpRefined> {
  return refineSwitch(
    udpPacket(),
    {
      vxlan: refineFields({ payload: vxlanFrame() }),
      ntp: refineFields({ payload: ntpPacket() }),
      bfd: refineFields({ payload: bfdControlPacket() }),
      raw: refineFields({}),
    },
    {
      refine: (d): "vxlan" | "ntp" | "bfd" | "raw" =>
        classifyPort(d.dstPort) ?? classifyPort(d.srcPort) ?? "raw",
      unrefine: (r): "vxlan" | "ntp" | "bfd" | "raw" =>
        classifyPort(r.dstPort) ?? classifyPort(r.srcPort) ?? "raw",
    },
  );
}

/** UDP datagram with a typed VXLAN transport payload. */
export type UdpVxlanPacket = Omit<UdpPacket, "payload"> & {
  payload: VxlanEthernetFrame;
};

/** UDP datagram with a typed NTP transport payload. */
export type UdpNtpPacket = Omit<UdpPacket, "payload"> & { payload: NtpPacket };

/** UDP datagram with a typed BFD control payload. */
export type UdpBfdPacket = Omit<UdpPacket, "payload"> & {
  payload: BfdControlPacket;
};

/**
 * Refined UDP datagram — `payload` narrows by shape (VXLAN / NTP / BFD /
 * raw bytes), dispatched by destination port (falling back to source port)
 * since UDP carries no in-band type tag. See {@linkcode udpFrame}.
 */
export type UdpRefined =
  | UdpVxlanPacket
  | UdpNtpPacket
  | UdpBfdPacket
  | UdpPacket;

function ipv4Frame(): Coder<Ipv4Refined> {
  return refineSwitch(
    ipv4Packet(),
    {
      tcp: refineFields({ payload: tcpPacket() }),
      udp: refineFields({ payload: udpFrame() }),
      icmp: refineFields({ payload: icmpPacket() }),
      igmp: refineFields({ payload: igmpMessage() }),
      esp: refineFields({ payload: espPacket() }),
      raw: refineFields({}),
    },
    {
      refine: (d): "tcp" | "udp" | "icmp" | "igmp" | "esp" | "raw" => {
        switch (d.protocol) {
          case IP_PROTOCOL_TCP:
            return "tcp";
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMP:
            return "icmp";
          case IP_PROTOCOL_IGMP:
            return "igmp";
          case IP_PROTOCOL_ESP:
            return "esp";
          default:
            return "raw";
        }
      },
      unrefine: (r): "tcp" | "udp" | "icmp" | "igmp" | "esp" | "raw" => {
        switch (r.protocol) {
          case IP_PROTOCOL_TCP:
            return "tcp";
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMP:
            return "icmp";
          case IP_PROTOCOL_IGMP:
            return "igmp";
          case IP_PROTOCOL_ESP:
            return "esp";
          default:
            return "raw";
        }
      },
    },
  );
}

/** IPv4 datagram with a typed TCP transport payload. */
export type Ipv4TcpPacket = Omit<Ipv4Packet, "payload"> & {
  payload: TcpPacket;
};

/** IPv4 datagram with a typed UDP transport payload. */
export type Ipv4UdpPacket = Omit<Ipv4Packet, "payload"> & {
  payload: UdpRefined;
};

/** IPv4 datagram with a typed ICMPv4 transport payload. */
export type Ipv4IcmpPacket = Omit<Ipv4Packet, "payload"> & {
  payload: IcmpPacket;
};

/** IPv4 datagram with a typed IGMP transport payload. */
export type Ipv4IgmpPacket = Omit<Ipv4Packet, "payload"> & {
  payload: IgmpMessage;
};

/** IPv4 datagram with a typed ESP transport payload. */
export type Ipv4EspPacket = Omit<Ipv4Packet, "payload"> & {
  payload: EspPacket;
};

/**
 * Refined IPv4 datagram — `payload` narrows by shape (TCP / UDP / ICMP /
 * IGMP / ESP / raw bytes) and the host's `protocol` field is the on-wire
 * discriminator.
 */
export type Ipv4Refined =
  | Ipv4TcpPacket
  | Ipv4UdpPacket
  | Ipv4IcmpPacket
  | Ipv4IgmpPacket
  | Ipv4EspPacket
  | Ipv4Packet;

function ipv6Frame(): Coder<Ipv6Refined> {
  return refineSwitch(
    ipv6Packet(),
    {
      tcp: refineFields({ payload: tcpPacket() }),
      udp: refineFields({ payload: udpFrame() }),
      icmpv6: refineFields({ payload: icmpv6Message() }),
      esp: refineFields({ payload: espPacket() }),
      raw: refineFields({}),
    },
    {
      refine: (d): "tcp" | "udp" | "icmpv6" | "esp" | "raw" => {
        switch (d.nextHeader) {
          case IP_PROTOCOL_TCP:
            return "tcp";
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMPV6:
            return "icmpv6";
          case IP_PROTOCOL_ESP:
            return "esp";
          default:
            return "raw";
        }
      },
      unrefine: (r): "tcp" | "udp" | "icmpv6" | "esp" | "raw" => {
        switch (r.nextHeader) {
          case IP_PROTOCOL_TCP:
            return "tcp";
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMPV6:
            return "icmpv6";
          case IP_PROTOCOL_ESP:
            return "esp";
          default:
            return "raw";
        }
      },
    },
  );
}

/** IPv6 packet with a typed TCP transport payload. */
export type Ipv6TcpPacket = Omit<Ipv6Packet, "payload"> & {
  payload: TcpPacket;
};

/** IPv6 packet with a typed UDP transport payload. */
export type Ipv6UdpPacket = Omit<Ipv6Packet, "payload"> & {
  payload: UdpRefined;
};

/** IPv6 packet with a typed ICMPv6 transport payload. */
export type Ipv6Icmpv6Packet = Omit<Ipv6Packet, "payload"> & {
  payload: Icmpv6Message;
};

/** IPv6 packet with a typed ESP transport payload. */
export type Ipv6EspPacket = Omit<Ipv6Packet, "payload"> & {
  payload: EspPacket;
};

/**
 * Refined IPv6 packet — `payload` narrows by shape (TCP / UDP / ICMPv6 /
 * ESP / raw bytes) and the host's `nextHeader` field is the on-wire
 * discriminator.
 *
 * `@binstruct/ipv6` is a header-only (v0.0.1) coder: it does not walk
 * extension headers (Hop-by-Hop, Routing, Fragment, Destination Options).
 * A packet whose `nextHeader` names an extension header rather than a real
 * upper-layer protocol lands in the raw fallback here too — that's a
 * pre-existing `@binstruct/ipv6` limitation, not something this layer can
 * see through.
 */
export type Ipv6Refined =
  | Ipv6TcpPacket
  | Ipv6UdpPacket
  | Ipv6Icmpv6Packet
  | Ipv6EspPacket
  | Ipv6Packet;

const PPP_PROTOCOL_IPV4 = 0x0021;
const PPP_PROTOCOL_IPV6 = 0x0057;

/** Base PPP frame as carried inside a PPPoE Session payload: a 2-byte
 * protocol ID (RFC 1661 §2) followed by the protocol's payload. Not modeled
 * by `@binstruct/pppoe` itself — see the module docs there. */
interface PppHost {
  pppProtocol: number;
  payload: Uint8Array;
}

/**
 * Creates a coder for the PPP protocol-ID mini-layer carried inside a PPPoE
 * Session payload (RFC 1661 §2): a 2-byte protocol ID followed by the
 * protocol's payload, dispatching `0x0021` to IPv4 and `0x0057` to IPv6.
 *
 * This lives entirely inside `@binstruct/inet` rather than as new surface on
 * `@binstruct/pppoe`, since the PPP protocol ID isn't part of the PPPoE
 * header itself — it's the first two bytes of what PPPoE hands back as
 * opaque `payload`.
 *
 * @returns A coder for {@linkcode PppoeSessionRefined} values.
 */
function pppFrame(): Coder<PppoeSessionRefined> {
  return refineSwitch(
    struct({ pppProtocol: u16be(), payload: bytes() }),
    {
      ipv4: refineFields({ payload: ipv4Frame() }),
      ipv6: refineFields({ payload: ipv6Frame() }),
      raw: refineFields({}),
    },
    {
      refine: (host: PppHost): "ipv4" | "ipv6" | "raw" => {
        switch (host.pppProtocol) {
          case PPP_PROTOCOL_IPV4:
            return "ipv4";
          case PPP_PROTOCOL_IPV6:
            return "ipv6";
          default:
            return "raw";
        }
      },
      unrefine: (refined): "ipv4" | "ipv6" | "raw" => {
        switch (refined.pppProtocol) {
          case PPP_PROTOCOL_IPV4:
            return "ipv4";
          case PPP_PROTOCOL_IPV6:
            return "ipv6";
          default:
            return "raw";
        }
      },
    },
  );
}

/** PPP frame with a typed IPv4 payload. */
export type PppoeIpv4Frame = Omit<PppHost, "payload"> & {
  payload: Ipv4Refined;
};

/** PPP frame with a typed IPv6 payload. */
export type PppoeIpv6Frame = Omit<PppHost, "payload"> & {
  payload: Ipv6Refined;
};

/**
 * Refined PPP frame as carried inside a PPPoE Session payload — `payload`
 * narrows by shape (IPv4 / IPv6 / raw bytes), dispatched by the PPP
 * protocol ID.
 */
export type PppoeSessionRefined =
  | PppoeIpv4Frame
  | PppoeIpv6Frame
  | PppHost;

/**
 * Creates a coder for a PPPoE Session-stage packet (`@binstruct/pppoe`)
 * whose payload is the PPP protocol-ID mini-layer from {@linkcode pppFrame}.
 *
 * @returns A coder for {@linkcode PppoeSessionPacket} values.
 */
function pppoeSessionFrame(): Coder<PppoeSessionPacket> {
  return refine(
    pppoeHeader(),
    refineFields({ payload: pppFrame() }),
  )();
}

/** PPPoE Session-stage header whose payload is a typed PPP frame. */
export type PppoeSessionPacket = Omit<PppoeHeader, "payload"> & {
  payload: PppoeSessionRefined;
};

/**
 * Host shape shared by every EtherType-space dispatch point this module
 * builds: Ethernet II, Linux cooked capture (SLL), and — one level down — a
 * VLAN tag's own encapsulated payload.
 */
type L3Payload = { payload: Uint8Array };

/**
 * Refiner arms shared by every EtherType-keyed dispatch point (Ethernet,
 * SLL, and a VLAN tag's payload): IPv4, IPv6, ARP, PPPoE Discovery, PPPoE
 * Session, and the raw fallback.
 *
 * VLAN nesting is deliberately **not** one of these arms — see
 * {@linkcode vlanFrame}. Its recursion is bounded by an explicit depth
 * parameter rather than being part of this shared, depth-agnostic set, so
 * every caller adds its own "vlan" arm on top of what this returns.
 */
function l3Refiners<THost extends L3Payload>(): {
  ipv4: Refiner<THost, Omit<THost, "payload"> & { payload: Ipv4Refined }, []>;
  ipv6: Refiner<THost, Omit<THost, "payload"> & { payload: Ipv6Refined }, []>;
  arp: Refiner<THost, Omit<THost, "payload"> & { payload: ArpData }, []>;
  pppoeDiscovery: Refiner<
    THost,
    Omit<THost, "payload"> & { payload: PppoeHeader },
    []
  >;
  pppoeSession: Refiner<
    THost,
    Omit<THost, "payload"> & { payload: PppoeSessionPacket },
    []
  >;
  raw: Refiner<THost, THost, []>;
} {
  return {
    ipv4: refineFields({ payload: ipv4Frame() }),
    ipv6: refineFields({ payload: ipv6Frame() }),
    arp: refineFields({ payload: arpData() }),
    pppoeDiscovery: refineFields({ payload: pppoeHeader() }),
    pppoeSession: refineFields({ payload: pppoeSessionFrame() }),
    raw: refineFields({}),
  };
}

type L3Key =
  | "ipv4"
  | "ipv6"
  | "arp"
  | "pppoeDiscovery"
  | "pppoeSession"
  | "raw";

function classifyL3(etherType: number): L3Key {
  switch (etherType) {
    case ETHERTYPE_IPV4:
      return "ipv4";
    case ETHERTYPE_IPV6:
      return "ipv6";
    case ETHERTYPE_ARP:
      return "arp";
    case ETHERTYPE_PPPOE_DISCOVERY:
      return "pppoeDiscovery";
    case ETHERTYPE_PPPOE_SESSION:
      return "pppoeSession";
    default:
      return "raw";
  }
}

/**
 * Creates a coder for an IEEE 802.1Q VLAN tag (`@binstruct/vlan`) whose
 * encapsulated payload is dispatched by EtherType, with QinQ (double
 * tagging) support bounded by `depth`.
 *
 * `depth` counts how many further nested VLAN tags this call is willing to
 * unwrap: `1` (used at the true root, e.g. from {@linkcode inetFrame} and
 * {@linkcode sllInetFrame}) allows one level of QinQ before the inner tag's
 * own "vlan" arm is unavailable; `0` (used internally for that inner level)
 * has no "vlan" arm in its own dispatch table at all, so a third stacked
 * `0x8100` EtherType simply falls into the raw fallback instead of
 * recursing further. This keeps the coder tree finite by construction —
 * unlike VXLAN's tunnel back to `inetFrame()`, VLAN nesting needs no
 * `lazy()` firebreak, since `depth` strictly decreases to `0` and stops.
 *
 * Hardcoding the nested call as `vlanFrame(1)` instead of `vlanFrame(0)`
 * would silently reintroduce unbounded mutual recursion between this
 * function and itself — and, unlike VXLAN, without a `lazy()` firebreak in
 * place, so it would overflow the stack again at coder-build time rather
 * than only misbehave at decode time.
 *
 * @param depth How many further levels of VLAN tagging to dispatch. `1`
 *   allows one level of QinQ; `0` disables further VLAN dispatch, so a
 *   nested tag surfaces as an undecoded {@linkcode VlanTag}.
 * @returns A coder for {@linkcode VlanRefinedShallow} at `depth` `0`, or
 *   {@linkcode VlanRefined} (one level of QinQ included) at `depth` `1`.
 */
function vlanFrame(depth: 0): Coder<VlanRefinedShallow>;
function vlanFrame(depth: 1): Coder<VlanRefined>;
function vlanFrame(
  depth: 0 | 1,
): Coder<VlanRefinedShallow> | Coder<VlanRefined> {
  if (depth === 0) {
    return refineSwitch(
      vlanTag(),
      l3Refiners<VlanTag>(),
      {
        refine: (tag: VlanTag) => classifyL3(tag.etherType),
        unrefine: (refined) => classifyL3(refined.etherType),
      },
    );
  }

  return refineSwitch(
    vlanTag(),
    {
      ...l3Refiners<VlanTag>(),
      vlan: refineFields({ payload: vlanFrame(0) }),
    },
    {
      refine: (tag: VlanTag) => {
        if (tag.etherType === TPID_8021Q) return "vlan";
        return classifyL3(tag.etherType);
      },
      unrefine: (refined) => {
        if (refined.etherType === TPID_8021Q) return "vlan";
        return classifyL3(refined.etherType);
      },
    },
  );
}

/** VLAN tag with a typed IPv4 payload. */
export type VlanIpv4Frame = Omit<VlanTag, "payload"> & {
  payload: Ipv4Refined;
};

/** VLAN tag with a typed IPv6 payload. */
export type VlanIpv6Frame = Omit<VlanTag, "payload"> & {
  payload: Ipv6Refined;
};

/** VLAN tag with a typed ARP payload. */
export type VlanArpFrame = Omit<VlanTag, "payload"> & { payload: ArpData };

/** VLAN tag with a typed PPPoE Discovery-stage payload. */
export type VlanPppoeDiscoveryFrame = Omit<VlanTag, "payload"> & {
  payload: PppoeHeader;
};

/** VLAN tag with a typed PPPoE Session-stage payload. */
export type VlanPppoeSessionFrame = Omit<VlanTag, "payload"> & {
  payload: PppoeSessionPacket;
};

/**
 * Refined VLAN tag with no further VLAN dispatch available — `payload`
 * narrows by shape (IPv4 / IPv6 / ARP / PPPoE Discovery / PPPoE Session /
 * raw bytes). This is what {@linkcode vlanFrame}`(0)` produces: the inner
 * tag of a QinQ pair, which does not itself dispatch a third stacked VLAN
 * tag.
 */
export type VlanRefinedShallow =
  | VlanIpv4Frame
  | VlanIpv6Frame
  | VlanArpFrame
  | VlanPppoeDiscoveryFrame
  | VlanPppoeSessionFrame
  | VlanTag;

/** VLAN tag carrying a single further nested (QinQ) VLAN tag. */
export type VlanQinQFrame = Omit<VlanTag, "payload"> & {
  payload: VlanRefinedShallow;
};

/**
 * Refined VLAN tag — `payload` narrows by shape (IPv4 / IPv6 / ARP / PPPoE
 * Discovery / PPPoE Session / one further nested VLAN tag / raw bytes),
 * dispatched by the tag's own encapsulated EtherType. This is what
 * {@linkcode vlanFrame}`(1)` produces, the depth used at every true root
 * ({@linkcode inetFrame}, {@linkcode sllInetFrame}).
 */
export type VlanRefined = VlanQinQFrame | VlanRefinedShallow;

/** Ethernet frame whose payload is a typed IPv4 datagram. */
export type Ipv4Frame = Omit<Frame, "payload"> & { payload: Ipv4Refined };

/** Ethernet frame whose payload is a typed IPv6 packet. */
export type Ipv6Frame = Omit<Frame, "payload"> & { payload: Ipv6Refined };

/** Ethernet frame whose payload is an Ethernet/IPv4 ARP packet. */
export type ArpFrame = Omit<Frame, "payload"> & { payload: ArpData };

/** Ethernet frame whose payload is a PPPoE Discovery-stage packet. */
export type PppoeDiscoveryFrame = Omit<Frame, "payload"> & {
  payload: PppoeHeader;
};

/** Ethernet frame whose payload is a PPPoE Session-stage packet. */
export type PppoeSessionFrame = Omit<Frame, "payload"> & {
  payload: PppoeSessionPacket;
};

/** Ethernet frame whose payload is a typed VLAN tag. */
export type VlanFrame = Omit<Frame, "payload"> & { payload: VlanRefined };

/**
 * Decoded Ethernet II frame as produced by {@link inetFrame}.
 *
 * The shape depends on `etherType` and, for the layers it selects, further
 * discriminator fields deeper in the stack; narrow the union with
 * property-existence checks (`"protocol" in payload`, `"srcPort" in
 * payload`, …) when reading. Frames whose tag has no matching coder surface
 * their `payload` as a raw `Uint8Array`.
 */
export type FrameRefined =
  | Ipv4Frame
  | Ipv6Frame
  | ArpFrame
  | PppoeDiscoveryFrame
  | PppoeSessionFrame
  | VlanFrame
  | Frame;

/**
 * Creates a composed coder that walks an Ethernet II frame
 * (`@binstruct/ethernet`) top-down, dispatching the L2.5/L3 payload by
 * `etherType` and every deeper layer by its own discriminator field. Frames
 * whose tag has no matching coder surface their payload as a raw
 * `Uint8Array`.
 *
 * @returns A coder for {@linkcode FrameRefined} values.
 */
export function inetFrame(): Coder<FrameRefined> {
  return refineSwitch(
    ethernet2Frame(),
    {
      ...l3Refiners<Frame>(),
      vlan: refineFields({ payload: vlanFrame(1) }),
    },
    {
      refine: (frame: Frame) => {
        if (frame.etherType === TPID_8021Q) return "vlan";
        return classifyL3(frame.etherType);
      },
      unrefine: (refined) => {
        if (refined.payload instanceof Uint8Array) return "raw";
        if (refined.etherType === TPID_8021Q) return "vlan";
        return classifyL3(refined.etherType);
      },
    },
  );
}

/** Linux cooked capture (SLL) header whose payload is a typed IPv4 datagram. */
export type SllIpv4Frame = Omit<SllHeader, "payload"> & {
  payload: Ipv4Refined;
};

/** Linux cooked capture (SLL) header whose payload is a typed IPv6 packet. */
export type SllIpv6Frame = Omit<SllHeader, "payload"> & {
  payload: Ipv6Refined;
};

/** Linux cooked capture (SLL) header whose payload is an ARP packet. */
export type SllArpFrame = Omit<SllHeader, "payload"> & { payload: ArpData };

/** Linux cooked capture (SLL) header whose payload is a PPPoE Discovery-stage packet. */
export type SllPppoeDiscoveryFrame = Omit<SllHeader, "payload"> & {
  payload: PppoeHeader;
};

/** Linux cooked capture (SLL) header whose payload is a PPPoE Session-stage packet. */
export type SllPppoeSessionFrame = Omit<SllHeader, "payload"> & {
  payload: PppoeSessionPacket;
};

/** Linux cooked capture (SLL) header whose payload is a typed VLAN tag. */
export type SllVlanFrame = Omit<SllHeader, "payload"> & {
  payload: VlanRefined;
};

/**
 * Decoded Linux cooked capture (SLL v1) header as produced by
 * {@link sllInetFrame}. Mirrors {@linkcode FrameRefined} one layer down —
 * SLL replaces the real link layer with its own fixed header, but dispatches
 * through the exact same {@linkcode l3Refiners} arms via `protocol` in place
 * of Ethernet's `etherType`.
 */
export type SllFrameRefined =
  | SllIpv4Frame
  | SllIpv6Frame
  | SllArpFrame
  | SllPppoeDiscoveryFrame
  | SllPppoeSessionFrame
  | SllVlanFrame
  | SllHeader;

/**
 * Creates a composed coder that walks a Linux cooked capture (SLL v1)
 * header (`@binstruct/sll`) top-down, dispatching the payload by `protocol`
 * — the same EtherType-space dispatch {@link inetFrame} performs on
 * Ethernet's `etherType`, reused here via {@linkcode l3Refiners}. Payloads
 * whose tag has no matching coder surface as a raw `Uint8Array`.
 *
 * @returns A coder for {@linkcode SllFrameRefined} values.
 */
export function sllInetFrame(): Coder<SllFrameRefined> {
  return refineSwitch(
    sllHeader(),
    {
      ...l3Refiners<SllHeader>(),
      vlan: refineFields({ payload: vlanFrame(1) }),
    },
    {
      refine: (frame: SllHeader) => {
        if (frame.protocol === TPID_8021Q) return "vlan";
        return classifyL3(frame.protocol);
      },
      unrefine: (refined) => {
        if (refined.payload instanceof Uint8Array) return "raw";
        if (refined.protocol === TPID_8021Q) return "vlan";
        return classifyL3(refined.protocol);
      },
    },
  );
}

/**
 * Computes the 16-bit Internet checksum (RFC 1071) over a span of bytes.
 *
 * The checksum is the 16-bit one's complement of the one's complement sum of
 * all 16-bit words in the span. If the byte length is odd, the trailing byte
 * is padded with zero for the purposes of the sum.
 *
 * Callers typically zero out the checksum field of a header before computing,
 * then write the returned value back into that field. A subsequent call over
 * the completed packet returns 0, the standard receiver-side verification.
 *
 * The function is layout-agnostic — it operates on whatever bytes are passed
 * in. For protocols that include a pseudo-header in the checksum (UDP, TCP),
 * the caller is responsible for assembling the pseudo-header followed by the
 * datagram and passing the concatenation.
 *
 * @param data Bytes to checksum.
 * @returns A 16-bit unsigned integer suitable for direct assignment into a
 *   `u16be` field.
 *
 * @example RFC 1071 §3 worked example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@binstruct/inet";
 *
 * // deno-fmt-ignore
 * const sample = new Uint8Array([
 *   0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7,
 * ]);
 * assertEquals(internetChecksum(sample), 0x220d);
 * ```
 *
 * @example Verify a checksummed packet round-trips to zero
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@binstruct/inet";
 *
 * // deno-fmt-ignore
 * const echoRequest = new Uint8Array([
 *   0x08, 0x00, 0xf7, 0xfd, 0x00, 0x01, 0x00, 0x01,
 * ]);
 * assertEquals(internetChecksum(echoRequest), 0x0000);
 * ```
 */
export function internetChecksum(data: Uint8Array): number {
  let sum = 0;
  const limit = data.length & ~1;
  for (let i = 0; i < limit; i += 2) {
    sum += (data[i] << 8) | data[i + 1];
  }
  if (data.length & 1) {
    sum += data[data.length - 1] << 8;
  }
  while (sum >>> 16) {
    sum = (sum & 0xffff) + (sum >>> 16);
  }
  return (~sum) & 0xffff;
}
