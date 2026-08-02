# Changelog

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/wav-v0.1.2...@binstruct/wav-v1.0.0) (2026-08-02)


### ⚠ BREAKING CHANGES

* **@binstruct/wav:** dataChunk(), listChunk() and wavFile() no longer emit or expect a 4-byte length before the chunk payload; previously produced bytes were malformed RIFF.

### Bug Fixes

* **@binstruct/wav:** drive chunk payload length from chunkSize ([890884c](https://github.com/hertzg/jsr-monorepo/commit/890884ce650f0f180ad30836ed84c93ada0fa593)), closes [#223](https://github.com/hertzg/jsr-monorepo/issues/223)
