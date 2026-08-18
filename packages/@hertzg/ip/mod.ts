/**
 * IPv4 and IPv6 address parsing, stringifying, and CIDR utilities.
 *
 * This module provides functions for working with IPv4 and IPv6 addresses and CIDR notation.
 * IPv4 addresses are represented as numbers (32-bit), IPv6 as bigints (128-bit), enabling
 * efficient arithmetic operations and range manipulation for network programming tasks.
 *
 * ## Features
 *
 * - **One Notation Grammar**: `address[%zoneId][/prefix]`, every parser a narrowing of it; zone IDs carried verbatim, masks accepted as a second CIDR dialect
 * - **Dual-Stack Support**: Auto-unwrap IPv4-mapped IPv6 addresses from dual-stack sockets
 * - **IP Classification**: Identify private, loopback, multicast, public, and other well-known ranges
 * - **CIDR Support**: Parse CIDR notation, check containment, compute network boundaries; blocks carry a prefix length or a mask
 * - **Sorting**: Version-first comparators for addresses and CIDR blocks, mixed lists included
 * - **IPv4 & IPv6 Parsing**: Convert between standard notation and number/bigint for arithmetic
 * - **Address Generation**: Lazily enumerate addresses in CIDR blocks
 * - **IPv4-Mapped Conversion**: Convert between IPv4 and IPv4-mapped IPv6 addresses and CIDRs
 * - **Validation**: Non-throwing validity checks for IP addresses and CIDR notation
 * - **Wire Bytes**: Read and write addresses directly in packet buffers, no string round-trip
 * - **Reverse DNS**: Build the `in-addr.arpa` / `ip6.arpa` pointer name of an address
 *
 * ## SSRF Guard
 *
 * @example Reject a fetch target that resolves inside your own network
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip";
 *
 * // A guard that only checks loopback and link-local misses private, CGNAT,
 * // and multicast ranges; classification is one label from a closed set, so
 * // there's no list of booleans to keep in sync
 * function isSafeToFetch(host: string): boolean {
 *   const { classification } = classifyAddress(host); // v4, v6, or mapped, one call
 *   return classification === "public" || classification === "global-unicast";
 * }
 *
 * assertEquals(isSafeToFetch("8.8.8.8"), true);
 * assertEquals(isSafeToFetch("2001:4860:4860::8888"), true);
 *
 * assertEquals(isSafeToFetch("127.0.0.1"), false);
 * assertEquals(isSafeToFetch("10.0.0.1"), false);
 * assertEquals(isSafeToFetch("169.254.169.254"), false); // cloud metadata endpoint
 * assertEquals(isSafeToFetch("::ffff:127.0.0.1"), false); // mapped, unwrapped first
 * ```
 *
 * ## Trusted Network Allowlist
 *
 * @example Check if a client IP is in a set of trusted CIDR blocks
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrContains, parseCidr, parseAddress } from "@hertzg/ip";
 *
 * // The list may mix IP versions; each entry is only ever compared against an
 * // address of its own version, and a mismatch is a miss rather than an error
 * const trustedRanges = [
 *   "10.0.0.0/8",
 *   "172.16.0.0/12",
 *   "192.168.0.0/16",
 *   "fd00::/8",
 * ].map((s) => parseCidr(s));
 *
 * function isTrusted(ip: string): boolean {
 *   const address = parseAddress(ip).address;
 *   return trustedRanges.some((cidr) => cidrContains(cidr, address));
 * }
 *
 * assert(isTrusted("192.168.1.100"));
 * assert(isTrusted("10.0.0.1"));
 * assert(isTrusted("::ffff:172.16.5.1")); // parseAddress unwrapped this to IPv4 first
 * assert(isTrusted("fd00::1")); // matched the IPv6 entry, no conversion involved
 *
 * assertEquals(isTrusted("8.8.8.8"), false);
 * assertEquals(isTrusted("2001:db8::1"), false);
 * ```
 *
 * ## Dual-Stack Server
 *
 * @example Normalize client addresses from a dual-stack server
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress, parseAddress, stringifyAddress } from "@hertzg/ip";
 *
 * // Dual-stack servers (Deno, Node) report IPv4 clients as ::ffff:x.x.x.x
 * // parseAddress auto-unwraps mapped addresses to their IPv4 form
 * const remote1 = parseAddress("::ffff:192.168.1.50").address;
 * assertEquals(stringifyAddress(remote1), "192.168.1.50");
 *
 * // Native IPv6 clients pass through unchanged
 * const remote2 = parseAddress("2001:db8::1").address;
 * assertEquals(stringifyAddress(remote2), "2001:db8::1");
 *
 * // Classification works on both
 * assertEquals(classifyAddress(remote1).classification, "private");
 * assertEquals(classifyAddress(remote2).classification, "documentation");
 * ```
 *
 * ## IP Classification
 *
 * @example Classify addresses for logging, analytics, or input validation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip";
 *
 * // Classify any IP — result includes kind, numeric value, and label
 * const result = classifyAddress("192.168.1.1");
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.classification, "private");
 *
 * assertEquals(classifyAddress("127.0.0.1").classification, "loopback");
 * assertEquals(classifyAddress("8.8.8.8").classification, "public");
 * assertEquals(classifyAddress("169.254.1.1").classification, "link-local");
 *
 * // Works with IPv6 too
 * assertEquals(classifyAddress("::1").classification, "loopback");
 * assertEquals(classifyAddress("fe80::1").classification, "link-local");
 * assertEquals(classifyAddress("fd00::1").classification, "unique-local");
 *
 * // Use with Zod as a custom validator that accepts allowed classifications:
 * //
 * // import { type Classificationv4, type Classificationv6,
 * //   classifyAddress } from "@hertzg/ip";
 * //
 * // function ipClassification(
 * //   ...allowed: (Classificationv4 | Classificationv6)[]
 * // ) {
 * //   const set = new Set(allowed);
 * //   return z.string().refine(
 * //     (val) => set.has(classifyAddress(val).classification),
 * //     { message: `IP must be: ${allowed.join(", ")}` },
 * //   );
 * // }
 * //
 * // const publicIp = ipClassification("public", "global-unicast");
 * // publicIp.parse("8.8.8.8");       // ok
 * // publicIp.parse("192.168.1.1");   // throws: private
 * //
 * // const internalIp = ipClassification("private", "loopback");
 * // internalIp.parse("10.0.0.1");    // ok
 * // internalIp.parse("8.8.8.8");     // throws: public
 * ```
 *
 * ## Sorting
 *
 * @example Sort a mixed dual-stack list of addresses and CIDR blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidr, compareAddress, parseCidr, parseAddress, stringifyAddress, stringifyCidr } from "@hertzg/ip";
 *
 * // All IPv4 sorts before all IPv6, numerically ascending within each version
 * const clients = ["2001:db8::1", "10.0.0.10", "::1", "10.0.0.2"].map((s) => parseAddress(s).address);
 * assertEquals(clients.toSorted(compareAddress).map(stringifyAddress), [
 *   "10.0.0.2",
 *   "10.0.0.10",
 *   "::1",
 *   "2001:db8::1",
 * ]);
 *
 * // CIDR blocks tie-break on prefix length: the larger block comes first
 * const ranges = ["10.0.0.0/16", "2001:db8::/32", "10.0.0.0/8"].map((s) => parseCidr(s));
 * assertEquals(ranges.toSorted(compareCidr).map(stringifyCidr), [
 *   "10.0.0.0/8",
 *   "10.0.0.0/16",
 *   "2001:db8::/32",
 * ]);
 * ```
 *
 * ## Parsing and Stringifying
 *
 * @example Parse and stringify IPv4 and IPv6 addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv4, parseAddressv6, stringifyAddressv4, stringifyAddressv6 } from "@hertzg/ip";
 *
 * // IPv4: string <-> 32-bit number
 * const v4 = parseAddressv4("192.168.1.1").address;
 * assertEquals(v4, 3232235777);
 * assertEquals(stringifyAddressv4(v4), "192.168.1.1");
 * assertEquals(stringifyAddressv4(v4 + 1), "192.168.1.2");
 *
 * // IPv6: string <-> 128-bit bigint
 * const v6 = parseAddressv6("2001:db8::1").address;
 * assertEquals(v6, 42540766411282592856903984951653826561n);
 * assertEquals(stringifyAddressv6(v6), "2001:db8::1");
 * assertEquals(stringifyAddressv6(v6 + 1n), "2001:db8::2");
 * ```
 *
 * ## CIDR Network Boundaries
 *
 * @example Compute network and broadcast addresses from CIDR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidrv4BroadcastAddress,
 *   cidrv4NetworkAddress,
 *   cidrv4Size,
 *   parseCidrv4,
 *   stringifyAddressv4,
 * } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * assertEquals(stringifyAddressv4(cidrv4NetworkAddress(cidr)), "192.168.1.0");
 * assertEquals(stringifyAddressv4(cidrv4BroadcastAddress(cidr)), "192.168.1.255");
 * assertEquals(cidrv4Size(cidr), 256);
 * ```
 *
 * ## Containment Checking
 *
 * @example Check if IPs fall within a CIDR block
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4, parseAddressv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/8");
 *
 * assert(cidrv4Contains(cidr, parseAddressv4("10.0.0.1").address));
 * assert(cidrv4Contains(cidr, parseAddressv4("10.255.255.255").address));
 * assertEquals(cidrv4Contains(cidr, parseAddressv4("11.0.0.0").address), false);
 * ```
 *
 * ## Address Enumeration
 *
 * @example Generate addresses in a CIDR block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4, stringifyAddressv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/29"); // 8 addresses
 *
 * // Iterate all addresses
 * const all = Array.from(cidrv4Addresses(cidr));
 * assertEquals(all.map(stringifyAddressv4), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 *
 * // Skip network address, take first 3 usable
 * const usable = Array.from(cidrv4Addresses(cidr, { offset: 1, count: 3 }));
 * assertEquals(usable.map(stringifyAddressv4), ["10.0.0.1", "10.0.0.2", "10.0.0.3"]);
 * ```
 *
 * ## Wire Bytes
 *
 * @example Decode addresses straight out of a packet buffer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressv4FromBytes, addressv4ToBytes, stringifyAddressv4 } from "@hertzg/ip";
 *
 * // deno-fmt-ignore
 * const packet = new Uint8Array([
 *   0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
 *   0x40, 0x06, 0x00, 0x00,
 *   10, 0, 0, 1,
 *   192, 168, 1, 1,
 * ]);
 *
 * // Read the source and destination fields in place
 * assertEquals(stringifyAddressv4(addressv4FromBytes(packet, 12)), "10.0.0.1");
 * assertEquals(stringifyAddressv4(addressv4FromBytes(packet, 16)), "192.168.1.1");
 *
 * // Rewrite the destination in place; the return is only the bytes written
 * const written = addressv4ToBytes(addressv4FromBytes(packet, 12), packet, 16);
 * assertEquals(written, new Uint8Array([10, 0, 0, 1]));
 * assertEquals(stringifyAddressv4(addressv4FromBytes(packet, 16)), "10.0.0.1");
 * ```
 *
 * ## Reverse DNS
 *
 * The names are relative -- no trailing dot. Append `"."` if a resolver
 * requires an absolute name.
 *
 * @example Build the name a PTR record lives at
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressToArpa, parseAddress } from "@hertzg/ip";
 *
 * assertEquals(addressToArpa(parseAddress("192.168.0.1").address), "1.0.168.192.in-addr.arpa");
 * assertEquals(
 *   addressToArpa(parseAddress("2001:db8::1").address),
 *   "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * ## API Reference
 *
 * ### Universal (auto-detect IPv4/IPv6)
 * - {@link Address}: An IP address of either version (`number` or `bigint`)
 * - {@link ParsedAddress}: What `parseAddress` returns, the address plus an optional zone ID
 * - {@link ParseOptions}: Options for the universal parsers, `unmapToV4`
 * - {@link parseAddress}: Parse any IP address string, with an optional zone ID, to number (IPv4) or bigint (IPv6)
 * - {@link stringifyAddress}: Convert an address, bare or parsed, to IP address string
 * - {@link Cidr}: A CIDR block of either version, in either dialect (prefix length or mask)
 * - {@link ParsedCidr}: What `parseCidr` returns, the block plus an optional zone ID
 * - {@link Mask}: A network mask of either version (`number` or `bigint`)
 * - {@link PrefixLength}: A prefix length of either version
 * - {@link parseCidr}: Parse any CIDR notation string, in either dialect and with an optional zone ID
 * - {@link stringifyCidr}: Convert a Cidr, parse result or address to CIDR notation string, in the dialect it stores
 * - {@link cidrSize}: Get total number of addresses in a CIDR block
 * - {@link cidrFirstAddress}: Get the first address of a CIDR block
 * - {@link cidrLastAddress}: Get the last address of a CIDR block
 * - {@link cidrAddresses}: Generate IP addresses in a CIDR block
 * - {@link cidrContains}: Check if a CIDR block contains an address
 * - {@link cidrContainsCidr}: Check if one CIDR fully contains another
 * - {@link cidrOverlaps}: Check if two CIDRs share at least one address
 * - {@link cidrIntersect}: Return the overlapping CIDR block, or null
 * - {@link cidrSubtract}: Return CIDR blocks in A but not in B
 * - {@link cidrMerge}: Merge CIDR blocks into the minimal covering set
 * - {@link compareAddress}: Compare two IP addresses of either version for sorting
 * - {@link compareCidr}: Compare two CIDR blocks of either version for sorting
 * - {@link isValidAddress}: Check if a string is a valid plain IP address (IPv4 or IPv6)
 * - {@link isValidCidr}: Check if a string is valid CIDR notation (IPv4 or IPv6)
 * - {@link addressVersion}: Report which IP version an address string is written in, or undefined
 * - {@link cidrVersion}: Report which IP version a CIDR string is written in, or undefined
 * - {@link IpVersion}: An IP version number, 4 or 6
 * - {@link classifyAddress}: Classify an IPv4 (number) or IPv6 (bigint) address
 * - {@link ClassifiedAddress}: Discriminated union result with kind, value, and classification
 * - {@link ClassifiedAddressv4}: Result type for IPv4 classification
 * - {@link ClassifiedAddressv6}: Result type for IPv6 classification
 *
 * ### Notation
 * - {@link splitNotation}: Split `address[%zoneId][/prefix]` into its three slots without reading them
 * - {@link Notation}: The three slots as slices
 * - {@link ZoneId}: The zone ID after `%`, a string
 *
 * ### IPv4
 * - {@link Addressv4}: An IPv4 address as a 32-bit unsigned integer
 * - {@link ParsedAddressv4}: What `parseAddressv4` returns, the address plus an optional zone ID
 * - {@link parseAddressv4}: Parse dotted decimal notation, with an optional zone ID, to number
 * - {@link stringifyAddressv4}: Convert an IPv4 address, bare or parsed, to dotted decimal notation
 * - {@link compareAddressv4}: Compare two IPv4 addresses for sorting
 * - {@link isValidAddressv4}: Check if a string is a valid IPv4 address
 *
 * ### IPv4 CIDR
 * - {@link Cidrv4}: Type representing an IPv4 CIDR block, {@link PrefixedCidrv4} or {@link MaskedCidrv4}
 * - {@link Maskv4}: An IPv4 network mask as a 32-bit unsigned integer
 * - {@link PrefixLengthv4}: An IPv4 prefix length, 0 to 32
 * - {@link ParsedCidrv4}: What `parseCidrv4` returns, the block plus an optional zone ID
 * - {@link parseCidrv4}: Parse IPv4 CIDR notation, in either dialect and with an optional zone ID
 * - {@link stringifyCidrv4}: Convert a Cidrv4, parse result or address to CIDR notation string, in the dialect it stores
 * - {@link cidrv4Mask}: Get the network mask of a CIDR block or prefix length (0-32)
 * - {@link cidrv4PrefixLength}: Get the prefix length of a CIDR block or network mask, as a number or notation string
 * - {@link cidrv4Contains}: Check if IP is within CIDR block
 * - {@link cidrv4ContainsCidr}: Check if one IPv4 CIDR fully contains another
 * - {@link cidrv4Overlaps}: Check if two IPv4 CIDRs share at least one address
 * - {@link cidrv4Intersect}: Return the overlapping IPv4 CIDR block, or null
 * - {@link cidrv4Subtract}: Return IPv4 CIDR blocks in A but not in B
 * - {@link cidrv4Merge}: Merge IPv4 CIDR blocks into the minimal covering set
 * - {@link cidrv4FirstAddress}: Get first address in CIDR block
 * - {@link cidrv4LastAddress}: Get last address in CIDR block
 * - {@link cidrv4NetworkAddress}: Get the network address (first address) of a CIDR block
 * - {@link cidrv4BroadcastAddress}: Get the directed broadcast address (last address) of a CIDR block
 * - {@link cidrv4FirstUsableAddress}: Get first assignable address in CIDR block (RFC 3021 aware)
 * - {@link cidrv4LastUsableAddress}: Get last assignable address in CIDR block (RFC 3021 aware)
 * - {@link cidrv4Size}: Get total number of addresses in CIDR block
 * - {@link cidrv4UsableSize}: Get number of assignable addresses in CIDR block
 * - {@link cidrv4Addresses}: Generate IP addresses in CIDR block
 * - {@link cidrv4UsableAddresses}: Generate every assignable address in CIDR block
 * - {@link compareCidrv4}: Compare two IPv4 CIDR blocks for sorting
 * - {@link isValidCidrv4}: Check if a string is valid IPv4 CIDR notation
 *
 * ### IPv6
 * - {@link Addressv6}: An IPv6 address as a 128-bit unsigned bigint
 * - {@link ParsedAddressv6}: What `parseAddressv6` returns, the address plus an optional zone ID
 * - {@link parseAddressv6}: Parse colon-hexadecimal notation, with an optional zone ID, to bigint
 * - {@link stringifyAddressv6}: Convert an IPv6 address, bare or parsed, to compressed colon-hexadecimal
 * - {@link stringifyAddressv6Expanded}: Convert an IPv6 address, bare or parsed, to full uncompressed colon-hexadecimal
 * - {@link compareAddressv6}: Compare two IPv6 addresses for sorting
 * - {@link isValidAddressv6}: Check if a string is a valid IPv6 address
 *
 * ### IPv6 CIDR
 * - {@link Cidrv6}: Type representing an IPv6 CIDR block, {@link PrefixedCidrv6} or {@link MaskedCidrv6}
 * - {@link Maskv6}: An IPv6 network mask as a 128-bit unsigned bigint
 * - {@link PrefixLengthv6}: An IPv6 prefix length, 0 to 128
 * - {@link ParsedCidrv6}: What `parseCidrv6` returns, the block plus an optional zone ID
 * - {@link parseCidrv6}: Parse IPv6 CIDR notation, in either dialect and with an optional zone ID
 * - {@link stringifyCidrv6}: Convert a Cidrv6, parse result or address to CIDR notation string, compressed, in the dialect it stores
 * - {@link stringifyCidrv6Expanded}: The same with the address written in full
 * - {@link cidrv6Mask}: Get the network mask of a CIDR block or prefix length (0-128)
 * - {@link cidrv6PrefixLength}: Get the prefix length of a CIDR block or network mask, as a bigint or notation string
 * - {@link cidrv6Contains}: Check if IP is within CIDR block
 * - {@link cidrv6ContainsCidr}: Check if one IPv6 CIDR fully contains another
 * - {@link cidrv6Overlaps}: Check if two IPv6 CIDRs share at least one address
 * - {@link cidrv6Intersect}: Return the overlapping IPv6 CIDR block, or null
 * - {@link cidrv6Subtract}: Return IPv6 CIDR blocks in A but not in B
 * - {@link cidrv6Merge}: Merge IPv6 CIDR blocks into the minimal covering set
 * - {@link cidrv6FirstAddress}: Get first address in CIDR block
 * - {@link cidrv6LastAddress}: Get last address in CIDR block
 * - {@link cidrv6Size}: Get total number of addresses in CIDR block
 * - {@link cidrv6Addresses}: Generate IP addresses in CIDR block
 * - {@link compareCidrv6}: Compare two IPv6 CIDR blocks for sorting
 * - {@link isValidCidrv6}: Check if a string is valid IPv6 CIDR notation
 *
 * ### IPv4 Classification
 * - {@link Classificationv4}: Type for all IPv4 classification labels
 * - {@link classifyAddressv4}: Classify an IPv4 address into its well-known range
 * - {@link isAddressv4Private}: Check if address is private (RFC 1918)
 * - {@link isAddressv4Loopback}: Check if address is loopback (127.0.0.0/8)
 * - {@link isAddressv4LinkLocal}: Check if address is link-local (169.254.0.0/16)
 * - {@link isAddressv4Multicast}: Check if address is multicast (224.0.0.0/4)
 * - {@link isAddressv4Reserved}: Check if address is reserved (240.0.0.0/4)
 * - {@link isAddressv4Broadcast}: Check if address is broadcast (255.255.255.255)
 * - {@link isAddressv4ThisNetwork}: Check if address is "this network" (0.0.0.0/8)
 * - {@link isAddressv4CgNat}: Check if address is Carrier-Grade NAT (100.64.0.0/10)
 * - {@link isAddressv4Benchmarking}: Check if address is benchmarking (198.18.0.0/15)
 * - {@link isAddressv4Documentation}: Check if address is documentation (RFC 5737)
 * - {@link isAddressv4Public}: Check if address is publicly routable
 *
 * ### IPv6 Classification
 * - {@link Classificationv6}: Type for all IPv6 classification labels
 * - {@link classifyAddressv6}: Classify an IPv6 address into its well-known range
 * - {@link isAddressv6Loopback}: Check if address is loopback (::1)
 * - {@link isAddressv6Unspecified}: Check if address is unspecified (::)
 * - {@link isAddressv6LinkLocal}: Check if address is link-local (fe80::/10)
 * - {@link isAddressv6Multicast}: Check if address is multicast (ff00::/8)
 * - {@link isAddressv6UniqueLocal}: Check if address is unique local (fc00::/7)
 * - {@link isAddressv6GlobalUnicast}: Check if address is global unicast (2000::/3)
 * - {@link isAddressv6Mapped}: Check if address is IPv4-mapped (::ffff:0:0/96)
 * - {@link isAddressv6Translated}: Check if address is IPv4-translated (64:ff9b::/96)
 * - {@link isAddressv6Documentation}: Check if address is documentation (2001:db8::/32)
 * - {@link isAddressv6Teredo}: Check if address is Teredo (2001::/32)
 * - {@link isAddressv6Benchmarking}: Check if address is benchmarking (2001:2::/48)
 * - {@link isAddressv6Orchidv2}: Check if address is ORCHIDv2 (2001:20::/28)
 *
 * ### IPv4-Mapped IPv6 Conversion (addressv6, cidrv6)
 * - {@link mapFromAddressv4}: Convert IPv4 number to IPv4-mapped IPv6 bigint
 * - {@link unmapToAddressv4}: Extract IPv4 number from IPv4-mapped IPv6 bigint
 * - {@link mapFromCidrv4}: Convert IPv4 CIDR to IPv4-mapped IPv6 CIDR
 * - {@link unmapToCidrv4}: Convert IPv4-mapped IPv6 CIDR to IPv4 CIDR
 *
 * ### Universal Wire Byte Conversion (bytes)
 * - {@link addressFromBytes}: Read a 4- or 16-byte address, version from its length
 * - {@link addressToBytes}: Write an address as its wire bytes, width from its type
 *
 * ### IPv4 Wire Byte Conversion (bytesv4)
 * - {@link addressv4FromBytes}: Read a 4-byte IPv4 address from a buffer
 * - {@link addressv4ToBytes}: Write a 4-byte IPv4 address to a buffer
 *
 * ### IPv6 Wire Byte Conversion (bytesv6)
 * - {@link addressv6FromBytes}: Read a 16-byte IPv6 address from a buffer
 * - {@link addressv6ToBytes}: Write a 16-byte IPv6 address to a buffer
 *
 * ### Universal Reverse DNS Pointer Names (arpa)
 * - {@link addressToArpa}: Build the pointer name of an address of either version
 *
 * ### IPv4 Reverse DNS Pointer Names (arpav4)
 * - {@link addressv4ToArpa}: Build the `in-addr.arpa` pointer name of an IPv4 address
 *
 * ### IPv6 Reverse DNS Pointer Names (arpav6)
 * - {@link addressv6ToArpa}: Build the `ip6.arpa` pointer name of an IPv6 address
 *
 * ### Submodules
 * - [`notation`](https://jsr.io/@hertzg/ip/doc/notation): The structural layer of notation via {@link splitNotation}
 * - [`address`](https://jsr.io/@hertzg/ip/doc/address): Universal IP parsing via {@link parseAddress}, {@link stringifyAddress}, {@link compareAddress}
 * - [`cidr`](https://jsr.io/@hertzg/ip/doc/cidr): Universal CIDR parsing via {@link parseCidr}, {@link stringifyCidr}, {@link compareCidr}
 * - [`addressv4`](https://jsr.io/@hertzg/ip/doc/addressv4): IPv4 parsing, sorting, and validation
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): IPv4 CIDR utilities, sorting, and validation
 * - [`addressv6`](https://jsr.io/@hertzg/ip/doc/addressv6): IPv6 parsing, sorting, validation, and IPv4-mapped conversion
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): IPv6 CIDR utilities, sorting, validation, and IPv4-mapped conversion
 * - [`classify`](https://jsr.io/@hertzg/ip/doc/classify): Universal classifier via {@link classifyAddress}
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): IPv4 classification via {@link classifyAddressv4}, {@link isAddressv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): IPv6 classification via {@link classifyAddressv6}, {@link isAddressv6Loopback}, etc.
 * - [`validate`](https://jsr.io/@hertzg/ip/doc/validate): Universal validation via {@link isValidAddress}, {@link isValidCidr}
 * - [`version`](https://jsr.io/@hertzg/ip/doc/version): IP version detection via {@link addressVersion}, {@link cidrVersion}
 * - [`bytes`](https://jsr.io/@hertzg/ip/doc/bytes): Universal wire byte conversion via {@link addressFromBytes}, {@link addressToBytes}
 * - [`bytesv4`](https://jsr.io/@hertzg/ip/doc/bytesv4): IPv4 wire byte conversion via {@link addressv4FromBytes}, {@link addressv4ToBytes}
 * - [`bytesv6`](https://jsr.io/@hertzg/ip/doc/bytesv6): IPv6 wire byte conversion via {@link addressv6FromBytes}, {@link addressv6ToBytes}
 * - [`arpa`](https://jsr.io/@hertzg/ip/doc/arpa): Universal reverse DNS pointer names via {@link addressToArpa}
 * - [`arpav4`](https://jsr.io/@hertzg/ip/doc/arpav4): IPv4 reverse DNS pointer names via {@link addressv4ToArpa}
 * - [`arpav6`](https://jsr.io/@hertzg/ip/doc/arpav6): IPv6 reverse DNS pointer names via {@link addressv6ToArpa}
 *
 * @module
 */

