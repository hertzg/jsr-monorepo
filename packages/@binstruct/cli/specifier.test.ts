import { assertEquals, assertStringIncludes } from "@std/assert";
import { join, resolve, toFileUrl } from "@std/path";
import {
  isModulePath,
  resolveSpecifier,
  shortenSpecifier,
  type SpecifierForm,
} from "./specifier.ts";

type ResolutionCase = {
  readonly input: string;
  readonly specifier: string;
  readonly form: SpecifierForm;
  readonly short: string;
};

/**
 * The `file://` URL a path input is expected to anchor to.
 *
 * @param input The path as typed
 * @returns Its absolute URL under the working directory
 */
function underCwd(input: string): string {
  return toFileUrl(resolve(input)).href;
}

const cases: readonly ResolutionCase[] = [
  // Row 1 of the ADR 0004 table: anything with a scheme passes through.
  {
    input: "jsr:@binstruct/png",
    specifier: "jsr:@binstruct/png",
    form: "scheme",
    short: "png",
  },
  {
    input: "jsr:@hertzg/xhb",
    specifier: "jsr:@hertzg/xhb",
    form: "scheme",
    short: "@hertzg/xhb",
  },
  {
    input: "jsr:@binstruct/wav@0.2.0",
    specifier: "jsr:@binstruct/wav@0.2.0",
    form: "scheme",
    short: "wav@0.2.0",
  },
  {
    input: "npm:foo",
    specifier: "npm:foo",
    form: "scheme",
    short: "npm:foo",
  },
  {
    input: "npm:@scope/foo@1.2.3",
    specifier: "npm:@scope/foo@1.2.3",
    form: "scheme",
    short: "npm:@scope/foo@1.2.3",
  },
  {
    input: "https://example.com/mod.ts",
    specifier: "https://example.com/mod.ts",
    form: "scheme",
    short: "https://example.com/mod.ts",
  },
  // A `file:` URL keeps its scheme form. That form says nothing about what is
  // at the far end: `file:///abs/pkg` is a directory and `file:///abs/mod.ts`
  // is not, and only `Deno.stat` on the target can tell them apart.
  {
    input: "file:///abs/mod.ts",
    specifier: "file:///abs/mod.ts",
    form: "scheme",
    short: "file:///abs/mod.ts",
  },
  {
    input: "file:///abs/pkg",
    specifier: "file:///abs/pkg",
    form: "scheme",
    short: "file:///abs/pkg",
  },

  // Row 2: paths, by leading marker or by module extension. A path is anchored
  // to the working directory, because `deno doc` and `import()` disagree about
  // what a relative one is relative to; the typed form survives as `short`.
  // Whether it names a file or a directory is not decided here — see
  // `target.test.ts`, which stats the target instead.
  {
    input: "./local",
    specifier: underCwd("./local"),
    form: "path",
    short: "./local",
  },
  {
    input: "../up",
    specifier: underCwd("../up"),
    form: "path",
    short: "../up",
  },
  {
    input: "/abs/path",
    specifier: "file:///abs/path",
    form: "path",
    short: "/abs/path",
  },
  {
    input: ".",
    specifier: underCwd("."),
    form: "path",
    short: ".",
  },
  {
    input: "./local/mod.ts",
    specifier: underCwd("./local/mod.ts"),
    form: "path",
    short: "./local/mod.ts",
  },
  {
    input: "mod.ts",
    specifier: underCwd("mod.ts"),
    form: "path",
    short: "mod.ts",
  },
  {
    input: "mod.tsx",
    specifier: underCwd("mod.tsx"),
    form: "path",
    short: "mod.tsx",
  },
  {
    input: "mod.mts",
    specifier: underCwd("mod.mts"),
    form: "path",
    short: "mod.mts",
  },
  {
    input: "mod.cts",
    specifier: underCwd("mod.cts"),
    form: "path",
    short: "mod.cts",
  },
  {
    input: "mod.js",
    specifier: underCwd("mod.js"),
    form: "path",
    short: "mod.js",
  },
  {
    input: "mod.jsx",
    specifier: underCwd("mod.jsx"),
    form: "path",
    short: "mod.jsx",
  },
  {
    input: "mod.mjs",
    specifier: underCwd("mod.mjs"),
    form: "path",
    short: "mod.mjs",
  },
  {
    input: "mod.cjs",
    specifier: underCwd("mod.cjs"),
    form: "path",
    short: "mod.cjs",
  },
  {
    input: "pkg/mod.ts",
    specifier: underCwd("pkg/mod.ts"),
    form: "path",
    short: "pkg/mod.ts",
  },

  // Row 3: a scope, but no scheme.
  {
    input: "@hertzg/xhb",
    specifier: "jsr:@hertzg/xhb",
    form: "scoped",
    short: "@hertzg/xhb",
  },
  // A sub-entrypoint is part of the coordinate grammar, and its short form
  // keeps the scope: `png/sub` would now read back as a path, and
  // `shortenSpecifier` refuses to propose a form that reads back differently.
  {
    input: "@binstruct/png/sub",
    specifier: "jsr:@binstruct/png/sub",
    form: "scoped",
    short: "@binstruct/png/sub",
  },
  {
    input: "@binstruct/png",
    specifier: "jsr:@binstruct/png",
    form: "scoped",
    short: "png",
  },
  {
    input: "@binstruct/wav@0.2.0",
    specifier: "jsr:@binstruct/wav@0.2.0",
    form: "scoped",
    short: "wav@0.2.0",
  },

  // Row 4: bare names imply jsr: and @binstruct.
  {
    input: "png",
    specifier: "jsr:@binstruct/png",
    form: "bare",
    short: "png",
  },
  {
    input: "wav@0.2.0",
    specifier: "jsr:@binstruct/wav@0.2.0",
    form: "bare",
    short: "wav@0.2.0",
  },
  {
    input: "tls-record",
    specifier: "jsr:@binstruct/tls-record",
    form: "bare",
    short: "tls-record",
  },
  // Unconditional: no registry lookup, so a package of another scope resolves
  // into @binstruct and fails later at load time.
  {
    input: "xhb",
    specifier: "jsr:@binstruct/xhb",
    form: "bare",
    short: "xhb",
  },
];

