/**
 * Tests for local target inspection.
 *
 * The point of every case here is that the answer follows the **target**, not
 * the spelling: a path, an absolute path, a `file:` URL, a trailing slash and a
 * symlink that all lead to one directory have to reach one decision.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { toFileUrl } from "@std/path";
import { inspectLocalTarget } from "./target.ts";

/**
 * Builds a directory holding two modules and two non-modules.
 *
 * @returns The directory, realpathed, to be removed by the caller
 */
async function fixture(): Promise<string> {
  const directory = await Deno.realPath(await Deno.makeTempDir());

  await Deno.writeTextFile(`${directory}/mod.ts`, "export const a = 1;\n");
  await Deno.writeTextFile(
    `${directory}/aaa_other.mts`,
    "export const b = 2;\n",
  );
  await Deno.writeTextFile(`${directory}/deno.json`, "{}\n");
  await Deno.writeTextFile(`${directory}/README.md`, "hello\n");
  await Deno.mkdir(`${directory}/nested`);

  return directory;
}

Deno.test("inspectLocalTarget does not touch a specifier from elsewhere", async () => {
  for (
    const specifier of [
      "jsr:@binstruct/png",
      "npm:foo",
      "https://example.com/mod.ts",
    ]
  ) {
    assertEquals((await inspectLocalTarget(specifier)).kind, "elsewhere");
  }
});

Deno.test("inspectLocalTarget calls a file a module", async () => {
  const target = await inspectLocalTarget(import.meta.resolve("./target.ts"));

  assertEquals(target.kind, "module");
});

Deno.test("inspectLocalTarget lists the modules of a directory", async () => {
  const directory = await fixture();
  try {
    const target = await inspectLocalTarget(toFileUrl(directory).href);

    assert(target.kind === "directory", "the target is a directory");
    // Sorted, module files only: no `deno.json`, no `README.md`, no `nested`.
    assertEquals(target.modules, ["aaa_other.mts", "mod.ts"]);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a trailing slash is the same directory", async () => {
  const directory = await fixture();
  try {
    const url = toFileUrl(directory).href;

    for (const specifier of [url, `${url}/`]) {
      const target = await inspectLocalTarget(specifier);

      assert(target.kind === "directory", `${specifier} is a directory`);
      assertEquals(target.modules, ["aaa_other.mts", "mod.ts"]);
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a symlink to a directory is a directory", async () => {
  // `Deno.stat` follows symlinks, which is what makes the decision a fact
  // about the target rather than about the name it was reached by.
  const directory = await fixture();
  const link = `${directory}-link`;
  try {
    await Deno.symlink(directory, link);

    const target = await inspectLocalTarget(toFileUrl(link).href);

    assert(target.kind === "directory", "a link to a directory is one");
    assertEquals(target.modules, ["aaa_other.mts", "mod.ts"]);
  } finally {
    await Deno.remove(link);
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("an empty directory is a directory with nothing to offer", async () => {
  const directory = await Deno.realPath(await Deno.makeTempDir());
  try {
    const target = await inspectLocalTarget(toFileUrl(directory).href);

    assert(target.kind === "directory", "the target is a directory");
    assertEquals(target.modules, []);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("nothing at the path is its own answer", async () => {
  const target = await inspectLocalTarget(
    import.meta.resolve("./no-such-module.ts"),
  );

  assertEquals(target.kind, "missing");
});

Deno.test("a listed module is one the next invocation can actually name", async (t) => {
  // `Deno.readDir` reports what it finds without following links, so a symlink
  // is neither a file nor a directory to it. Filtering on `isDirectory` alone
  // listed a dangling `aaa_link.ts` as a module and — sorting first — put it in
  // the `TRY` line, where it failed with `no such path`; a `*.ts` link leading
  // to a directory landed straight back on the directory refusal. The listing
  // is the refusal's only suggestion, so it must never name either.
  const directory = await fixture();
  try {
    await Deno.symlink(`${directory}/nowhere.ts`, `${directory}/aaa_dead.ts`);
    await Deno.symlink(`${directory}/nested`, `${directory}/aaa_dir.ts`);
    await Deno.symlink(`${directory}/mod.ts`, `${directory}/aaa_live.ts`);

    const target = await inspectLocalTarget(toFileUrl(directory).href);

    assert(target.kind === "directory", "the target is a directory");

    await t.step("a dangling symlink is not a module", () => {
      assertEquals(target.modules.includes("aaa_dead.ts"), false);
    });

    await t.step("a symlink to a directory is not a module", () => {
      assertEquals(target.modules.includes("aaa_dir.ts"), false);
    });

    await t.step("a symlink to a real module still is one", () => {
      // The filter follows the link rather than rejecting every link, because
      // `import()` follows it too.
      assertEquals(target.modules, ["aaa_live.ts", "aaa_other.mts", "mod.ts"]);
    });
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("a file: specifier that is not a URL is refused, not thrown", async () => {
  // `fromFileUrl` sat outside the try that guards the stat, so
  // `binstruct "file://a b/x"` escaped as an uncaught TypeError and a stack
  // trace. `unreadable` already models exactly this.
  const target = await inspectLocalTarget("file://a b/x");

  assert(target.kind === "unreadable", "a malformed URL is unreadable");
  assertStringIncludes(target.reason, "file://a b/x");
});
