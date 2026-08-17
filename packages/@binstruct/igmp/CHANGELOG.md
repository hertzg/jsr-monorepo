# Changelog

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/igmp-v0.1.0...@binstruct/igmp-v1.0.0) (2026-08-17)


### ⚠ BREAKING CHANGES

* **@hertzg/ip:** every Ip-named export is renamed to its Address counterpart, the ./ip, ./ipv4, ./ipv6 and ./4to6 entrypoints are replaced by ./address, ./addressv4, ./addressv6, and the root parse / stringify / AddressOrCidr are removed.

### Features

* **@hertzg/ip:** rename Ip-named values to Address ([#293](https://github.com/hertzg/jsr-monorepo/issues/293)) ([5833a75](https://github.com/hertzg/jsr-monorepo/commit/5833a756410408e5ca867d183d2e5bc4ea823885))

## [0.1.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/igmp-v0.0.1...@binstruct/igmp-v0.1.0) (2026-08-02)


### Features

* **@binstruct/igmp:** add igmpv2 message coder ([#198](https://github.com/hertzg/jsr-monorepo/issues/198)) ([214005a](https://github.com/hertzg/jsr-monorepo/commit/214005a94e76857f7597c3427617722189347b71))