/** One row of the enumerated classification space. */
type ClassificationCase = {
  readonly input: string;
  readonly form: SpecifierForm;
  readonly why: string;
};

/**
 * The classification space, enumerated.
 *
 * The rules this table pins down run **towards** the two closed sets and let
 * everything else be a path. A scheme is one of the seven Deno resolves a
 * module under. A JSR or npm coordinate is exactly one of `name`,
 * `name@version`, `@scope/name`, `@scope/name@version` or
 * `@scope/name/sub-entrypoint`; every one either starts with `@` or holds no
 * `/`; therefore a non-scheme input that holds a `/` outside a scope is a path.
 *
 * The coordinate rule used to run the other way — list the path spellings, call
 * the rest a registry name — and that list leaked five times, because the set of
 * ways to spell a path is open-ended and the set of ways to spell a coordinate
 * is not. The last leak was `arp/`, which shell tab-completion produces for a
 * directory and which expanded to `jsr:@binstruct/arp/`, decoding against the
 * published package while a local `arp/` sat in the working directory
 * (ADR 0004).
 *
 * The scheme rule leaked next, for the same reason: it was a pattern over an
 * unbounded space of spellings, so `my:dir/mod.ts` was a scheme and passed
 * through unanchored while `deno doc` resolved it as a relative path. It is a
 * set now, and the rows below are what a set buys.
 *
 * So the space is written out. Every shape of coordinate, every shape of path,
 * each of those with a trailing slash, and the degenerate inputs that are
 * neither. A future gap should read as a missing row here rather than as a
 * wrong answer in the field.
 */
