# Changelog

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/ipv6-v0.1.0...@binstruct/ipv6-v1.0.0) (2026-08-17)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** `parseAddress*` return `{ address, zoneId? }` and `parseCidr*` return `Cidr & { zoneId? }` instead of the bare value. `parseAddress` and `parseCidr` take a second `options` argument, so `.map(parseCidr)` becomes `.map((s) => parseCidr(s))`. `expandIpv6` and `compressIpv6` are removed. `parseAddressv6("fe80::1%")`, `"fe80::1%eth0%1"`, `parseCidrv6("fe80::/64%eth0")` and `"fe80::%/64"` now throw; `parseAddressv4("192.168.1.1%eth0")` and `parseCidr("10.0.0.0/255.0.0.0")` now parse.
* **@hertzg/ip:** every Ip-named export is renamed to its Address counterpart, the ./ip, ./ipv4, ./ipv6 and ./4to6 entrypoints are replaced by ./address, ./addressv4, ./addressv6, and the root parse / stringify / AddressOrCidr are removed.

### Features

* **@hertzg/ip:** layered notation parser with zone IDs and mask dialect ([#295](https://github.com/hertzg/jsr-monorepo/issues/295)) ([dafadec](https://github.com/hertzg/jsr-monorepo/commit/dafadecf397fb527a45a5af22021048b76353e66))
* **@hertzg/ip:** rename Ip-named values to Address ([#293](https://github.com/hertzg/jsr-monorepo/issues/293)) ([5833a75](https://github.com/hertzg/jsr-monorepo/commit/5833a756410408e5ca867d183d2e5bc4ea823885))

## [0.1.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/ipv6-v0.0.1...@binstruct/ipv6-v0.1.0) (2026-08-02)


### Features

* **@binstruct/ipv6:** add ipv6 fixed header coder ([#197](https://github.com/hertzg/jsr-monorepo/issues/197)) ([a0d3e78](https://github.com/hertzg/jsr-monorepo/commit/a0d3e78469aa0bee5703949e79dec2e650a5586f))
