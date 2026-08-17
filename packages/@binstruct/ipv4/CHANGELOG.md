# Changelog

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/ipv4-v0.3.0...@binstruct/ipv4-v1.0.0) (2026-08-17)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** `parseAddress*` return `{ address, zoneId? }` and `parseCidr*` return `Cidr & { zoneId? }` instead of the bare value. `parseAddress` and `parseCidr` take a second `options` argument, so `.map(parseCidr)` becomes `.map((s) => parseCidr(s))`. `expandIpv6` and `compressIpv6` are removed. `parseAddressv6("fe80::1%")`, `"fe80::1%eth0%1"`, `parseCidrv6("fe80::/64%eth0")` and `"fe80::%/64"` now throw; `parseAddressv4("192.168.1.1%eth0")` and `parseCidr("10.0.0.0/255.0.0.0")` now parse.
* **@hertzg/ip:** every Ip-named export is renamed to its Address counterpart, the ./ip, ./ipv4, ./ipv6 and ./4to6 entrypoints are replaced by ./address, ./addressv4, ./addressv6, and the root parse / stringify / AddressOrCidr are removed.

### Features

* **@hertzg/ip:** layered notation parser with zone IDs and mask dialect ([#295](https://github.com/hertzg/jsr-monorepo/issues/295)) ([dafadec](https://github.com/hertzg/jsr-monorepo/commit/dafadecf397fb527a45a5af22021048b76353e66))
* **@hertzg/ip:** rename Ip-named values to Address ([#293](https://github.com/hertzg/jsr-monorepo/issues/293)) ([5833a75](https://github.com/hertzg/jsr-monorepo/commit/5833a756410408e5ca867d183d2e5bc4ea823885))

## [0.3.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/ipv4-v0.2.0...@binstruct/ipv4-v0.3.0) (2026-05-01)


### Features

* **@binstruct/inet:** inet stack coder (Ethernet→IPv4→UDP/ICMP/ARP) + RFC 1071 checksum, plus protocol-package cleanup ([#171](https://github.com/hertzg/jsr-monorepo/issues/171)) ([34ffc58](https://github.com/hertzg/jsr-monorepo/commit/34ffc587c0c4d04b5cf2605d05476413acec4e13))

## [0.2.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/ipv4-v0.1.0...@binstruct/ipv4-v0.2.0) (2026-04-30)


### Features

* **@binstruct/ipv4:** add IPv4 header package ([#160](https://github.com/hertzg/jsr-monorepo/issues/160)) ([4633043](https://github.com/hertzg/jsr-monorepo/commit/46330433e41df9c95227df7b495381b2e74ff720))
* **@binstruct/ipv4:** expose ipv4 sub-coder factories ([0cf1c0c](https://github.com/hertzg/jsr-monorepo/commit/0cf1c0c9a1ae881a0910d9f6bdccc0e5c0e859bd))
