# JSR Monorepo

A collection of TypeScript libraries published to [JSR](https://jsr.io/@hertzg)
(JavaScript Registry). This monorepo contains binary structure encoding/decoding
libraries, format-specific parsers, router API clients, and various utilities.

## Packages

| Package                                                     | Version                                                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [@hertzg/binstruct](https://jsr.io/@hertzg/binstruct)       | [![JSR](https://jsr.io/badges/@hertzg/binstruct)](https://jsr.io/@hertzg/binstruct)       |
| [@hertzg/bx](https://jsr.io/@hertzg/bx)                     | [![JSR](https://jsr.io/badges/@hertzg/bx)](https://jsr.io/@hertzg/bx)                     |
| [@hertzg/ip](https://jsr.io/@hertzg/ip)                     | [![JSR](https://jsr.io/badges/@hertzg/ip)](https://jsr.io/@hertzg/ip)                     |
| [@hertzg/mymagti-api](https://jsr.io/@hertzg/mymagti-api)   | [![JSR](https://jsr.io/badges/@hertzg/mymagti-api)](https://jsr.io/@hertzg/mymagti-api)   |
| [@hertzg/routeros-api](https://jsr.io/@hertzg/routeros-api) | [![JSR](https://jsr.io/badges/@hertzg/routeros-api)](https://jsr.io/@hertzg/routeros-api) |
| [@hertzg/tplink-api](https://jsr.io/@hertzg/tplink-api)     | [![JSR](https://jsr.io/badges/@hertzg/tplink-api)](https://jsr.io/@hertzg/tplink-api)     |
| [@hertzg/wg-conf](https://jsr.io/@hertzg/wg-conf)           | [![JSR](https://jsr.io/badges/@hertzg/wg-conf)](https://jsr.io/@hertzg/wg-conf)           |
| [@hertzg/wg-ini](https://jsr.io/@hertzg/wg-ini)             | [![JSR](https://jsr.io/badges/@hertzg/wg-ini)](https://jsr.io/@hertzg/wg-ini)             |
| [@hertzg/wg-keys](https://jsr.io/@hertzg/wg-keys)           | [![JSR](https://jsr.io/badges/@hertzg/wg-keys)](https://jsr.io/@hertzg/wg-keys)           |
| [@binstruct/cli](https://jsr.io/@binstruct/cli)             | [![JSR](https://jsr.io/badges/@binstruct/cli)](https://jsr.io/@binstruct/cli)             |
| [@binstruct/ethernet](https://jsr.io/@binstruct/ethernet)   | [![JSR](https://jsr.io/badges/@binstruct/ethernet)](https://jsr.io/@binstruct/ethernet)   |
| [@binstruct/png](https://jsr.io/@binstruct/png)             | [![JSR](https://jsr.io/badges/@binstruct/png)](https://jsr.io/@binstruct/png)             |
| [@binstruct/wav](https://jsr.io/@binstruct/wav)             | [![JSR](https://jsr.io/badges/@binstruct/wav)](https://jsr.io/@binstruct/wav)             |

## Installation

All packages are published to JSR. Install using your preferred package manager:

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.1.4 or later

### Setup

```bash
# Install pre-push hook (runs all CI checks before push)
deno task setup:hooks
```

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

See [RELEASE.md](RELEASE.md) for the release process.

## License

See individual package directories for license information.
