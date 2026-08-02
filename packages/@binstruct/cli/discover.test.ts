import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path";
import {
  type DenoDocJson,
  diagnoseEmptyDiscovery,
  discoverCoders,
  readDocSurface,
  readSymbolDocs,
} from "./discover.ts";

/**
 * Captured from `deno doc --json --quiet jsr:@binstruct/png` (png 0.4.0).
 *
 * Trimmed to the symbols that exercise discovery — the four coder factories
 * plus a `Refiner`-returning function and an overloaded plain function that
 * must both be rejected — with JSDoc bodies cut to their first paragraph and
 * type trees cut to the `repr` fields discovery reads. Symbol order, parameter
 * shapes and locations are as the tool emitted them.
 */
const PNG_DOC: DenoDocJson = {
  nodes: {
    "jsr:@binstruct/png": {
      module_doc: {
        doc:
          "PNG (Portable Network Graphics) file format support for binary structure encoding and decoding.\n\nThis module provides coders for PNG files and their constituent chunks, enabling",
      },
      symbols: [
        {
          name: "bkgdChunkRefiner",
          declarations: [
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/chunks/bkgd.ts",
              },
              jsDoc: {
                doc:
                  "Creates a refiner for bKGD (background color) chunks.\n\nConverts between raw binary bKGD chunks and structured BkgdChunk representations.",
              },
              def: {
                params: [],
                returnType: {
                  repr: "Refiner",
                  value: { typeParams: [{ repr: "PngChunkUnknown" }] },
                },
              },
            },
          ],
        },
        {
          name: "pngChunkUnknown",
          declarations: [
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              jsDoc: {
                doc:
                  "Creates a coder for unknown/generic PNG chunks.\n\nThis coder handles the basic PNG chunk structure without any type-specific",
              },
              def: {
                params: [],
                returnType: {
                  repr: "Coder",
                  value: { typeParams: [{ repr: "PngChunkUnknown" }] },
                },
              },
            },
          ],
        },
        {
          name: "pngFileChunks",
          declarations: [
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              jsDoc: {
                doc:
                  "Creates a coder for PNG files with a custom chunk coder.\n\nThis function allows you to specify how individual chunks should be",
              },
              def: {
                params: [{ kind: "identifier" }],
                returnType: {
                  repr: "Coder",
                  value: { typeParams: [{ repr: "PngFile" }] },
                },
              },
            },
          ],
        },
        {
          name: "pngChunkRefined",
          declarations: [
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              jsDoc: {
                doc:
                  "Creates a coder for PNG chunks with type-specific refinement.\n\nThis coder automatically detects the chunk type and applies the appropriate",
              },
              def: {
                params: [],
                // The decoded type is an anonymous union, so it has no `repr`.
                returnType: { repr: "Coder" },
              },
            },
          ],
        },
        {
          name: "pngFile",
          declarations: [
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              jsDoc: {
                doc:
                  "Creates a coder for complete PNG files with automatic chunk refinement.\n\nThis is the main entry point for working with PNG files. It creates a coder",
              },
              def: {
                params: [],
                returnType: {
                  repr: "Coder",
                  value: { typeParams: [{ repr: "PngFile" }] },
                },
              },
            },
          ],
        },
        {
          name: "chunkCrc",
          declarations: [
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              jsDoc: {
                doc:
                  "Calculates the CRC32 checksum for PNG chunk data.\n\nThis function can accept either raw bytes or a chunk object containing",
              },
              def: {
                params: [{ kind: "identifier" }],
                returnType: { repr: "number" },
              },
            },
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              def: {
                params: [{ kind: "identifier" }],
                returnType: { repr: "number" },
              },
            },
            {
              kind: "function",
              location: {
                filename: "https://jsr.io/@binstruct/png/0.4.0/mod.ts",
              },
              def: {
                params: [{ kind: "identifier" }],
                returnType: { repr: "number" },
              },
            },
          ],
        },
      ],
    },
  },
};

/**
 * Captured from `deno doc --json --quiet jsr:@hertzg/mac` (mac 0.2.0).
 *
 * A well-documented package that exposes no coders at all — plain functions
 * and a constant. Trimmed the same way as {@linkcode PNG_DOC}.
 */
