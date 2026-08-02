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
    for (const input of ["./pkg", "../pkg", "/abs/pkg", ".", "./pkg/"]) {
      assertEquals(resolveSpecifier(input).form, "path");
    }
    assertEquals(resolveSpecifier("./pkg/mod.ts").form, "path");
  });

  await t.step("every spelling of one directory resolves to one URL", () => {
    // The refusal keys off the resolved target, so these have to agree: a
    // trailing slash and a `file:` URL are the same directory as `./pkg`.
    const url = underCwd("./pkg");

    assertEquals(resolveSpecifier("./pkg").specifier, url);
    assertEquals(resolveSpecifier("./pkg/").specifier, url);
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

Deno.test("resolveSpecifier requires two lowercase characters for a scheme", async (t) => {
  await t.step("a single-letter drive prefix is not a scheme", () => {
    const resolved = resolveSpecifier("C:");
    assertEquals(resolved.form, "bare");
    assertEquals(resolved.specifier, "jsr:@binstruct/C:");
  });

  await t.step(
    "a lowercase single-letter prefix is not a scheme either",
    () => {
      const resolved = resolveSpecifier("c:/tmp/pkg");
      assertEquals(resolved.form, "bare");
      assertEquals(resolved.specifier, "jsr:@binstruct/c:/tmp/pkg");
    },
  );

  await t.step("a drive path with a module extension is a path", () => {
    const resolved = resolveSpecifier("C:/tmp/mod.ts");
    assertEquals(resolved.form, "path");
    assertEquals(resolved.short, "C:/tmp/mod.ts");
    assertStringIncludes(resolved.specifier, "file://");
  });

  await t.step("an uppercase scheme is not matched", () => {
    assertEquals(resolveSpecifier("JSR:@binstruct/png").form, "bare");
  });

  await t.step("two characters are enough", () => {
    assertEquals(resolveSpecifier("ab:x").form, "scheme");
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
  // Both candidate shortenings ("mod.ts" and "@binstruct/mod.ts") would be
  // read back as paths, so nothing is shortened at all.
  assertEquals(
    shortenSpecifier("jsr:@binstruct/mod.ts"),
    "jsr:@binstruct/mod.ts",
  );
  // Here the scoped candidate survives even though the bare one does not.
  assertEquals(shortenSpecifier("jsr:@binstruct/./png"), "@binstruct/./png");
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
