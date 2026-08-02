import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { KNOWN_PACKAGES } from "./registry.ts";

const scopeDir = fromFileUrl(new URL("../", import.meta.url));

async function scopeDirectoryNames(): Promise<Set<string>> {
  const names = new Set<string>();
  for await (const entry of Deno.readDir(scopeDir)) {
    if (entry.isDirectory) {
      names.add(entry.name);
    }
  }
  return names;
}

Deno.test("KNOWN_PACKAGES is not empty", () => {
  assert(KNOWN_PACKAGES.length > 0);
});

Deno.test("KNOWN_PACKAGES is sorted alphabetically", () => {
  assertEquals([...KNOWN_PACKAGES], [...KNOWN_PACKAGES].sort());
});

Deno.test("KNOWN_PACKAGES has no duplicates", () => {
  assertEquals(new Set(KNOWN_PACKAGES).size, KNOWN_PACKAGES.length);
});

Deno.test("KNOWN_PACKAGES holds short names, not JSR coordinates", () => {
  for (const name of KNOWN_PACKAGES) {
    assertEquals(name.includes("/"), false);
    assertEquals(name.includes("@"), false);
  }
});

Deno.test("KNOWN_PACKAGES excludes the cli package itself", () => {
  assertEquals(KNOWN_PACKAGES.includes("cli"), false);
});

Deno.test("every entry names a real @binstruct workspace directory", async () => {
  const directories = await scopeDirectoryNames();
  for (const name of KNOWN_PACKAGES) {
    assert(
      directories.has(name),
      `registry entry "${name}" has no packages/@binstruct/${name} directory`,
    );
  }
});

Deno.test("known format packages are present", () => {
  for (const name of ["png", "tcp", "wav", "pcap"]) {
    assert(
      KNOWN_PACKAGES.includes(name),
      `expected "${name}" in the registry`,
    );
  }
});