// --- Universal (auto-detect IPv4/IPv6) ---

export {
  /** A plain IP address of either IP version. */
  type Address,
  /** Compare two IP addresses of either version for sorting. */
  compareAddress,
  /** What parseAddress returns: the address and an optional zone ID. */
  type ParsedAddress,
  /** Options for the universal parsers: unmapToV4. */
  type ParseOptions,
  /** Parse any IP address string, with an optional zone ID, to number (IPv4) or bigint (IPv6). */
  parseAddress,
  /** Convert an address, bare or parsed, to IP address string. */
  stringifyAddress,
} from "./address.ts";
export {
  /** The three notation slots as slices of the string. */
  type Notation,
  /** Split notation into address, zone ID and prefix slots. */
  splitNotation,
  /** The zone ID after `%`, a string. */
  type ZoneId,
} from "./notation.ts";
export {
  /** A CIDR block of either IP version. */
  type Cidr,
  /** Generate IP addresses in a CIDR block. */
  cidrAddresses,
  /** Check if a CIDR block contains an address. */
  cidrContains,
  /** Check if one CIDR fully contains another. */
  cidrContainsCidr,
  /** Get the first address of a CIDR block. */
  cidrFirstAddress,
  /** Return the overlapping CIDR block, or null. */
  cidrIntersect,
  /** Get the last address of a CIDR block. */
  cidrLastAddress,
  /** Merge CIDR blocks into the minimal covering set. */
  cidrMerge,
  /** Check if two CIDRs share at least one address. */
  cidrOverlaps,
  /** Get total number of addresses in a CIDR block. */
  cidrSize,
  /** Return CIDR blocks in A but not in B. */
  cidrSubtract,
  /** Compare two CIDR blocks of either version for sorting. */
  compareCidr,
  /** Type guard that checks whether a Cidr is an IPv4 CIDR block. */
  isCidrv4,
  /** Type guard that checks whether a Cidr is an IPv6 CIDR block. */
  isCidrv6,
  /** A network mask of either IP version. */
  type Mask,
  /** Parse any CIDR notation string, in either dialect and with an optional zone ID. */
  parseCidr,
  /** What parseCidr returns: a Cidr in its written dialect and an optional zone ID. */
  type ParsedCidr,
  /** A prefix length of either IP version. */
  type PrefixLength,
  /** Convert a Cidr, parse result or address to CIDR notation string. */
  stringifyCidr,
} from "./cidr.ts";