const classifications: readonly ClassificationCase[] = [
  // ── has a scheme ────────────────────────────────────────────────────────
  { input: "jsr:@binstruct/png", form: "scheme", why: "jsr coordinate" },
  { input: "jsr:@binstruct/png/", form: "scheme", why: "trailing slash" },
  { input: "npm:foo", form: "scheme", why: "npm bare name" },
  { input: "npm:foo/", form: "scheme", why: "trailing slash" },
  { input: "npm:@scope/foo@1.2.3", form: "scheme", why: "npm coordinate" },
  { input: "http://example.com/mod.ts", form: "scheme", why: "remote url" },
  { input: "https://example.com/mod.ts", form: "scheme", why: "remote url" },
  { input: "file:///abs/mod.ts", form: "scheme", why: "local file url" },
  { input: "file:///abs/pkg", form: "scheme", why: "local directory url" },
  { input: "file:///abs/pkg/", form: "scheme", why: "trailing slash" },
  { input: "node:fs", form: "scheme", why: "a built-in module" },
  { input: "data:text/plain,x", form: "scheme", why: "inline source" },

  // ── a colon that is not one of those seven ──────────────────────────────
  // The scheme rule is a closed set, not a pattern. `^[a-z][a-z0-9+.-]+:`
  // matched any word before a colon, so `my:dir/mod.ts` — an ordinary relative
  // path whose first segment holds one — was called a scheme, passed through
  // unanchored and never stat'ed, while `deno doc` read it as the path it is.
  // What is left of such an input is classified on its own terms: it holds a
  // slash, so it is a path; it holds none, so it is a name.
  { input: "my:dir/mod.ts", form: "path", why: "no such scheme, and a slash" },
  { input: "gopher:x", form: "bare", why: "no such scheme, and no slash" },
  { input: "ab:x", form: "bare", why: "two characters is not a scheme" },
  { input: "jsrx:@binstruct/png", form: "path", why: "not jsr:" },
  { input: "c:", form: "bare", why: "a drive prefix is not a scheme" },
  { input: "C:", form: "bare", why: "uppercase drive prefix, no slash" },
  { input: "c:/tmp/pkg", form: "path", why: "drive path holds a slash" },
  { input: "C:/tmp/mod.ts", form: "path", why: "drive path with a module" },
  { input: "JSR:@binstruct/png", form: "path", why: "membership is cased" },
  { input: "FILE:///abs/pkg", form: "path", why: "membership is cased" },

  // ── starts with `@`: a registry coordinate, in every one of its shapes ───
  { input: "@hertzg/xhb", form: "scoped", why: "@scope/name" },
  { input: "@binstruct/png", form: "scoped", why: "@scope/name" },
  { input: "@binstruct/wav@0.2.0", form: "scoped", why: "@scope/name@version" },
  { input: "@binstruct/png/sub", form: "scoped", why: "@scope/name/entry" },
  { input: "@binstruct/png/", form: "scoped", why: "trailing slash" },
  { input: "@binstruct/png/mod.ts", form: "scoped", why: "a scope wins" },
  { input: "@", form: "scoped", why: "degenerate, expands and fails at load" },

  // ── holds a `/` outside a scope: a path, whatever else it looks like ─────
  { input: "./x", form: "path", why: "relative" },
  { input: "./x/", form: "path", why: "trailing slash" },
  { input: "../up", form: "path", why: "relative, upwards" },
  { input: "/abs/x", form: "path", why: "absolute" },
  { input: "/abs/x/", form: "path", why: "trailing slash" },
  { input: "/", form: "path", why: "the root directory" },
  { input: "pkg/mod.ts", form: "path", why: "a module below the cwd" },
  { input: "arp/", form: "path", why: "what tab-completion types" },
  { input: "png/", form: "path", why: "a registry name is not a directory" },
  { input: "wav@0.2.0/", form: "path", why: "a version is not one either" },
  { input: "nested/inner", form: "path", why: "two segments, no scope" },
  {
    input: "packages/@binstruct/png/mod.ts",
    form: "path",
    why: "a scope within",
  },
  { input: "./@scope/pkg", form: "path", why: "the `@` is not first" },
  { input: "mod.ts/", form: "path", why: "trailing slash" },

  // ── holds no `/`: a path only by a leading `.` or a module extension ─────
  // Both rules can only move an input towards `"path"`, so neither can produce
  // the fallthrough the leaks were made of.
  { input: ".", form: "path", why: "the working directory" },
  { input: "..", form: "path", why: "the parent directory" },
  { input: ".hidden", form: "path", why: "a leading dot is a path marker" },
  { input: "mod.ts", form: "path", why: "module extension" },
  { input: "mod.tsx", form: "path", why: "module extension" },
  { input: "mod.mts", form: "path", why: "module extension" },
  { input: "mod.cts", form: "path", why: "module extension" },
  { input: "mod.js", form: "path", why: "module extension" },
  { input: "mod.jsx", form: "path", why: "module extension" },
  { input: "mod.mjs", form: "path", why: "module extension" },
  { input: "mod.cjs", form: "path", why: "module extension" },

  // ── none of the above: a bare name in the implied scope ─────────────────
  { input: "png", form: "bare", why: "the common case" },
  { input: "tls-record", form: "bare", why: "a hyphen is part of a name" },
  { input: "wav@0.2.0", form: "bare", why: "name@version" },
  { input: "xhb", form: "bare", why: "unconditional: no cross-scope lookup" },
  { input: "deno.json", form: "bare", why: "not a module extension" },
  { input: "", form: "bare", why: "degenerate, expands and fails at load" },
];