const MAC_DOC: DenoDocJson = {
  nodes: {
    "jsr:@hertzg/mac": {
      module_doc: {
        doc:
          "EUI-48 MAC address parsing and stringification.\n\nSister package to {@link https://jsr.io/@hertzg/ip @hertzg/ip} — same shape,",
      },
      symbols: [
        {
          name: "MAC_BYTE_LENGTH",
          declarations: [
            {
              kind: "variable",
              location: { filename: "https://jsr.io/@hertzg/mac/0.2.0/mod.ts" },
              jsDoc: { doc: "Length of an EUI-48 MAC address in bytes." },
              def: { params: [] },
            },
          ],
        },
        {
          name: "parse",
          declarations: [
            {
              kind: "function",
              location: { filename: "https://jsr.io/@hertzg/mac/0.2.0/mod.ts" },
              jsDoc: {
                doc:
                  "Parses a canonical EUI-48 MAC address string into its 6-byte binary form.\n\nAccepts colon (`aa:bb:cc:dd:ee:ff`) or hyphen (`aa-bb-cc-dd-ee-ff`)",
              },
              def: {
                params: [{ kind: "identifier" }],
                returnType: { repr: "Uint8Array" },
              },
            },
          ],
        },
        {
          name: "stringify",
          declarations: [
            {
              kind: "function",
              location: { filename: "https://jsr.io/@hertzg/mac/0.2.0/mod.ts" },
              jsDoc: {
                doc:
                  "Formats a 6-byte EUI-48 MAC address as a lowercase hex string.\n\nProduces the canonical colon-delimited form (`aa:bb:cc:dd:ee:ff`) by",
              },
              def: {
                params: [{ kind: "identifier" }, { kind: "assign" }],
                returnType: { repr: "string" },
              },
            },
          ],
        },
      ],
    },
  },
};

/**
 * Captured from `deno doc --json --quiet packages/@hertzg/binstruct/mod.ts`.
 *
 * The only place in the monorepo where coder factories take defaulted (`assign`)
 * and optional (`identifier` + `optional`) parameters, which is what pins the
 * required-argument count. Absolute paths were rewritten to `file:///repo/…`;
 * everything else is as the tool emitted it.
 */
const BINSTRUCT_DOC: DenoDocJson = {
  nodes: {
    "file:///repo/packages/@hertzg/binstruct/mod.ts": {
      module_doc: {
        doc:
          "A comprehensive module providing type-safe binary structure encoding and decoding utilities for TypeScript.\n\nThis library offers a complete toolkit for working with binary data formats, supporting:",
      },
      symbols: [
        {
          name: "u8",
          declarations: [
            {
              kind: "function",
              location: {
                filename:
                  "file:///repo/packages/@hertzg/binstruct/numeric/unsigned.ts",
              },
              jsDoc: {
                doc:
                  "Creates a coder for 8-bit unsigned integers.\n\nThis function creates a coder that can encode/decode 8-bit unsigned integers",
              },
              def: {
                params: [{ kind: "assign" }],
                returnType: {
                  repr: "Coder",
                  value: { typeParams: [{ repr: "number" }] },
                },
              },
            },
          ],
        },
        {
          name: "string",
          declarations: [
            {
              kind: "function",
              location: {
                filename:
                  "file:///repo/packages/@hertzg/binstruct/string/string.ts",
              },
              jsDoc: {
                doc:
                  "Creates a Coder for strings that automatically chooses between length-prefixed,\nnull-terminated, and fixed-length based on the arguments provided.\n",
              },
              def: {
                params: [
                  { kind: "identifier", optional: true },
                  { kind: "assign" },
                  { kind: "assign" },
                ],
                returnType: {
                  repr: "Coder",
                  value: { typeParams: [{ repr: "string" }] },
                },
              },
            },
          ],
        },
        {
          name: "bytes",
          declarations: [
            {
              kind: "function",
              location: {
                filename:
                  "file:///repo/packages/@hertzg/binstruct/bytes/bytes.ts",
              },
              jsDoc: { doc: "Creates a Coder for byte slices.\n" },
              def: {
                params: [{ kind: "identifier", optional: true }],
                returnType: {
                  repr: "Coder",
                  value: { typeParams: [{ repr: "Uint8Array" }] },
                },
              },
            },
          ],
        },
      ],
    },
  },
};