export {
  /** Type for all IPv4 classification labels. */
  type Classificationv4,
  /** Type for all IPv6 classification labels. */
  type Classificationv6,
  /** Discriminated union result with kind, value, and classification. */
  type ClassifiedAddress,
  /** Result type for IPv4 classification. */
  type ClassifiedAddressv4,
  /** Result type for IPv6 classification. */
  type ClassifiedAddressv6,
  /** Classify an IPv4 (number) or IPv6 (bigint) address. */
  classifyAddress,
} from "./classify.ts";
export {
  /** Check if a string is a valid plain IP address (IPv4 or IPv6). */
  isValidAddress,
  /** Check if a string is valid CIDR notation (IPv4 or IPv6). */
  isValidCidr,
} from "./validate.ts";
export {
  /** Report which IP version an address string is written in, or undefined. */
  addressVersion,
  /** Report which IP version a CIDR string is written in, or undefined. */
  cidrVersion,
  /** An IP version number: 4 for IPv4, 6 for IPv6. */
  type IpVersion,
} from "./version.ts";

// --- IPv4 ---

export {
  /** An IPv4 address as a 32-bit unsigned integer. */
  type Addressv4,
  /** Compare two IPv4 addresses for sorting. */
  compareAddressv4,
  /** Parse dotted decimal notation, with an optional zone ID, to number. */
  parseAddressv4,
  /** What parseAddressv4 returns: the address and an optional zone ID. */
  type ParsedAddressv4,
  /** Convert an IPv4 address, bare or parsed, to dotted decimal notation. */
  stringifyAddressv4,
} from "./addressv4.ts";
export {
  /** Check if a string is a valid IPv4 address. */
  isValidAddressv4,
  /** Check if a string is valid IPv4 CIDR notation. */
  isValidCidrv4,
} from "./validatev4.ts";