Deno.test("classification enumerates the registry coordinate, not the path", async (t) => {
  for (const { input, form, why } of classifications) {
    const shown = input === "" ? "<empty>" : input;
    await t.step(`${shown} -> ${form} (${why})`, () => {
      assertEquals(resolveSpecifier(input).form, form);
    });
  }
});

Deno.test("classification leaves no shape unaccounted for", () => {
  // The table is the guarantee, so it has to actually reach every branch: a
  // row deleted by accident would otherwise leave a form silently untested.
  const covered = new Set(classifications.map((row) => row.form));
  const forms: readonly SpecifierForm[] = ["scheme", "path", "scoped", "bare"];

  assertEquals(forms.filter((form) => !covered.has(form)), []);
});

Deno.test("resolveSpecifier resolves by first match", async (t) => {
  for (const { input, specifier, form, short } of cases) {
    await t.step(`${input === "" ? "<empty>" : input} -> ${specifier}`, () => {
      assertEquals(resolveSpecifier(input), {
        input,
        specifier,
        short,
        form,
        shorthand: form === "scoped" || form === "bare",
      });
    });
  }
});

Deno.test("resolveSpecifier anchors a path to the working directory", () => {
  // `deno doc` reads a relative specifier against the process's working
  // directory and `import()` reads it against this module, so leaving one
  // relative had discovery and execution looking at two different files —
  // silently importing whatever sat next to specifier.ts under that name.
  const relative = resolveSpecifier("./pkg/mod.ts");

  assertEquals(
    relative.specifier,
    toFileUrl(join(Deno.cwd(), "pkg/mod.ts")).href,
  );
  assertEquals(relative.specifier.startsWith(import.meta.url), false);
  assertEquals(relative.short, "./pkg/mod.ts");
  assertEquals(relative.input, "./pkg/mod.ts");
});

Deno.test("resolveSpecifier leaves an explicit file URL alone", () => {
  const url = import.meta.resolve("./specifier.ts");
  const resolved = resolveSpecifier(url);

  assertEquals(resolved.form, "scheme");
  assertEquals(resolved.specifier, url);
  assertEquals(resolved.short, url);
});

Deno.test("resolveSpecifier flags shorthand but not explicit forms", () => {
  assertEquals(resolveSpecifier("png").shorthand, true);
  assertEquals(resolveSpecifier("@hertzg/xhb").shorthand, true);
  assertEquals(resolveSpecifier("jsr:@binstruct/png").shorthand, false);
  assertEquals(resolveSpecifier("./local").shorthand, false);
  assertEquals(resolveSpecifier("./local/mod.ts").shorthand, false);
});

Deno.test("resolveSpecifier accepts every module extension the runtime loads", () => {
  // `.mts` was missing once, and `./pkg/mod.mts` — a module `deno doc` reads
  // and `import()` loads — was classified as a directory and refused, with a
  // TRY line pointing at `./pkg/mod.mts/mod.ts`, which cannot exist.
  for (
    const extension of [
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ]
  ) {
    assertEquals(resolveSpecifier(`pkg/mod${extension}`).form, "path");
  }
});

