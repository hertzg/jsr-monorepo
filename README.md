# JSR Monorepo

A collection of TypeScript libraries published to [JSR](https://jsr.io/@hertzg)
(JavaScript Registry). This monorepo contains binary structure encoding/decoding
libraries, format-specific parsers, router API clients, and various utilities.

**[API Documentation](https://hertzg.github.io/jsr-monorepo/)**

## Packages

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
| [@binstruct/arp](https://jsr.io/@binstruct/arp)             | [![JSR](https://jsr.io/badges/@binstruct/arp)](https://jsr.io/@binstruct/arp)             |
| [@binstruct/bmp](https://jsr.io/@binstruct/bmp)             | [![JSR](https://jsr.io/badges/@binstruct/bmp)](https://jsr.io/@binstruct/bmp)             |
| [@binstruct/cli](https://jsr.io/@binstruct/cli)             | [![JSR](https://jsr.io/badges/@binstruct/cli)](https://jsr.io/@binstruct/cli)             |
| [@binstruct/ethernet](https://jsr.io/@binstruct/ethernet)   | [![JSR](https://jsr.io/badges/@binstruct/ethernet)](https://jsr.io/@binstruct/ethernet)   |
| [@binstruct/icmp](https://jsr.io/@binstruct/icmp)           | [![JSR](https://jsr.io/badges/@binstruct/icmp)](https://jsr.io/@binstruct/icmp)           |
| [@binstruct/ipv4](https://jsr.io/@binstruct/ipv4)           | [![JSR](https://jsr.io/badges/@binstruct/ipv4)](https://jsr.io/@binstruct/ipv4)           |
| [@binstruct/png](https://jsr.io/@binstruct/png)             | [![JSR](https://jsr.io/badges/@binstruct/png)](https://jsr.io/@binstruct/png)             |
| [@binstruct/udp](https://jsr.io/@binstruct/udp)             | [![JSR](https://jsr.io/badges/@binstruct/udp)](https://jsr.io/@binstruct/udp)             |
| [@binstruct/wav](https://jsr.io/@binstruct/wav)             | [![JSR](https://jsr.io/badges/@binstruct/wav)](https://jsr.io/@binstruct/wav)             |

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