export {
  /** Type representing an IPv4 CIDR block. */
  type Cidrv4,
  /** Generate IP addresses in CIDR block. */
  cidrv4Addresses,
  /** Get the directed broadcast address (last address) of a CIDR block. */
  cidrv4BroadcastAddress,
  /** Check if IP is within CIDR block. */
  cidrv4Contains,
  /** Check if one IPv4 CIDR fully contains another. */
  cidrv4ContainsCidr,
  /** Get first address in CIDR block. */
  cidrv4FirstAddress,
  /** Get first assignable address in CIDR block (RFC 3021 aware). */
  cidrv4FirstUsableAddress,
  /** Return the overlapping IPv4 CIDR block, or null. */
  cidrv4Intersect,
  /** Get last address in CIDR block. */
  cidrv4LastAddress,
  /** Get last assignable address in CIDR block (RFC 3021 aware). */
  cidrv4LastUsableAddress,
  /** Get the network mask of a CIDR block or prefix length (0-32). */
  cidrv4Mask,
  /** Merge IPv4 CIDR blocks into the minimal covering set. */
  cidrv4Merge,
  /** Get the network address (first address) of a CIDR block. */
  cidrv4NetworkAddress,
  /** Check if two IPv4 CIDRs share at least one address. */
  cidrv4Overlaps,
  /** Get the prefix length of a CIDR block or network mask, as a number or notation string. */
  cidrv4PrefixLength,
  /** Get total number of addresses in CIDR block. */
  cidrv4Size,
  /** Return IPv4 CIDR blocks in A but not in B. */
  cidrv4Subtract,
  /** Generate every assignable address in CIDR block. */
  cidrv4UsableAddresses,
  /** Get number of assignable addresses in CIDR block. */
  cidrv4UsableSize,
  /** Compare two IPv4 CIDR blocks for sorting. */
  compareCidrv4,
  /** An IPv4 CIDR block written with a network mask. */
  type MaskedCidrv4,
  /** An IPv4 network mask as a 32-bit unsigned integer. */
  type Maskv4,
  /** Parse IPv4 CIDR notation, in either dialect and with an optional zone ID. */
  parseCidrv4,
  /** What parseCidrv4 returns: a Cidrv4 in its written dialect and an optional zone ID. */
  type ParsedCidrv4,
  /** An IPv4 CIDR block written with a prefix length. */
  type PrefixedCidrv4,
  /** An IPv4 prefix length, 0 to 32. */
  type PrefixLengthv4,
  /** Convert a Cidrv4, parse result or IPv4 address to CIDR notation string. */
  stringifyCidrv4,
} from "./cidrv4.ts";