Deno.test("resolveSpecifier does not decide file or directory from the spelling", async (t) => {
  // Which one it is is a fact about the target, not about how the argument was
  // typed, so classification stops at "this is a path" and `inspectLocalTarget`
  // stats the target.
  await t.step("a directory and the module inside it are the same form", () => {
    for (
      const input of ["./pkg", "../pkg", "/abs/pkg", ".", "./pkg/", "pkg/"]
    ) {
      assertEquals(resolveSpecifier(input).form, "path");
    }
    assertEquals(resolveSpecifier("./pkg/mod.ts").form, "path");
  });

  await t.step("every spelling of one directory resolves to one URL", () => {
    // The refusal keys off the resolved target, so these have to agree: a
    // trailing slash, a bare relative name and a `file:` URL are the same
    // directory as `./pkg`. `pkg/` used to resolve to `jsr:@binstruct/pkg/`
    // and reach the registry instead.
    const url = underCwd("./pkg");

    assertEquals(resolveSpecifier("./pkg").specifier, url);
    assertEquals(resolveSpecifier("./pkg/").specifier, url);
    assertEquals(resolveSpecifier("pkg/").specifier, url);
    assertEquals(resolveSpecifier(url).specifier, url);
  });

  await t.step("nothing on disk is consulted", () => {
    // Neither of these exists, and the classification does not go looking:
    // resolution stays a function of the input string and the working
    // directory, which is what ADR 0004 promises.
    assertEquals(resolveSpecifier("./nowhere/mod.ts").form, "path");
    assertEquals(resolveSpecifier("./nowhere").form, "path");
  });
});

Deno.test("resolveSpecifier admits only the schemes deno resolves", async (t) => {
  await t.step("each of the seven passes through unchanged", () => {
    for (
      const input of [
        "jsr:@binstruct/png",
        "npm:foo",
        "http://example.com/mod.ts",
        "https://example.com/mod.ts",
        "file:///abs/mod.ts",
        "node:fs",
        "data:text/plain,x",
      ]
    ) {
      const resolved = resolveSpecifier(input);
      assertEquals(resolved.form, "scheme", input);
      assertEquals(resolved.specifier, input);
    }
  });

  await t.step("a colon that is not one of them is part of a path", () => {
    // The leak: `^[a-z][a-z0-9+.-]+:` matched `my:`, so a relative path whose
    // first segment held a colon was classified `scheme`, went to `deno doc`
    // and to `import()` unanchored, and reached neither `Deno.cwd()` nor
    // `inspectLocalTarget` — while `deno doc` resolved it against the working
    // directory as the path it plainly is.
    const resolved = resolveSpecifier("my:dir/mod.ts");

    assertEquals(resolved.form, "path");
    assertEquals(resolved.short, "my:dir/mod.ts");
    assertEquals(resolved.specifier, underCwd("my:dir/mod.ts"));
  });

  await t.step("an unknown scheme with no slash is a bare name", () => {
    assertEquals(resolveSpecifier("gopher:x").form, "bare");
    assertEquals(resolveSpecifier("ab:x").form, "bare");
  });

  await t.step("membership is case-sensitive", () => {
    assertEquals(resolveSpecifier("FILE:///abs/pkg").form, "path");
    assertEquals(resolveSpecifier("JSR:@binstruct/png").form, "path");
  });

  await t.step("the closure does not disturb the other rows", () => {
    // Every shape that was already classified stays classified the same way;
    // closing the scheme rule is meant to move exactly one class of input.
    const unchanged: readonly [string, SpecifierForm][] = [
      ["png", "bare"],
      ["wav@0.2.0", "bare"],
      ["@hertzg/xhb", "scoped"],
      ["jsr:@binstruct/png", "scheme"],
      ["npm:foo", "scheme"],
      ["https://example.com/mod.ts", "scheme"],
      ["./x", "path"],
      ["arp/", "path"],
      ["nested/inner", "path"],
      ["mod.ts", "path"],
    ];

    for (const [input, form] of unchanged) {
      assertEquals(resolveSpecifier(input).form, form, input);
    }
  });
});

