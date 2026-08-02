// This file is auto-generated. Do not edit manually.
// Run: deno run -A _tools/check_cli_registry.ts --update

/**
 * Short names of the `@binstruct` packages the CLI knows about, sorted
 * alphabetically.
 *
 * A package earns a place here by exposing at least one coder factory; the CLI
 * package itself is never a member. Prefix an entry with `@binstruct/` to get
 * the JSR coordinate.
 *
 * The list is a discovery hint, not a gate — any package resolvable by the
 * runtime remains usable as a specifier whether or not it appears here.
 *
 * @example Every name resolves to a `@binstruct` coordinate
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { KNOWN_PACKAGES } from "./registry.ts";
 *
 * assertEquals(KNOWN_PACKAGES.includes("png"), true);
 * assertEquals(KNOWN_PACKAGES.includes("cli"), false);
 * assertEquals(`@binstruct/${KNOWN_PACKAGES[0]}`, "@binstruct/arp");
 * ```
 */
export const KNOWN_PACKAGES: readonly string[] = [
  "arp",
  "au",
  "bfd",
  "bmp",
  "dos-mz",
  "esp",
  "ethernet",
  "icmp",
  "icmpv6",
  "ico",
  "igmp",
  "inet",
  "ipv4",
  "ipv6",
  "mbr",
  "mp3",
  "ntp",
  "pcap",
  "png",
  "pppoe",
  "rtp",
  "sll",
  "sqlite",
  "tar",
  "tcp",
  "tga",
  "tls-record",
  "udp",
  "vlan",
  "vxlan",
  "wav",
];
