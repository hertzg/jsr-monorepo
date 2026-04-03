# Changelog

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