export {
  /** Classify an IPv4 address into its well-known range. */
  classifyAddressv4,
  /** Check if address is benchmarking (198.18.0.0/15). */
  isAddressv4Benchmarking,
  /** Check if address is broadcast (255.255.255.255). */
  isAddressv4Broadcast,
  /** Check if address is Carrier-Grade NAT (100.64.0.0/10). */
  isAddressv4CgNat,
  /** Check if address is documentation (RFC 5737). */
  isAddressv4Documentation,
  /** Check if address is link-local (169.254.0.0/16). */
  isAddressv4LinkLocal,
  /** Check if address is loopback (127.0.0.0/8). */
  isAddressv4Loopback,
  /** Check if address is multicast (224.0.0.0/4). */
  isAddressv4Multicast,
  /** Check if address is private (RFC 1918). */
  isAddressv4Private,
  /** Check if address is publicly routable. */
  isAddressv4Public,
  /** Check if address is reserved (240.0.0.0/4). */
  isAddressv4Reserved,
  /** Check if address is "this network" (0.0.0.0/8). */
  isAddressv4ThisNetwork,
} from "./classifyv4.ts";

// --- IPv6 ---

export {
  /** An IPv6 address as a 128-bit unsigned bigint. */
  type Addressv6,
  /** Compare two IPv6 addresses for sorting. */
  compareAddressv6,
  /** Convert IPv4 number to IPv4-mapped IPv6 bigint. */
  mapFromAddressv4,
  /** Parse colon-hexadecimal notation, with an optional zone ID, to bigint. */
  parseAddressv6,
  /** What parseAddressv6 returns: the address and an optional zone ID. */
  type ParsedAddressv6,
  /** Convert an IPv6 address, bare or parsed, to compressed colon-hexadecimal. */
  stringifyAddressv6,
  /** Convert an IPv6 address, bare or parsed, to full uncompressed colon-hexadecimal. */
  stringifyAddressv6Expanded,
  /** Extract IPv4 number from IPv4-mapped IPv6 bigint. */
  unmapToAddressv4,
} from "./addressv6.ts";
export {
  /** Check if a string is a valid IPv6 address. */
  isValidAddressv6,
  /** Check if a string is valid IPv6 CIDR notation. */
  isValidCidrv6,
} from "./validatev6.ts";

