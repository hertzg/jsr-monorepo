# Changelog

## [5.0.1](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v5.0.0...@hertzg/ip-v5.0.1) (2026-08-19)


### Bug Fixes

* **@hertzg/ip:** lead docs with the SSRF-guard use case ([#298](https://github.com/hertzg/jsr-monorepo/issues/298)) ([df93e4a](https://github.com/hertzg/jsr-monorepo/commit/df93e4a3dd7654ed897eb393af70a53dfcdb5453))

## [5.0.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v4.2.0...@hertzg/ip-v5.0.0) (2026-08-17)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** `parseAddress*` return `{ address, zoneId? }` and `parseCidr*` return `Cidr & { zoneId? }` instead of the bare value. `parseAddress` and `parseCidr` take a second `options` argument, so `.map(parseCidr)` becomes `.map((s) => parseCidr(s))`. `expandIpv6` and `compressIpv6` are removed. `parseAddressv6("fe80::1%")`, `"fe80::1%eth0%1"`, `parseCidrv6("fe80::/64%eth0")` and `"fe80::%/64"` now throw; `parseAddressv4("192.168.1.1%eth0")` and `parseCidr("10.0.0.0/255.0.0.0")` now parse.
* **@hertzg/ip:** `Cidrv4` and `Cidrv6` are unions; `.prefixLength` is no longer a property of every block, read it with `cidrv4PrefixLength(cidr)` or narrow with `"prefixLength" in cidr`. The universal `cidrContainsCidr`, `cidrOverlaps`, `cidrIntersect` and `cidrSubtract` are overloaded per version instead of generic over one CIDR type.
* **@hertzg/ip:** every Ip-named export is renamed to its Address counterpart, the ./ip, ./ipv4, ./ipv6 and ./4to6 entrypoints are replaced by ./address, ./addressv4, ./addressv6, and the root parse / stringify / AddressOrCidr are removed.
* **@hertzg/ip:** parseIpv4, parseIpv6, parseCidrv4 and parseCidrv6 now reject input the RFC grammar does not allow. Sixteen IPv6 forms that previously parsed now throw TypeError, including "1:2:3:4:5:6:7:8::", "0x12::1" and "::1 ". parseIpv6("::-1") returned -1n and now throws. Prefix lengths no longer accept leading zeros. isValidIpv4 and isValidIpv6 return false for all of these.

### Features

* **@hertzg/ip:** add cidrContains ([#269](https://github.com/hertzg/jsr-monorepo/issues/269)) ([31a3403](https://github.com/hertzg/jsr-monorepo/commit/31a34039b556910d07516676d912c30686a1b5cf)), closes [#263](https://github.com/hertzg/jsr-monorepo/issues/263)
* **@hertzg/ip:** add cidrv4MaskToPrefixLength and cidrv6MaskToPrefixLength ([98df515](https://github.com/hertzg/jsr-monorepo/commit/98df5151a4cd99bbe293f1325db8ebde6ba4e21a)), closes [#264](https://github.com/hertzg/jsr-monorepo/issues/264)
* **@hertzg/ip:** add compareIp and compareCidr ([#273](https://github.com/hertzg/jsr-monorepo/issues/273)) ([1d0c6f6](https://github.com/hertzg/jsr-monorepo/commit/1d0c6f6fc336ee3b24a2ae29c9227f8d61c9212e)), closes [#266](https://github.com/hertzg/jsr-monorepo/issues/266)
* **@hertzg/ip:** add IPv4 usable-address helpers and universal block bounds ([4d9861f](https://github.com/hertzg/jsr-monorepo/commit/4d9861fbbc70e99163ecd9e4f0ad849e613b5e72)), closes [#268](https://github.com/hertzg/jsr-monorepo/issues/268)
* **@hertzg/ip:** add ipVersion and cidrVersion ([#274](https://github.com/hertzg/jsr-monorepo/issues/274)) ([c2ff649](https://github.com/hertzg/jsr-monorepo/commit/c2ff64907aa3299f1277559ca1f073dbcab8b9a2))
* **@hertzg/ip:** add reverse DNS pointer names (in-addr.arpa / ip6.arpa) ([#287](https://github.com/hertzg/jsr-monorepo/issues/287)) ([5fd4362](https://github.com/hertzg/jsr-monorepo/commit/5fd4362df99e20cfba15b617871302e9aade5a5c)), closes [#277](https://github.com/hertzg/jsr-monorepo/issues/277)
* **@hertzg/ip:** layered notation parser with zone IDs and mask dialect ([#295](https://github.com/hertzg/jsr-monorepo/issues/295)) ([dafadec](https://github.com/hertzg/jsr-monorepo/commit/dafadecf397fb527a45a5af22021048b76353e66))
* **@hertzg/ip:** precompute IPv6 mask and size tables ([#279](https://github.com/hertzg/jsr-monorepo/issues/279)) ([0aa06e5](https://github.com/hertzg/jsr-monorepo/commit/0aa06e516555b3d8c3c0a89060e53a311a60206a))
* **@hertzg/ip:** rename Ip-named values to Address ([#293](https://github.com/hertzg/jsr-monorepo/issues/293)) ([5833a75](https://github.com/hertzg/jsr-monorepo/commit/5833a756410408e5ca867d183d2e5bc4ea823885))
* **@hertzg/ip:** store CIDR masks as a second dialect of Cidr ([#294](https://github.com/hertzg/jsr-monorepo/issues/294)) ([3ac4636](https://github.com/hertzg/jsr-monorepo/commit/3ac4636b88443732d4b745128f53422d359b75f4))


### Bug Fixes

* **@hertzg/ip:** reject addresses outside the RFC 4291 grammar; single-pass IPv6 scan ([#288](https://github.com/hertzg/jsr-monorepo/issues/288)) ([12003fc](https://github.com/hertzg/jsr-monorepo/commit/12003fc158f3cc8440de29d964c51c4f4598c9d3))

## [4.2.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v4.1.1...@hertzg/ip-v4.2.0) (2026-08-13)


### Features

* **@hertzg/ip:** add CIDR and prefix length glossary entries ([#258](https://github.com/hertzg/jsr-monorepo/issues/258)) ([9f10155](https://github.com/hertzg/jsr-monorepo/commit/9f10155287a521024bb5895d9066e3dd36f9eefd)), closes [#246](https://github.com/hertzg/jsr-monorepo/issues/246)
* **@hertzg/ip:** name the address and address-or-CIDR union types ([#253](https://github.com/hertzg/jsr-monorepo/issues/253)) ([6d079dc](https://github.com/hertzg/jsr-monorepo/commit/6d079dc4e3d465b8a01c9a75b99b08a539c738b6))


### Bug Fixes

* **@hertzg/ip:** name address parameters `address` ([#245](https://github.com/hertzg/jsr-monorepo/issues/245)) ([e75ac37](https://github.com/hertzg/jsr-monorepo/commit/e75ac3794091091e0cbacecd4ab5961d10821471))

## [4.1.1](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v4.1.0...@hertzg/ip-v4.1.1) (2026-08-02)


### Bug Fixes

* **@hertzg/ip, @hertzg/crc, @hertzg/mymagti-api:** document public symbols for jsr score ([#217](https://github.com/hertzg/jsr-monorepo/issues/217)) ([090e16e](https://github.com/hertzg/jsr-monorepo/commit/090e16eb744f21f51a836002426543a5be987d79))

## [4.1.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v4.0.0...@hertzg/ip-v4.1.0) (2026-04-30)


### Features

* **@hertzg/ip:** document cidrv4Addresses, cidrv6Addresses, Size overloads, and alias return types ([#159](https://github.com/hertzg/jsr-monorepo/issues/159)) ([7a6b109](https://github.com/hertzg/jsr-monorepo/commit/7a6b1099d00b23c824b564ac571f7e92d607f9a0))

## [4.0.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v3.3.0...@hertzg/ip-v4.0.0) (2026-04-06)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** parseCidr("::ffff:192.168.1.0/120") now returns Cidrv4 { address: 3232235776, prefixLength: 24 } instead of Cidrv6. Use parseCidrv6 directly to preserve the IPv6 representation.

### Features

* **@hertzg/ip:** add JSDoc for Cidr type alias and isCidrv4/isCidrv6 type guards ([cf69ee4](https://github.com/hertzg/jsr-monorepo/commit/cf69ee433c9fb6ca036e22716c61f2c56e4ddfd1))
* **@hertzg/ip:** re-export Cidrv4/Cidrv6 types from universal cidr module ([cac7e1f](https://github.com/hertzg/jsr-monorepo/commit/cac7e1f63483747405d400b4b27ad28dd7c1ec7c))
* **@hertzg/ip:** remove stale type casts from JSDoc examples ([fa7243b](https://github.com/hertzg/jsr-monorepo/commit/fa7243bb14fe558b42c525e3e593ea79c2e7ba95))
* **@hertzg/ip:** unwrap IPv4-mapped IPv6 CIDRs in parseCidr ([97ea931](https://github.com/hertzg/jsr-monorepo/commit/97ea9319eb297804969597e554c9025131cd4eb8))

## [3.3.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v3.2.0...@hertzg/ip-v3.3.0) (2026-04-06)


### Features

* **@hertzg/ip:** add universal parse and stringify functions ([038bbf4](https://github.com/hertzg/jsr-monorepo/commit/038bbf4874a29ca4cb1310e4297723c268b548d4))

## [3.2.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v3.1.0...@hertzg/ip-v3.2.0) (2026-04-06)


### Features

* **@hertzg/ip:** add universal cidrSize and cidrAddresses wrappers ([b35d0a8](https://github.com/hertzg/jsr-monorepo/commit/b35d0a88920d4973e771d45727d1c22727cf7232))

## [3.1.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v3.0.0...@hertzg/ip-v3.1.0) (2026-04-05)


### Features

* **@hertzg/ip:** add CIDR containment and overlap checking ([#149](https://github.com/hertzg/jsr-monorepo/issues/149)) ([51f7320](https://github.com/hertzg/jsr-monorepo/commit/51f732024562836b22e50b351a809984bbf17106))
* **@hertzg/ip:** add CIDR subtract, intersect, and merge ([#150](https://github.com/hertzg/jsr-monorepo/issues/150)) ([8dc95b6](https://github.com/hertzg/jsr-monorepo/commit/8dc95b60fafbd0b7a5327854c2738cc449253b0e))
* **@hertzg/ip:** re-export ClassificationIpv4/Ipv6 from classify and rewrite mod.ts examples ([e2b76ae](https://github.com/hertzg/jsr-monorepo/commit/e2b76ae70e807995fa3a8bf9c3335400b0f38964))

## [3.0.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v2.0.0...@hertzg/ip-v3.0.0) (2026-04-04)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** parseIp("::ffff:192.168.1.1") now returns 3232235777 (number) instead of 0xFFFF_C0A8_0101n (bigint).
* **@hertzg/ip:** validateIp and ValidateIpResult are removed. Use classifyIp for parse-and-identify workflows. isValidIp now only accepts plain IP addresses — use isValidCidr for CIDR notation.
* **@hertzg/ip:** classifyIp now returns { kind: "ipv4" | "ipv6", value, classification } instead of { version: 4 | 6, kind }. The new types are ClassifiedIp, ClassifiedIpv4, and ClassifiedIpv6. The old ClassifyIpResult type is removed.
* **@hertzg/ip:** ClassifyIpv4Result is now ClassificationIpv4, ClassifyIpv6Result is now ClassificationIpv6. The new names better distinguish the label union from the full result object types.

### Features

* **@hertzg/ip:** add IPv4-mapped IPv6 conversion module (4to6) ([a918aca](https://github.com/hertzg/jsr-monorepo/commit/a918aca2a8162eac6da0a860086344e8451ab152))
* **@hertzg/ip:** add public classifyIp overload for number | bigint ([#144](https://github.com/hertzg/jsr-monorepo/issues/144)) ([e52c5fd](https://github.com/hertzg/jsr-monorepo/commit/e52c5fd3ceeee7fef1f7034c6ee4d682340b9c82))
* **@hertzg/ip:** add string overload to classifyIp ([#147](https://github.com/hertzg/jsr-monorepo/issues/147)) ([7438bed](https://github.com/hertzg/jsr-monorepo/commit/7438bed9d02e214001b1377b075b391962a92501))
* **@hertzg/ip:** auto-unwrap IPv4-mapped IPv6 in parseIp ([8aa51ba](https://github.com/hertzg/jsr-monorepo/commit/8aa51baa1355e7d5cd3a07204e0ec090db737e45))
* **@hertzg/ip:** enhance cidrv4 and cidrv6 size functions with additional overloads ([562f5b7](https://github.com/hertzg/jsr-monorepo/commit/562f5b7e1d1689eeb9accb79a5f4d8e85659d93b))
* **@hertzg/ip:** move validation functions to dedicated validatev4 and validatev6 modules ([#146](https://github.com/hertzg/jsr-monorepo/issues/146)) ([243cdf2](https://github.com/hertzg/jsr-monorepo/commit/243cdf2f2c421e84d74d3ae5ddd303ffa5adda66))
* **@hertzg/ip:** remove validateIp and fix isValidIp to reject CIDRs ([b56f441](https://github.com/hertzg/jsr-monorepo/commit/b56f441dff0bff806db0b3368e3fe24370e868d6))
* **@hertzg/ip:** rename ClassifyIpv4Result and ClassifyIpv6Result ([268ba29](https://github.com/hertzg/jsr-monorepo/commit/268ba295ca4ee67c3063fd5fceb1002f6887909e))
* **@hertzg/ip:** reshape classifyIp result to include kind, value, and classification ([8dda688](https://github.com/hertzg/jsr-monorepo/commit/8dda688f8172bf8c249208ea11d4f9f3d80eecc7))


### Bug Fixes

* **@hertzg/ip:** use cidrContains for classify range checks ([3e8eae6](https://github.com/hertzg/jsr-monorepo/commit/3e8eae6cf06c176e1159955a5c6a1773bb33c4bd))

## [2.0.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v1.0.0...@hertzg/ip-v2.0.0) (2026-04-03)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** classifyIp now returns { version: 4 | 6, kind: string } instead of a plain string, ClassifyIpResult is now a discriminated union on version
* **@hertzg/ip:** IpValidationResult renamed to ValidateIpResult, kind discriminants "cidr4" and "cidr6" renamed to "cidrv4" and "cidrv6"
* **@hertzg/ip:** Ipv4Classification renamed to ClassifyIpv4Result, Ipv6Classification renamed to ClassifyIpv6Result, IpClassification renamed to ClassifyIpResult
* **@hertzg/ip:** Cidr6 renamed to Cidrv6, parseCidr6 to parseCidrv6, stringifyCidr6 to stringifyCidrv6, cidr6Contains to cidrv6Contains, cidr6FirstAddress to cidrv6FirstAddress, cidr6LastAddress to cidrv6LastAddress, cidr6Size to cidrv6Size, cidr6Addresses to cidrv6Addresses, isValidCidr6 to isValidCidrv6
* **@hertzg/ip:** Cidr4 renamed to Cidrv4, parseCidr4 to parseCidrv4, stringifyCidr4 to stringifyCidrv4, cidr4Contains to cidrv4Contains, cidr4FirstAddress to cidrv4FirstAddress, cidr4LastAddress to cidrv4LastAddress, cidr4NetworkAddress to cidrv4NetworkAddress, cidr4BroadcastAddress to cidrv4BroadcastAddress, cidr4Size to cidrv4Size, cidr4Addresses to cidrv4Addresses, isValidCidr4 to isValidCidrv4
* **@hertzg/ip:** mask4FromPrefixLength renamed to cidrv4Mask, mask6FromPrefixLength renamed to cidrv6Mask

### Features

* **@hertzg/ip:** add IPv4/IPv6 address classification and bitwise JSDoc examples ([#142](https://github.com/hertzg/jsr-monorepo/issues/142)) ([0ea5744](https://github.com/hertzg/jsr-monorepo/commit/0ea57441818d3ae12c6a215b2e6f38a52e3cb50c))
* **@hertzg/ip:** add validation functions ([#143](https://github.com/hertzg/jsr-monorepo/issues/143)) ([b113be5](https://github.com/hertzg/jsr-monorepo/commit/b113be5519624d9a295e472f64c327fe74d6ae81))
* **@hertzg/ip:** rename Cidr4 to Cidrv4 and all cidr4 prefixed functions to cidrv4 ([0f5d3f1](https://github.com/hertzg/jsr-monorepo/commit/0f5d3f1f669cba35693402e30aacd532a0f1d305))
* **@hertzg/ip:** rename Cidr6 to Cidrv6 and all cidr6 prefixed functions to cidrv6 ([e8ccc65](https://github.com/hertzg/jsr-monorepo/commit/e8ccc65bbdfa33d9f2e6a1dd3121b0e552775c33))
* **@hertzg/ip:** rename classification result types for consistency ([452f82f](https://github.com/hertzg/jsr-monorepo/commit/452f82ff46f9b703c94319a5a51d88462eadca49))
* **@hertzg/ip:** rename mask functions to cidrv4Mask and cidrv6Mask ([bef021a](https://github.com/hertzg/jsr-monorepo/commit/bef021a1c3b09e3ad0434692f7aec72bcb59c307))
* **@hertzg/ip:** rename ValidateIpResult and update CIDR kind discriminants ([9827b19](https://github.com/hertzg/jsr-monorepo/commit/9827b19c7dc1be07bead1155291f821689781016))
* **@hertzg/ip:** return version and kind from classifyIp ([c4d9f08](https://github.com/hertzg/jsr-monorepo/commit/c4d9f08109c4218becd709ee9cbf935a8adb2d14))

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@hertzg/ip-v0.3.0...@hertzg/ip-v1.0.0) (2026-04-03)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** add IPv6 support with feature parity to IPv4 ([#75](https://github.com/hertzg/jsr-monorepo/issues/75))

### Features

* **@hertzg/ip:** add cidr4Size and cidr6Size functions ([#99](https://github.com/hertzg/jsr-monorepo/issues/99)) ([0d113dc](https://github.com/hertzg/jsr-monorepo/commit/0d113dcfd5cc29c5ddfdbf812f6aeff03fc29569))
* **@hertzg/ip:** add IPv6 support with feature parity to IPv4 ([#75](https://github.com/hertzg/jsr-monorepo/issues/75)) ([1365435](https://github.com/hertzg/jsr-monorepo/commit/1365435aebbd37a87762ec9abd27dfb5992ebc21))
