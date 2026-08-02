/**
 * Tests for local target inspection.
 *
 * The point of every case here is that the answer follows the **target**, not
 * the spelling: a path, an absolute path, a `file:` URL, a trailing slash and a
 * symlink that all lead to one directory have to reach one decision.
 */

import { assert, assertEquals } from "@std/assert";
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
