# Changelog

## [1.1.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/icmp-v1.0.0...@binstruct/icmp-v1.1.0) (2026-05-01)


### Features

* **@binstruct/inet:** inet stack coder (Ethernet→IPv4→UDP/ICMP/ARP) + RFC 1071 checksum, plus protocol-package cleanup ([#171](https://github.com/hertzg/jsr-monorepo/issues/171)) ([34ffc58](https://github.com/hertzg/jsr-monorepo/commit/34ffc587c0c4d04b5cf2605d05476413acec4e13))

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/icmp-v0.1.0...@binstruct/icmp-v1.0.0) (2026-04-30)


### ⚠ BREAKING CHANGES

* **@binstruct/icmp,@binstruct/udp:** icmpHeader(N), icmpEcho(N), and the optional payloadLength parameter in general are gone.

### Features

* **@binstruct/icmp,@binstruct/udp:** drop payloadLength parameters ([d9fb65d](https://github.com/hertzg/jsr-monorepo/commit/d9fb65df465fcdfe728d205683f842940ac76c8f))
* **@binstruct/icmp:** add ICMP packet package ([#162](https://github.com/hertzg/jsr-monorepo/issues/162)) ([b168b29](https://github.com/hertzg/jsr-monorepo/commit/b168b2933ca5509fd758c4f694cb36113e76d6e9))