/** Entrypoint of a real workspace package with exactly one coder. */
const ARP_ENTRYPOINT = import.meta.resolve("../arp/mod.ts");

/** Entrypoint of a real workspace package that is not binstruct-based. */
const MAC_ENTRYPOINT = import.meta.resolve("../../@hertzg/mac/mod.ts");

Deno.test("readDocSurface keeps only Coder-returning functions", () => {
  const surface = readDocSurface(PNG_DOC);

  assertEquals(surface.coders.map((coder) => coder.name), [
    "pngChunkUnknown",
    "pngChunkRefined",
    "pngFile",
    "pngFileChunks",
  ]);
});

Deno.test("readDocSurface sorts zero-argument coders first", () => {
  const { coders } = readDocSurface(PNG_DOC);

  assertEquals(coders.map((coder) => coder.requiredParams), [0, 0, 0, 1]);
  // pngFileChunks is declared second but is the only one taking an argument.
  assertEquals(coders.at(-1)?.name, "pngFileChunks");
});

Deno.test("readDocSurface reads decoded type, summary and arity", () => {
  const { coders } = readDocSurface(PNG_DOC);

  assertEquals(coders[2], {
    name: "pngFile",
    decodedType: "PngFile",
    summary:
      "Creates a coder for complete PNG files with automatic chunk refinement.",
    requiredParams: 0,
  });
  assertEquals(coders[3], {
    name: "pngFileChunks",
    decodedType: "PngFile",
    summary: "Creates a coder for PNG files with a custom chunk coder.",
    requiredParams: 1,
  });
});

Deno.test("readDocSurface omits an anonymous decoded type", () => {
  const refined = readDocSurface(PNG_DOC).coders.find(
    (coder) => coder.name === "pngChunkRefined",
  );

  assertEquals(refined?.decodedType, undefined);
  assertEquals(refined?.requiredParams, 0);
});

Deno.test("readDocSurface reads module summary and resolved version", () => {
  const surface = readDocSurface(PNG_DOC);

  assertEquals(
    surface.summary,
    "PNG (Portable Network Graphics) file format support for binary structure encoding and decoding.",
  );
  assertEquals(surface.version, "0.4.0");
});

Deno.test("readDocSurface reports no coders for a non-coder package", () => {
  const surface = readDocSurface(MAC_DOC);

  assertEquals(surface.coders, []);
  assertEquals(surface.version, "0.2.0");
  assertEquals(
    surface.summary,
    "EUI-48 MAC address parsing and stringification.",
  );
});

Deno.test("readDocSurface excludes defaulted and optional parameters from arity", () => {
  const surface = readDocSurface(BINSTRUCT_DOC);

  assertEquals(
    surface.coders.map((coder) => [
      coder.name,
      coder.requiredParams,
    ]),
    [
      ["u8", 0],
      ["string", 0],
      ["bytes", 0],
    ],
  );
});

Deno.test("readDocSurface has no version for a non-JSR entrypoint", () => {
  assertEquals(readDocSurface(BINSTRUCT_DOC).version, undefined);
});

Deno.test("readDocSurface answers an empty document instead of throwing", () => {
  // `Object.entries(doc.nodes)[0]` was destructured unguarded, so a document
  // with no nodes — which `deno doc` emits, at exit 0 — came back as an
  // uncaught TypeError with a stack trace through the CLI's own frames.
  assertEquals(readDocSurface({ nodes: {} }), { coders: [] });
});

