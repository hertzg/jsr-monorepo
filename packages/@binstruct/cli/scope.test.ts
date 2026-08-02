/**
 * Tests for the `@binstruct` scope listing.
 *
 * Nothing here touches the network or the real cache directory: `fetch`,
 * `Deno.permissions.query` and the cache location are all supplied by the
 * test, so every path — fresh, cached, stale, refused, unreadable — is
 * reachable without one.
 */

import { assertEquals } from "@std/assert";
import { returnsNext, stub } from "@std/testing/mock";
import { join } from "@std/path";
import { listScopePackages, readScopeListing } from "./scope.ts";

/** A body shaped like JSR's answer, trimmed to the fields that are read. */
const ITEMS = [
  { scope: "binstruct", name: "png", description: "PNG image file format." },
  { scope: "binstruct", name: "arp", description: "ARP packets, RFC 826." },
  { scope: "binstruct", name: "cli", description: "This tool." },
];

/**
 * Stubs `fetch` with a fixed sequence of answers.
 *
 * An `Error` in the sequence is thrown by that call, which is what
 * {@linkcode returnsNext} does with one and what the module treats the same as
 * a rejection.
 *
 * @param answers What each call answers with, in order
 * @returns The stub, to be disposed by the caller
 */
function stubFetch(answers: (Response | Error)[]) {
  return stub(
    globalThis,
    "fetch",
    returnsNext<Promise<Response>>(
      answers.map((answer) =>
        answer instanceof Error ? answer : Promise.resolve(answer)
      ),
    ),
  );
}

/**
 * Stubs the permission query so a single permission reads as denied.
 *
 * @param denied The permission name to refuse
 * @returns The stub, to be disposed by the caller
 */
function denyPermission(denied: Deno.PermissionDescriptor["name"]) {
  return stub(
    Deno.permissions,
    "query",
    (descriptor: Deno.PermissionDescriptor) =>
      Promise.resolve({
        state: descriptor.name === denied ? "denied" : "granted",
        onchange: null,
        partial: false,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      } as unknown as Deno.PermissionStatus),
  );
}

Deno.test("readScopeListing keeps names, drops the cli, and sorts", () => {
  assertEquals(readScopeListing({ items: ITEMS }), [
    { name: "arp", description: "ARP packets, RFC 826." },
    { name: "png", description: "PNG image file format." },
  ]);
});

Deno.test("readScopeListing tolerates entries missing a description", () => {
  assertEquals(readScopeListing({ items: [{ name: "tar" }] }), [
    { name: "tar", description: "" },
  ]);
});

Deno.test("readScopeListing rejects a body that is not a listing", () => {
  assertEquals(readScopeListing(undefined), undefined);
  assertEquals(readScopeListing(null), undefined);
  assertEquals(readScopeListing(42), undefined);
  assertEquals(readScopeListing("<!doctype html>"), undefined);
  assertEquals(readScopeListing({ error: "not found" }), undefined);
  assertEquals(readScopeListing({ items: {} }), undefined);
});

Deno.test("readScopeListing skips entries with no usable name", () => {
  assertEquals(
    readScopeListing({ items: [null, {}, { name: "" }, { name: 7 }] }),
    [],
  );
});

Deno.test("a listing is fetched, and the CLI itself is not in it", async () => {
  using _fetch = stubFetch([Response.json({ items: ITEMS })]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "network");
  assertEquals(listing.packages.map(({ name }) => name), ["arp", "png"]);
  assertEquals(listing.reason, undefined);
});

