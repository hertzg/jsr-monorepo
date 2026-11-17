/**
 * Tests for local target inspection.
 *
 * The point of every case here is that the answer follows the **target**, not
 * the spelling: a path, an absolute path, a `file:` URL, a trailing slash and a
 * symlink that all lead to one directory have to reach one decision.
 */

import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { join, toFileUrl } from "@std/path";
import { inspectLocalTarget } from "./target.ts";

/**
 * Makes a fresh temporary directory.
 *
 * @returns The directory, realpathed, to be removed by the caller
 */
async function makeTempDir(): Promise<string> {
  return await realpath(await mkdtemp(join(tmpdir(), "binstruct-cli-")));
}

/**
 * Builds a directory holding two modules and two non-modules.
 *
 * @returns The directory, realpathed, to be removed by the caller
 */
async function fixture(): Promise<string> {
  const directory = await makeTempDir();

  await writeFile(`${directory}/mod.ts`, "export const a = 1;\n");
  await writeFile(
    `${directory}/aaa_other.mts`,
    "export const b = 2;\n",
  );
  await writeFile(`${directory}/deno.json`, "{}\n");
  await writeFile(`${directory}/README.md`, "hello\n");
  await mkdir(`${directory}/nested`);

  return directory;
}

test("inspectLocalTarget does not touch a specifier from elsewhere", async () => {
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

test("inspectLocalTarget calls a file a module", async () => {
  const target = await inspectLocalTarget(import.meta.resolve("./target.ts"));

  assertEquals(target.kind, "module");
});

test("inspectLocalTarget lists the modules of a directory", async () => {
  const directory = await fixture();
  try {
    const target = await inspectLocalTarget(toFileUrl(directory).href);

    assert(target.kind === "directory", "the target is a directory");
    // Sorted, module files only: no `deno.json`, no `README.md`, no `nested`.
    assertEquals(target.modules, ["aaa_other.mts", "mod.ts"]);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("a trailing slash is the same directory", async () => {
  const directory = await fixture();
  try {
    const url = toFileUrl(directory).href;

    for (const specifier of [url, `${url}/`]) {
      const target = await inspectLocalTarget(specifier);

      assert(target.kind === "directory", `${specifier} is a directory`);
      assertEquals(target.modules, ["aaa_other.mts", "mod.ts"]);
    }
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("a symlink to a directory is a directory", async () => {
  // `stat` follows symlinks, which is what makes the decision a fact
  // about the target rather than about the name it was reached by.
  const directory = await fixture();
  const link = `${directory}-link`;
  try {
    await symlink(directory, link);

    const target = await inspectLocalTarget(toFileUrl(link).href);

    assert(target.kind === "directory", "a link to a directory is one");
    assertEquals(target.modules, ["aaa_other.mts", "mod.ts"]);
  } finally {
    await rm(link);
    await rm(directory, { recursive: true });
  }
});

test("an empty directory is a directory with nothing to offer", async () => {
  const directory = await makeTempDir();
  try {
    const target = await inspectLocalTarget(toFileUrl(directory).href);

    assert(target.kind === "directory", "the target is a directory");
    assertEquals(target.modules, []);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("nothing at the path is its own answer", async () => {
  const target = await inspectLocalTarget(
    import.meta.resolve("./no-such-module.ts"),
  );

  assertEquals(target.kind, "missing");
});

test("a listed module is one the next invocation can actually name", async (t) => {
  // `readdir` reports what it finds without following links, so a symlink
  // is neither a file nor a directory to it. Filtering on `isDirectory` alone
  // listed a dangling `aaa_link.ts` as a module and — sorting first — put it in
  // the `TRY` line, where it failed with `no such path`; a `*.ts` link leading
  // to a directory landed straight back on the directory refusal. The listing
  // is the refusal's only suggestion, so it must never name either.
  const directory = await fixture();
  try {
    await symlink(`${directory}/nowhere.ts`, `${directory}/aaa_dead.ts`);
    await symlink(`${directory}/nested`, `${directory}/aaa_dir.ts`);
    await symlink(`${directory}/mod.ts`, `${directory}/aaa_live.ts`);

    const target = await inspectLocalTarget(toFileUrl(directory).href);

    assert(target.kind === "directory", "the target is a directory");

    await t.test("a dangling symlink is not a module", () => {
      assertEquals(target.modules.includes("aaa_dead.ts"), false);
    });

    await t.test("a symlink to a directory is not a module", () => {
      assertEquals(target.modules.includes("aaa_dir.ts"), false);
    });

    await t.test("a symlink to a real module still is one", () => {
      // The filter follows the link rather than rejecting every link, because
      // `import()` follows it too.
      assertEquals(target.modules, ["aaa_live.ts", "aaa_other.mts", "mod.ts"]);
    });
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("a file: specifier that is not a URL is refused, not thrown", async () => {
  // `fromFileUrl` sat outside the try that guards the stat, so
  // `binstruct "file://a b/x"` escaped as an uncaught TypeError and a stack
  // trace. `unreadable` already models exactly this.
  const target = await inspectLocalTarget("file://a b/x");

  assert(target.kind === "unreadable", "a malformed URL is unreadable");
  assertStringIncludes(target.reason, "file://a b/x");
});
