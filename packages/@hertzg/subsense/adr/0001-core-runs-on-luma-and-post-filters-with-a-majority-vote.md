# ADR 0001 - Core runs on luma and post-filters with a majority vote

The model keeps one luma byte per sample. RGB and RGBA frames are converted on the way in, and the mask gets one majority filter pass.

Motion only needs a yes or no per pixel, and luma carries that signal. Three channels would triple the sample bank for no gain in detection.

```ts
// 640 x 480 pixels, 50 samples per pixel
const lumaBankBytes = 640 * 480 * 50; // 15,360,000
const rgbBankBytes = lumaBankBytes * 3; // 46,080,000
```

Ruled out:
- Per-channel RGB model: 3x memory and compare cost, and motion detection does not need it.
- litiv's full morphological post-processing: needs flood fill and erosion, a lot of code for a small gain on the mask.
- Trimming a 2px border like litiv: callers would get a mask smaller than their frame.
