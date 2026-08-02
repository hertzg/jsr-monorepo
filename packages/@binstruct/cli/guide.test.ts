/**
 * Tests for the guidance renderer.
 */

import { assertEquals } from "@std/assert";
import { type Guide, nearestName, renderGuide } from "./guide.ts";

/** A minimal guide, one block of each kind. */
const MINIMAL: Guide = {
  next: { word: "<command>", meaning: "which direction to run the coder in" },
  options: {
    heading: "COMMANDS",
    items: [
      { name: "decode", summary: "binary in, JSON out" },
      { name: "encode", summary: "JSON in, binary out" },
    ],
  },
  try: ["binstruct arp decode < arp.bin > arp.json"],
};

Deno.test("renderGuide renders NEXT, options and TRY, in that order", () => {
  assertEquals(
    renderGuide(MINIMAL),
    [
      "NEXT  <command>",
      "  which direction to run the coder in",
      "",
      "COMMANDS",
      "  decode  binary in, JSON out",
      "  encode  JSON in, binary out",
      "",
      "TRY",
      "  binstruct arp decode < arp.bin > arp.json",
    ].join("\n"),
  );
});

Deno.test("renderGuide carries no trailing newline", () => {
  assertEquals(renderGuide(MINIMAL).endsWith("\n"), false);
});

Deno.test("renderGuide puts the header first and the notes above NEXT", () => {
  const lines = renderGuide({
    ...MINIMAL,
    header: "package: jsr:@binstruct/arp",
    notes: ["arpData is the only coder", "so the coder word may be omitted"],
  }).split("\n");

  assertEquals(lines.slice(0, 6), [
    "package: jsr:@binstruct/arp",
    "",
    "arpData is the only coder",
    "so the coder word may be omitted",
    "",
    "NEXT  <command>",
  ]);
});

Deno.test("renderGuide appends the footer as the last block", () => {
  const text = renderGuide({ ...MINIMAL, footer: ["USAGE", "  binstruct"] });

  assertEquals(text.endsWith("\n\nUSAGE\n  binstruct"), true);
});

Deno.test("renderGuide omits the TRY block when there is nothing to try", () => {
  assertEquals(renderGuide({ ...MINIMAL, try: [] }).includes("TRY"), false);
});

Deno.test("renderGuide flows bare names into aligned columns", () => {
  const text = renderGuide({
    next: { word: "<package>", meaning: "the format your bytes are in" },
    options: {
      heading: "PACKAGES",
      items: ["arp", "au", "tls-record", "png"].map((name) => ({ name })),
    },
  });

  assertEquals(
    text.split("\n\n")[1],
    "PACKAGES\n  arp         au          tls-record  png",
  );
});

Deno.test("renderGuide aligns the name, detail and summary columns", () => {
  const text = renderGuide({
    next: { word: "<coder>", meaning: "which structure to work with" },
    options: {
      heading: "CODERS in png",
      items: [
        { name: "pngFile", detail: "→ PngFile", summary: "complete files" },
        { name: "pngChunkUnknown", summary: "generic chunks" },
      ],
    },
  });

  assertEquals(
    text.split("\n\n")[1],
    [
      "CODERS in png",
      "  pngFile          → PngFile  complete files",
      "  pngChunkUnknown             generic chunks",
    ].join("\n"),
  );
});

Deno.test("renderGuide explains an empty options block", () => {
  const text = renderGuide({
    next: { word: "<coder>", meaning: "which structure to work with" },
    options: {
      heading: "CODERS in png",
      items: [],
      empty: "unknown — nothing could be listed",
    },
  });

  assertEquals(
    text.split("\n\n")[1],
    "CODERS in png\n  unknown — nothing could be listed",
  );
});

Deno.test("nearestName ignores case", () => {
  assertEquals(
    nearestName("pngfile", ["pngFile", "pngChunkUnknown"]),
    "pngFile",
  );
});

Deno.test("nearestName tolerates a small typo", () => {
  const coders = ["arpData", "arpHeader"];

  assertEquals(nearestName("arpDatum", coders), "arpData");
  assertEquals(nearestName("arpdta", coders), "arpData");
});

Deno.test("nearestName suggests nothing when nothing is close", () => {
  assertEquals(nearestName("totallyUnrelated", ["arpData"]), undefined);
  assertEquals(nearestName("arpData", []), undefined);
});

Deno.test("nearestName breaks ties towards the earlier candidate", () => {
  assertEquals(nearestName("ab", ["ax", "ay"]), "ax");
});