export {
  /** Type representing an IPv6 CIDR block. */
  type Cidrv6,
  /** Generate IP addresses in CIDR block. */
  cidrv6Addresses,
  /** Check if IP is within CIDR block. */
  cidrv6Contains,
  /** Check if one IPv6 CIDR fully contains another. */
  cidrv6ContainsCidr,
  /** Get first address in CIDR block. */
  cidrv6FirstAddress,
  /** Return the overlapping IPv6 CIDR block, or null. */
  cidrv6Intersect,
  /** Get last address in CIDR block. */
  cidrv6LastAddress,
  /** Get the network mask of a CIDR block or prefix length (0-128). */
  cidrv6Mask,
  /** Merge IPv6 CIDR blocks into the minimal covering set. */
  cidrv6Merge,
  /** Check if two IPv6 CIDRs share at least one address. */
  cidrv6Overlaps,
  /** Get the prefix length of a CIDR block or network mask, as a bigint or notation string. */
  cidrv6PrefixLength,
  /** Get total number of addresses in CIDR block. */
  cidrv6Size,
  /** Return IPv6 CIDR blocks in A but not in B. */
  cidrv6Subtract,
  /** Compare two IPv6 CIDR blocks for sorting. */
  compareCidrv6,
  /** Convert IPv4 CIDR to IPv4-mapped IPv6 CIDR. */
  mapFromCidrv4,
  /** An IPv6 CIDR block written with a network mask. */
  type MaskedCidrv6,
  /** An IPv6 network mask as a 128-bit unsigned bigint. */
  type Maskv6,
  /** Parse IPv6 CIDR notation, in either dialect and with an optional zone ID. */
  parseCidrv6,
  /** What parseCidrv6 returns: a Cidrv6 in its written dialect and an optional zone ID. */
  type ParsedCidrv6,
  /** An IPv6 CIDR block written with a prefix length. */
  type PrefixedCidrv6,
  /** An IPv6 prefix length, 0 to 128. */
  type PrefixLengthv6,
  /** Convert a Cidrv6, parse result or IPv6 address to CIDR notation string, compressed. */
  stringifyCidrv6,
  /** Convert a Cidrv6, parse result or IPv6 address to CIDR notation string, expanded. */
  stringifyCidrv6Expanded,
  /** Convert IPv4-mapped IPv6 CIDR to IPv4 CIDR. */
  unmapToCidrv4,
} from "./cidrv6.ts";

