# ADR 0001 - Frames are flat typed arrays, masks are 0/127/255

A frame is one `Uint8Array` (or `Uint8ClampedArray`) of `width * height * channels` bytes.

Rows run top to bottom. Pixels are interleaved, so a 2x1 RGB frame is six bytes:

```ts
// width 2, height 1, channels 3
const frame = new Uint8Array([
  255, 0, 0,    // pixel 0: red
  0, 255, 0,    // pixel 1: green
]);
```

With 4 channels the alpha byte is skipped, the same as canvas `ImageData.data`.
A mask is one byte per pixel, using OpenCV's values: 0 background, 127 shadow, 255 foreground.
Tutorials and examples written for OpenCV then carry over unchanged.

Ruled out: an `ImageData`-shaped object parameter (the caller would build a wrapper for no gain);
per-pixel objects (allocation per pixel); a boolean mask (it drops the shadow value).
