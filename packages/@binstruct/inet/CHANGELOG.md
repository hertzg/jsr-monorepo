# Changelog

## [2.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/inet-v1.0.0...@binstruct/inet-v2.0.0) (2026-08-17)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** `parseAddress*` return `{ address, zoneId? }` and `parseCidr*` return `Cidr & { zoneId? }` instead of the bare value. `parseAddress` and `parseCidr` take a second `options` argument, so `.map(parseCidr)` becomes `.map((s) => parseCidr(s))`. `expandIpv6` and `compressIpv6` are removed. `parseAddressv6("fe80::1%")`, `"fe80::1%eth0%1"`, `parseCidrv6("fe80::/64%eth0")` and `"fe80::%/64"` now throw; `parseAddressv4("192.168.1.1%eth0")` and `parseCidr("10.0.0.0/255.0.0.0")` now parse.
* **@hertzg/ip:** every Ip-named export is renamed to its Address counterpart, the ./ip, ./ipv4, ./ipv6 and ./4to6 entrypoints are replaced by ./address, ./addressv4, ./addressv6, and the root parse / stringify / AddressOrCidr are removed.

### Features

* **@hertzg/ip:** layered notation parser with zone IDs and mask dialect ([#295](https://github.com/hertzg/jsr-monorepo/issues/295)) ([dafadec](https://github.com/hertzg/jsr-monorepo/commit/dafadecf397fb527a45a5af22021048b76353e66))
* **@hertzg/ip:** rename Ip-named values to Address ([#293](https://github.com/hertzg/jsr-monorepo/issues/293)) ([5833a75](https://github.com/hertzg/jsr-monorepo/commit/5833a756410408e5ca867d183d2e5bc4ea823885))

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/inet-v0.3.0...@binstruct/inet-v1.0.0) (2026-08-02)


### ⚠ BREAKING CHANGES

* **@binstruct/inet:** wire protocol packages into the inet encapsulation stack ([#215](https://github.com/hertzg/jsr-monorepo/issues/215))

### Features

* **@binstruct/inet:** wire protocol packages into the inet encapsulation stack ([#215](https://github.com/hertzg/jsr-monorepo/issues/215)) ([90e6c53](https://github.com/hertzg/jsr-monorepo/commit/90e6c532c9ad7eddf145204146d1614f32b98b51))

## [0.3.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/inet-v0.2.0...@binstruct/inet-v0.3.0) (2026-05-02)


### Features

* **@binstruct/tcp:** TCP segment coder + inet wiring ([#175](https://github.com/hertzg/jsr-monorepo/issues/175)) ([6550174](https://github.com/hertzg/jsr-monorepo/commit/6550174469f75e03a5ebc3a7f5a27b279959f6f4))

## [0.2.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/inet-v0.1.0...@binstruct/inet-v0.2.0) (2026-05-01)


### Features

* **@binstruct/inet:** inet stack coder (Ethernet→IPv4→UDP/ICMP/ARP) + RFC 1071 checksum, plus protocol-package cleanup ([#171](https://github.com/hertzg/jsr-monorepo/issues/171)) ([34ffc58](https://github.com/hertzg/jsr-monorepo/commit/34ffc587c0c4d04b5cf2605d05476413acec4e13))
