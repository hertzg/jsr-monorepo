# JSR Monorepo

A collection of TypeScript libraries published to [JSR](https://jsr.io/@hertzg)
(JavaScript Registry). This monorepo contains binary structure encoding/decoding
libraries, format-specific parsers, router API clients, and various utilities.

**[API Documentation](https://hertzg.github.io/jsr-monorepo/)**

## Packages

Source layout mirrors the JSR scope: `packages/<scope>/<name>/`.

### `@hertzg/*` — utilities and the core library

| Package                                                     | Version                                                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [@hertzg/binstruct](https://jsr.io/@hertzg/binstruct)       | [![JSR](https://jsr.io/badges/@hertzg/binstruct)](https://jsr.io/@hertzg/binstruct)       |
| [@hertzg/bx](https://jsr.io/@hertzg/bx)                     | [![JSR](https://jsr.io/badges/@hertzg/bx)](https://jsr.io/@hertzg/bx)                     |
| [@hertzg/crc](https://jsr.io/@hertzg/crc)                   | [![JSR](https://jsr.io/badges/@hertzg/crc)](https://jsr.io/@hertzg/crc)                   |
| [@hertzg/ip](https://jsr.io/@hertzg/ip)                     | [![JSR](https://jsr.io/badges/@hertzg/ip)](https://jsr.io/@hertzg/ip)                     |
| [@hertzg/mac](https://jsr.io/@hertzg/mac)                   | [![JSR](https://jsr.io/badges/@hertzg/mac)](https://jsr.io/@hertzg/mac)                   |
| [@hertzg/mymagti-api](https://jsr.io/@hertzg/mymagti-api)   | [![JSR](https://jsr.io/badges/@hertzg/mymagti-api)](https://jsr.io/@hertzg/mymagti-api)   |
| [@hertzg/routeros-api](https://jsr.io/@hertzg/routeros-api) | [![JSR](https://jsr.io/badges/@hertzg/routeros-api)](https://jsr.io/@hertzg/routeros-api) |
| [@hertzg/tplink-api](https://jsr.io/@hertzg/tplink-api)     | [![JSR](https://jsr.io/badges/@hertzg/tplink-api)](https://jsr.io/@hertzg/tplink-api)     |
| [@hertzg/wg-conf](https://jsr.io/@hertzg/wg-conf)           | [![JSR](https://jsr.io/badges/@hertzg/wg-conf)](https://jsr.io/@hertzg/wg-conf)           |
| [@hertzg/wg-ini](https://jsr.io/@hertzg/wg-ini)             | [![JSR](https://jsr.io/badges/@hertzg/wg-ini)](https://jsr.io/@hertzg/wg-ini)             |
| [@hertzg/wg-keys](https://jsr.io/@hertzg/wg-keys)           | [![JSR](https://jsr.io/badges/@hertzg/wg-keys)](https://jsr.io/@hertzg/wg-keys)           |
| [@hertzg/xhb](https://jsr.io/@hertzg/xhb)                   | [![JSR](https://jsr.io/badges/@hertzg/xhb)](https://jsr.io/@hertzg/xhb)                   |

### `@binstruct/*` — format-specific binstruct decoders

| Package                                                   | Version                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [@binstruct/arp](https://jsr.io/@binstruct/arp)           | [![JSR](https://jsr.io/badges/@binstruct/arp)](https://jsr.io/@binstruct/arp)           |
| [@binstruct/au](https://jsr.io/@binstruct/au)             | [![JSR](https://jsr.io/badges/@binstruct/au)](https://jsr.io/@binstruct/au)             |
| [@binstruct/bfd](https://jsr.io/@binstruct/bfd)           | [![JSR](https://jsr.io/badges/@binstruct/bfd)](https://jsr.io/@binstruct/bfd)           |
| [@binstruct/bmp](https://jsr.io/@binstruct/bmp)           | [![JSR](https://jsr.io/badges/@binstruct/bmp)](https://jsr.io/@binstruct/bmp)           |
| [@binstruct/cli](https://jsr.io/@binstruct/cli)           | [![JSR](https://jsr.io/badges/@binstruct/cli)](https://jsr.io/@binstruct/cli)           |
| [@binstruct/dos-mz](https://jsr.io/@binstruct/dos-mz)     | [![JSR](https://jsr.io/badges/@binstruct/dos-mz)](https://jsr.io/@binstruct/dos-mz)     |
| [@binstruct/esp](https://jsr.io/@binstruct/esp)           | [![JSR](https://jsr.io/badges/@binstruct/esp)](https://jsr.io/@binstruct/esp)           |
| [@binstruct/ethernet](https://jsr.io/@binstruct/ethernet) | [![JSR](https://jsr.io/badges/@binstruct/ethernet)](https://jsr.io/@binstruct/ethernet) |
| [@binstruct/icmp](https://jsr.io/@binstruct/icmp)         | [![JSR](https://jsr.io/badges/@binstruct/icmp)](https://jsr.io/@binstruct/icmp)         |
| [@binstruct/icmpv6](https://jsr.io/@binstruct/icmpv6)     | [![JSR](https://jsr.io/badges/@binstruct/icmpv6)](https://jsr.io/@binstruct/icmpv6)     |
| [@binstruct/ico](https://jsr.io/@binstruct/ico)           | [![JSR](https://jsr.io/badges/@binstruct/ico)](https://jsr.io/@binstruct/ico)           |
| [@binstruct/igmp](https://jsr.io/@binstruct/igmp)         | [![JSR](https://jsr.io/badges/@binstruct/igmp)](https://jsr.io/@binstruct/igmp)         |
| [@binstruct/inet](https://jsr.io/@binstruct/inet)         | [![JSR](https://jsr.io/badges/@binstruct/inet)](https://jsr.io/@binstruct/inet)         |
| [@binstruct/ipv4](https://jsr.io/@binstruct/ipv4)         | [![JSR](https://jsr.io/badges/@binstruct/ipv4)](https://jsr.io/@binstruct/ipv4)         |
| [@binstruct/ipv6](https://jsr.io/@binstruct/ipv6)         | [![JSR](https://jsr.io/badges/@binstruct/ipv6)](https://jsr.io/@binstruct/ipv6)         |
| [@binstruct/mbr](https://jsr.io/@binstruct/mbr)           | [![JSR](https://jsr.io/badges/@binstruct/mbr)](https://jsr.io/@binstruct/mbr)           |
| [@binstruct/mp3](https://jsr.io/@binstruct/mp3)           | [![JSR](https://jsr.io/badges/@binstruct/mp3)](https://jsr.io/@binstruct/mp3)           |
| [@binstruct/ntp](https://jsr.io/@binstruct/ntp)           | [![JSR](https://jsr.io/badges/@binstruct/ntp)](https://jsr.io/@binstruct/ntp)           |
| [@binstruct/pcap](https://jsr.io/@binstruct/pcap)         | [![JSR](https://jsr.io/badges/@binstruct/pcap)](https://jsr.io/@binstruct/pcap)         |
| [@binstruct/png](https://jsr.io/@binstruct/png)           | [![JSR](https://jsr.io/badges/@binstruct/png)](https://jsr.io/@binstruct/png)           |
| [@binstruct/pppoe](https://jsr.io/@binstruct/pppoe)       | [![JSR](https://jsr.io/badges/@binstruct/pppoe)](https://jsr.io/@binstruct/pppoe)       |
| [@binstruct/rtp](https://jsr.io/@binstruct/rtp)           | [![JSR](https://jsr.io/badges/@binstruct/rtp)](https://jsr.io/@binstruct/rtp)           |
| [@binstruct/sll](https://jsr.io/@binstruct/sll)           | [![JSR](https://jsr.io/badges/@binstruct/sll)](https://jsr.io/@binstruct/sll)           |
| [@binstruct/sqlite](https://jsr.io/@binstruct/sqlite)     | [![JSR](https://jsr.io/badges/@binstruct/sqlite)](https://jsr.io/@binstruct/sqlite)     |
| [@binstruct/tcp](https://jsr.io/@binstruct/tcp)           | [![JSR](https://jsr.io/badges/@binstruct/tcp)](https://jsr.io/@binstruct/tcp)           |
| [@binstruct/tga](https://jsr.io/@binstruct/tga)           | [![JSR](https://jsr.io/badges/@binstruct/tga)](https://jsr.io/@binstruct/tga)           |
| [@binstruct/tls-record](https://jsr.io/@binstruct/tls-record) | [![JSR](https://jsr.io/badges/@binstruct/tls-record)](https://jsr.io/@binstruct/tls-record) |
| [@binstruct/udp](https://jsr.io/@binstruct/udp)           | [![JSR](https://jsr.io/badges/@binstruct/udp)](https://jsr.io/@binstruct/udp)           |
| [@binstruct/vlan](https://jsr.io/@binstruct/vlan)         | [![JSR](https://jsr.io/badges/@binstruct/vlan)](https://jsr.io/@binstruct/vlan)         |
| [@binstruct/vxlan](https://jsr.io/@binstruct/vxlan)       | [![JSR](https://jsr.io/badges/@binstruct/vxlan)](https://jsr.io/@binstruct/vxlan)       |
| [@binstruct/wav](https://jsr.io/@binstruct/wav)           | [![JSR](https://jsr.io/badges/@binstruct/wav)](https://jsr.io/@binstruct/wav)           |

## Installation

All packages are published to JSR. Install using your preferred package manager:

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.1.4 or later

### Commands

```bash
# Run tests
deno task test

# Run linter
deno task lint

# View coverage
deno task cov
```

## Releasing

Releases are automated via [Release Please](https://github.com/googleapis/release-please).
Commits following [Conventional Commits](https://www.conventionalcommits.org/)
are analyzed automatically, and a release PR is maintained with version bumps
and changelogs. Merging the release PR creates GitHub Releases and publishes
all packages to JSR.

## License

See individual package directories for license information.