Deno.test("a non-200 answer leaves an empty list and its status", async () => {
  using _fetch = stubFetch([
    new Response("not found", { status: 404 }),
  ]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(listing.reason, "jsr.io answered 404");
});

Deno.test("a body that is not a listing leaves an empty list", async () => {
  using _fetch = stubFetch([Response.json({ message: "nope" })]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(listing.reason, "jsr.io answered no package listing");
});

Deno.test("a body that is not JSON leaves an empty list", async () => {
  using _fetch = stubFetch([
    new Response("<!doctype html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
  ]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(typeof listing.reason, "string");
});

Deno.test("a network error leaves an empty list and its message", async () => {
  using _fetch = stubFetch([new TypeError("error sending request")]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(listing.reason, "error sending request");
});

Deno.test("without --allow-net nothing is requested", async () => {
  using fetchStub = stubFetch([Response.json({ items: ITEMS })]);
  using _denied = denyPermission("net");

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(fetchStub.calls.length, 0);
  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(
    listing.reason,
    "listing packages needs --allow-net=jsr.io, and it was not granted",
  );
});

Deno.test("a fresh cache answers without a request", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    using fetchStub = stubFetch([Response.json({ items: ITEMS })]);

    const first = await listScopePackages({ cacheDir, now: 1_000 });
    assertEquals(first.source, "network");

    const second = await listScopePackages({ cacheDir, now: 2_000 });

    assertEquals(second.source, "cache");
    assertEquals(second.packages, first.packages);
    assertEquals(fetchStub.calls.length, 1);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("an expired cache is refreshed", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    using fetchStub = stubFetch([
      Response.json({ items: ITEMS }),
      Response.json({
        items: [...ITEMS, { name: "wav", description: "WAV." }],
      }),
    ]);

    await listScopePackages({ cacheDir, now: 0, ttl: 10 });
    const refreshed = await listScopePackages({ cacheDir, now: 100, ttl: 10 });

    assertEquals(refreshed.source, "network");
    assertEquals(refreshed.packages.map(({ name }) => name), [
      "arp",
      "png",
      "wav",
    ]);
    assertEquals(fetchStub.calls.length, 2);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("a failed refresh falls back to the expired cache", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    using _fetch = stubFetch([
      Response.json({ items: ITEMS }),
      new TypeError("offline"),
    ]);

    await listScopePackages({ cacheDir, now: 0, ttl: 10 });
    const stale = await listScopePackages({ cacheDir, now: 100, ttl: 10 });

    assertEquals(stale.source, "stale-cache");
    assertEquals(stale.packages.map(({ name }) => name), ["arp", "png"]);
    assertEquals(stale.reason, "offline");
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("an offline run with no cache is still an answer", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    using _fetch = stubFetch([new TypeError("offline")]);

    const listing = await listScopePackages({ cacheDir, now: 0 });

    assertEquals(listing.source, "none");
    assertEquals(listing.packages, []);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("a corrupt cache file is a miss, not a crash", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(cacheDir, "scope-binstruct.json"),
      "{ truncated",
    );
    using _fetch = stubFetch([Response.json({ items: ITEMS })]);

    const listing = await listScopePackages({ cacheDir, now: 0 });

    assertEquals(listing.source, "network");
    assertEquals(listing.packages.map(({ name }) => name), ["arp", "png"]);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("a cache file without a timestamp is a miss", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(cacheDir, "scope-binstruct.json"),
      JSON.stringify({ items: ITEMS }),
    );
    using _fetch = stubFetch([new TypeError("offline")]);

    const listing = await listScopePackages({ cacheDir, now: 0 });

    assertEquals(listing.source, "none");
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("an unwritable cache costs a request, not a failure", async () => {
  using fetchStub = stubFetch([
    Response.json({ items: ITEMS }),
    Response.json({ items: ITEMS }),
  ]);
  using _denied = denyPermission("write");

  const cacheDir = await Deno.makeTempDir();
  try {
    const first = await listScopePackages({ cacheDir, now: 0 });
    const second = await listScopePackages({ cacheDir, now: 1 });

    assertEquals(first.source, "network");
    assertEquals(second.source, "network");
    assertEquals(fetchStub.calls.length, 2);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("an unreadable cache is a miss", async () => {
  const cacheDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(cacheDir, "scope-binstruct.json"),
      JSON.stringify({ fetchedAt: 0, items: ITEMS }),
    );

    using fetchStub = stubFetch([Response.json({ items: ITEMS })]);
    using _denied = denyPermission("read");

    const listing = await listScopePackages({ cacheDir, now: 1 });

    assertEquals(listing.source, "network");
    assertEquals(fetchStub.calls.length, 1);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("no cache directory can be located without --allow-env", async () => {
  using fetchStub = stubFetch([Response.json({ items: ITEMS })]);
  using _denied = denyPermission("env");

  const listing = await listScopePackages({ now: 0 });

  assertEquals(listing.source, "network");
  assertEquals(fetchStub.calls.length, 1);
});