Deno.test("deno doc exits 0 with no nodes at all for a directory of no modules", async () => {
  // Where the empty document comes from, so the guard above is pinned to the
  // tool's real behaviour rather than to a hand-written fixture. Callers refuse
  // a directory first, but discovery is exported and answers about whatever it
  // is handed; "nothing to report" is an answer, not a crash.
  const directory = await Deno.realPath(await Deno.makeTempDir());
  try {
    await Deno.writeTextFile(`${directory}/README.md`, "not a module\n");
    await Deno.mkdir(`${directory}/empty`);

    const outcome = await discoverCoders(toFileUrl(`${directory}/empty`).href);

    assert(outcome.ok, "an empty directory is a successful, empty discovery");
    assertEquals(outcome.coders, []);
    assertEquals(outcome.version, undefined);
    assertEquals(outcome.summary, undefined);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("deno doc documents every module under a directory, not an entrypoint", async () => {
  // The reason directories are refused before discovery runs. Asked about a
  // directory, `deno doc` answers with one node per module file it finds
  // underneath — none of them an entrypoint, and their order is the order of
  // the file names, so reading the first is reading `aaa_other.ts`.
  const directory = await Deno.realPath(await Deno.makeTempDir());
  try {
    const binstruct = import.meta.resolve("../../@hertzg/binstruct/mod.ts");
    for (const name of ["mod.ts", "aaa_other.ts"]) {
      await Deno.writeTextFile(
        `${directory}/${name}`,
        [
          `import { type Coder, struct, u8 } from "${binstruct}";`,
          "",
          "/** A one-byte structure. */",
          `export function ${
            name === "mod.ts" ? "pair" : "internalOnly"
          }(): Coder<{ a: number }> {`,
          "  return struct({ a: u8() });",
          "}",
          "",
        ].join("\n"),
      );
    }

    const outcome = await discoverCoders(toFileUrl(directory).href);

    assert(outcome.ok, "deno doc reads a directory happily");
    assertEquals(outcome.coders.map((coder) => coder.name), ["internalOnly"]);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("discoverCoders reads a real package through deno doc", async () => {
  const outcome = await discoverCoders(ARP_ENTRYPOINT);

  assert(outcome.ok, "discovery should succeed for a local entrypoint");
  assertEquals(outcome.specifier, ARP_ENTRYPOINT);
  assertEquals(outcome.version, undefined);
  assertEquals(outcome.coders.length, 1);
  assertEquals(outcome.coders[0].name, "arpData");
  assertEquals(outcome.coders[0].decodedType, "ArpData");
  assertEquals(outcome.coders[0].requiredParams, 0);
  assertStringIncludes(outcome.summary ?? "", "ARP");
});

Deno.test("discoverCoders reports a failing deno doc as an outcome", async () => {
  const specifier = import.meta.resolve("./no-such-module.ts");
  const outcome = await discoverCoders(specifier);

  assert(!outcome.ok, "discovery should fail for a missing entrypoint");
  assertEquals(outcome.reason, "exited-non-zero");
  assertEquals(outcome.specifier, specifier);
  assertEquals(outcome.command[0], "deno");
  assert(outcome.code !== 0, "a failing subprocess reports a non-zero status");
  assert(outcome.stderr.length > 0, "the tool's stderr is captured");
});

Deno.test("readSymbolDocs returns deno doc's formatted output", async () => {
  const docs = await readSymbolDocs(ARP_ENTRYPOINT, "arpData");

  assert(docs.ok, "documentation should be available for a local entrypoint");
  assertStringIncludes(docs.text, "arpData");
});

Deno.test("readSymbolDocs leaves out colour when stdout is not a terminal", async () => {
  // The subprocess colours its output whether or not anyone can see it, so
  // `--docs > notes.txt` used to write escape sequences into the file.
  const docs = await readSymbolDocs(ARP_ENTRYPOINT, "arpData");

  assert(docs.ok, "documentation should be available for a local entrypoint");
  assertEquals(docs.text.includes(String.fromCharCode(27) + "["), false);
});

Deno.test("diagnoseEmptyDiscovery reports a graph it could not walk", async () => {
  // `deno info` exits 0 for an unresolvable root and reports the problem as an
  // `error` on the module, which read as "this graph contains no binstruct".
  const directory = await Deno.makeTempDir();
  try {
    const diagnosis = await diagnoseEmptyDiscovery(toFileUrl(directory).href);

    assert(!diagnosis.ok, "a directory import is not a readable graph");
    assertEquals(diagnosis.reason, "graph-incomplete");
    assertStringIncludes(diagnosis.stderr, "Directory import");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("diagnoseEmptyDiscovery detects a binstruct dependency", async () => {
  const diagnosis = await diagnoseEmptyDiscovery(ARP_ENTRYPOINT);

  assert(diagnosis.ok, "the module graph should be readable");
  assertEquals(diagnosis.dependsOnBinstruct, true);
});

Deno.test("diagnoseEmptyDiscovery detects a non-binstruct package", async () => {
  const diagnosis = await diagnoseEmptyDiscovery(MAC_ENTRYPOINT);

  assert(diagnosis.ok, "the module graph should be readable");
  assertEquals(diagnosis.dependsOnBinstruct, false);
});