Deno.test("resolveSpecifier does not read a drive prefix as a scheme", async (t) => {
  await t.step("a single-letter drive prefix is not a scheme", () => {
    const resolved = resolveSpecifier("C:");
    assertEquals(resolved.form, "bare");
    assertEquals(resolved.specifier, "jsr:@binstruct/C:");
  });

  await t.step(
    "a lowercase single-letter prefix is not a scheme either",
    () => {
      // Not a scheme, and not a coordinate either: it holds a slash outside a
      // scope, so it is a path. It used to expand to
      // `jsr:@binstruct/c:/tmp/pkg`, which names nothing anyone could have
      // meant.
      const resolved = resolveSpecifier("c:/tmp/pkg");
      assertEquals(resolved.form, "path");
      assertEquals(resolved.short, "c:/tmp/pkg");
      assertStringIncludes(resolved.specifier, "file://");
    },
  );

  await t.step("a drive path with a module extension is a path", () => {
    const resolved = resolveSpecifier("C:/tmp/mod.ts");
    assertEquals(resolved.form, "path");
    assertEquals(resolved.short, "C:/tmp/mod.ts");
    assertStringIncludes(resolved.specifier, "file://");
  });

  await t.step("an uppercase scheme is not matched", () => {
    // It is not a scheme, and the slash then makes it a path rather than a
    // name — `jsr:@binstruct/JSR:@binstruct/png` was never a useful answer.
    assertEquals(resolveSpecifier("JSR:@binstruct/png").form, "path");
  });
});

Deno.test("resolveSpecifier treats the empty string as a bare name", () => {
  assertEquals(resolveSpecifier(""), {
    input: "",
    specifier: "jsr:@binstruct/",
    short: "",
    form: "bare",
    shorthand: true,
  });
});

Deno.test("resolveSpecifier consults nothing outside its argument", () => {
  const nonexistent = resolveSpecifier("definitely-not-a-package");
  assertEquals(
    nonexistent.specifier,
    "jsr:@binstruct/definitely-not-a-package",
  );
  assertEquals(nonexistent.form, "bare");
});

Deno.test("isModulePath agrees with the classifier about what a module is", () => {
  // The directory refusal lists module files with this predicate and the
  // classifier accepts them with the same one, so a name offered in a `TRY`
  // line cannot be a name the next invocation rejects.
  for (
    const name of [
      "mod.ts",
      "mod.tsx",
      "mod.mts",
      "mod.cts",
      "mod.js",
      "mod.jsx",
      "mod.mjs",
      "mod.cjs",
    ]
  ) {
    assertEquals(isModulePath(name), true);
    assertEquals(resolveSpecifier(`./pkg/${name}`).form, "path");
  }

  for (
    const name of ["deno.json", "README.md", "mod", "data.bin", ".gitignore"]
  ) {
    assertEquals(isModulePath(name), false);
  }
});

Deno.test("shortenSpecifier drops the implied scheme and scope", () => {
  assertEquals(shortenSpecifier("jsr:@binstruct/png"), "png");
  assertEquals(shortenSpecifier("jsr:@binstruct/wav@0.2.0"), "wav@0.2.0");
  assertEquals(shortenSpecifier("jsr:@hertzg/xhb"), "@hertzg/xhb");
  assertEquals(shortenSpecifier("npm:foo"), "npm:foo");
  assertEquals(shortenSpecifier("./local"), "./local");
  assertEquals(shortenSpecifier("mod.ts"), "mod.ts");
});

Deno.test("shortenSpecifier never proposes a form that reads back differently", () => {
  // The bare candidate "mod.ts" reads back as a path, so it is rejected; the
  // scoped one survives, because a leading `@` is a coordinate whatever
  // follows it.
  assertEquals(shortenSpecifier("jsr:@binstruct/mod.ts"), "@binstruct/mod.ts");
  assertEquals(
    resolveSpecifier("@binstruct/mod.ts").specifier,
    "jsr:@binstruct/mod.ts",
  );
  // Here too: "./png" is a path, "@binstruct/./png" is not.
  assertEquals(shortenSpecifier("jsr:@binstruct/./png"), "@binstruct/./png");
  // A sub-entrypoint keeps its scope for the same reason: "png/sub" holds a
  // slash outside a scope and would be read back as a path.
  assertEquals(
    shortenSpecifier("jsr:@binstruct/png/sub"),
    "@binstruct/png/sub",
  );
});

Deno.test("shortenSpecifier round-trips through resolveSpecifier", async (t) => {
  for (const { specifier } of cases) {
    await t.step(specifier, () => {
      assertEquals(
        resolveSpecifier(shortenSpecifier(specifier)).specifier,
        specifier,
      );
    });
  }
});