export {
  /** Classify an IPv6 address into its well-known range. */
  classifyAddressv6,
  /** Check if address is benchmarking (2001:2::/48). */
  isAddressv6Benchmarking,
  /** Check if address is documentation (2001:db8::/32). */
  isAddressv6Documentation,
  /** Check if address is global unicast (2000::/3). */
  isAddressv6GlobalUnicast,
  /** Check if address is link-local (fe80::/10). */
  isAddressv6LinkLocal,
  /** Check if address is loopback (::1). */
  isAddressv6Loopback,
  /** Check if address is IPv4-mapped (::ffff:0:0/96). */
  isAddressv6Mapped,
  /** Check if address is multicast (ff00::/8). */
  isAddressv6Multicast,
  /** Check if address is ORCHIDv2 (2001:20::/28). */
  isAddressv6Orchidv2,
  /** Check if address is Teredo (2001::/32). */
  isAddressv6Teredo,
  /** Check if address is IPv4-translated (64:ff9b::/96). */
  isAddressv6Translated,
  /** Check if address is unique local (fc00::/7). */
  isAddressv6UniqueLocal,
  /** Check if address is unspecified (::). */
  isAddressv6Unspecified,
} from "./classifyv6.ts";

// --- Wire byte conversion ---

export {
  /** Read a 4- or 16-byte address, picking the version from its length. */
  addressFromBytes,
  /** Write an address as its wire bytes, 4 for IPv4 and 16 for IPv6. */
  addressToBytes,
} from "./bytes.ts";
export {
  /** Read a 4-byte IPv4 address from a buffer. */
  addressv4FromBytes,
  /** Write a 4-byte IPv4 address to a buffer. */
  addressv4ToBytes,
} from "./bytesv4.ts";
export {
  /** Read a 16-byte IPv6 address from a buffer. */
  addressv6FromBytes,
  /** Write a 16-byte IPv6 address to a buffer. */
  addressv6ToBytes,
} from "./bytesv6.ts";

// --- Reverse DNS pointer names ---

export {
  /** Build the reverse DNS pointer name of an address of either version. */
  addressToArpa,
} from "./arpa.ts";
export {
  /** Build the `in-addr.arpa` pointer name of an IPv4 address. */
  addressv4ToArpa,
} from "./arpav4.ts";
export {
  /** Build the `ip6.arpa` pointer name of an IPv6 address. */
  addressv6ToArpa,
} from "./arpav6.ts";
