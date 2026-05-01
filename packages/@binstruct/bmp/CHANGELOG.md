# Changelog

## [1.0.0](https://github.com/hertzg/jsr-monorepo/compare/@binstruct/bmp-v0.1.0...@binstruct/bmp-v1.0.0) (2026-04-30)


### ⚠ BREAKING CHANGES

* **@binstruct/bmp:** `BitmapInfoHeaderCoder` is no longer exported and `bitmapInfoHeader().widthCoder` (etc.) is gone. Use the new `bitmapWidthCoder`/`bitmapHeightCoder`/`bitmapBppCoder` factories.

### Features

* **@binstruct/bmp:** add BMP image format package ([#164](https://github.com/hertzg/jsr-monorepo/issues/164)) ([15d89b6](https://github.com/hertzg/jsr-monorepo/commit/15d89b6aa61447067ce849a15d415811a9817496))
* **@binstruct/bmp:** expose dib sub-coder factories; drop Object.assign wrapping ([9549ee4](https://github.com/hertzg/jsr-monorepo/commit/9549ee4efcbf1a1e4022fb14caedebf7b2b61ee3))
