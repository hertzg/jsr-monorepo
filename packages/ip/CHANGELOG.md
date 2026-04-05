# Changelog

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
