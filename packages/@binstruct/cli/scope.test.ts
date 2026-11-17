/**
 * Tests for the `@binstruct` scope listing.
 *
 * Nothing here touches the network or the real cache directory: `fetch` and
 * the cache location are both supplied by the test, so every path — fresh,
 * cached, stale, unwritable, unreadable — is reachable without one.
 */

import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { returnsNext, stub } from "@std/testing/mock";
import { join } from "@std/path";
import { listScopePackages, readScopeListing } from "./scope.ts";

/** A body shaped like JSR's answer, trimmed to the fields that are read. */
const ITEMS = [
  {
    scope: "binstruct",
    name: "png",
    description: "PNG image file format.",
    latestVersion: "0.4.0",
  },
  {
    scope: "binstruct",
    name: "arp",
    description: "ARP packets, RFC 826.",
    latestVersion: "0.3.0",
  },
  {
    scope: "binstruct",
    name: "cli",
    description: "This tool.",
    latestVersion: "0.2.0",
  },
];

/** The two packages {@linkcode ITEMS} is expected to read back as. */
const READ = [
  { name: "arp", description: "ARP packets, RFC 826.", latestVersion: "0.3.0" },
  {
    name: "png",
    description: "PNG image file format.",
    latestVersion: "0.4.0",
  },
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
 * Makes a fresh temporary directory to keep a cache file in.
 *
 * @returns The directory, to be removed by the caller
 */
async function makeTempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "binstruct-cli-"));
}

test("readScopeListing keeps names, drops the cli, and sorts", () => {
  assertEquals(readScopeListing({ items: ITEMS }), READ);
});

test("readScopeListing tolerates entries missing a description", () => {
  assertEquals(
    readScopeListing({ items: [{ name: "tar", latestVersion: "0.1.0" }] }),
    [{ name: "tar", description: "", latestVersion: "0.1.0" }],
  );
});

test("readScopeListing drops a name with nothing published behind it", () => {
  // `@binstruct/bencode` is a reserved name: the scope listing carries it with
  // `latestVersion: null` and `versionCount: 0`, and
  // https://jsr.io/@binstruct/bencode/meta.json answers 404. Offered at level
  // 0 it is a name the tool cannot load — `binstruct bencode` answers
  // `cannot read jsr:@binstruct/bencode`.
  assertEquals(
    readScopeListing({
      items: [
        { name: "bencode", description: "Bencode.", latestVersion: null },
        { name: "esp", description: "ESP.", versionCount: 0 },
        ...ITEMS,
      ],
    }),
    READ,
  );
});

test("readScopeListing rejects a body that is not a listing", () => {
  assertEquals(readScopeListing(undefined), undefined);
  assertEquals(readScopeListing(null), undefined);
  assertEquals(readScopeListing(42), undefined);
  assertEquals(readScopeListing("<!doctype html>"), undefined);
  assertEquals(readScopeListing({ error: "not found" }), undefined);
  assertEquals(readScopeListing({ items: {} }), undefined);
});

test("readScopeListing skips entries with no usable name", () => {
  assertEquals(
    readScopeListing({
      items: [null, {}, { name: "" }, { name: 7 }].map((item) => ({
        ...item,
        latestVersion: "1.0.0",
      })),
    }),
    [],
  );
});

test("a listing is fetched, and the CLI itself is not in it", async () => {
  using _fetch = stubFetch([Response.json({ items: ITEMS })]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "network");
  assertEquals(listing.packages.map(({ name }) => name), ["arp", "png"]);
  assertEquals(listing.reason, undefined);
});

test("a reserved name never reaches the listing", async () => {
  using _fetch = stubFetch([
    Response.json({
      items: [{ name: "bencode", description: "B.", latestVersion: null }],
    }),
  ]);

  const listing = await listScopePackages({ cacheDir: null });

  // Nothing published, so nothing to list — and the same degraded screen a
  // failed request gets, rather than one unloadable name.
  assertEquals(listing.packages, []);
  assertEquals(listing.source, "none");
});

test("a non-200 answer leaves an empty list and its status", async () => {
  using _fetch = stubFetch([
    new Response("not found", { status: 404 }),
  ]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(listing.reason, "jsr.io answered 404");
});

test("a body that is not a listing leaves an empty list", async () => {
  using _fetch = stubFetch([Response.json({ message: "nope" })]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(listing.reason, "jsr.io answered no package listing");
});

test("a body that is not JSON leaves an empty list", async () => {
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

test("a network error leaves an empty list and its message", async () => {
  using _fetch = stubFetch([new TypeError("error sending request")]);

  const listing = await listScopePackages({ cacheDir: null });

  assertEquals(listing.source, "none");
  assertEquals(listing.packages, []);
  assertEquals(listing.reason, "error sending request");
});

test("a fresh cache answers without a request", async () => {
  const cacheDir = await makeTempDir();
  try {
    using fetchStub = stubFetch([Response.json({ items: ITEMS })]);

    const first = await listScopePackages({ cacheDir, now: 1_000 });
    assertEquals(first.source, "network");

    const second = await listScopePackages({ cacheDir, now: 2_000 });

    assertEquals(second.source, "cache");
    assertEquals(second.packages, first.packages);
    assertEquals(fetchStub.calls.length, 1);
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});

test("a cached listing round-trips through the same reader", async () => {
  // The cache is written in the shape the API answers with, so the publication
  // filter reads it back the same way. An entry stored without the version
  // that got it past that filter would be dropped on the way back in, turning
  // every cache hit into an empty list.
  const cacheDir = await makeTempDir();
  try {
    using _fetch = stubFetch([
      Response.json({ items: ITEMS }),
      new TypeError("offline"),
    ]);

    const fresh = await listScopePackages({ cacheDir, now: 0 });
    const cached = await listScopePackages({ cacheDir, now: 1 });

    assertEquals(cached.source, "cache");
    assertEquals(cached.packages, READ);
    assertEquals(cached.packages, fresh.packages);
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});

test("an expired cache is refreshed", async () => {
  const cacheDir = await makeTempDir();
  try {
    using fetchStub = stubFetch([
      Response.json({ items: ITEMS }),
      Response.json({
        items: [...ITEMS, {
          name: "wav",
          description: "WAV.",
          latestVersion: "0.1.2",
        }],
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
    await rm(cacheDir, { recursive: true });
  }
});

test("a failed refresh falls back to the expired cache", async () => {
  const cacheDir = await makeTempDir();
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
    await rm(cacheDir, { recursive: true });
  }
});

test("an offline run with no cache is still an answer", async () => {
  const cacheDir = await makeTempDir();
  try {
    using _fetch = stubFetch([new TypeError("offline")]);

    const listing = await listScopePackages({ cacheDir, now: 0 });

    assertEquals(listing.source, "none");
    assertEquals(listing.packages, []);
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});

test("a corrupt cache file is a miss, not a crash", async () => {
  const cacheDir = await makeTempDir();
  try {
    await writeFile(
      join(cacheDir, "scope-binstruct.json"),
      "{ truncated",
    );
    using _fetch = stubFetch([Response.json({ items: ITEMS })]);

    const listing = await listScopePackages({ cacheDir, now: 0 });

    assertEquals(listing.source, "network");
    assertEquals(listing.packages.map(({ name }) => name), ["arp", "png"]);
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});

test("a cache file without a timestamp is a miss", async () => {
  const cacheDir = await makeTempDir();
  try {
    await writeFile(
      join(cacheDir, "scope-binstruct.json"),
      JSON.stringify({ items: ITEMS }),
    );
    using _fetch = stubFetch([new TypeError("offline")]);

    const listing = await listScopePackages({ cacheDir, now: 0 });

    assertEquals(listing.source, "none");
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});

test("an unwritable cache costs a request, not a failure", async () => {
  using fetchStub = stubFetch([
    Response.json({ items: ITEMS }),
    Response.json({ items: ITEMS }),
  ]);

  const cacheDir = await makeTempDir();
  try {
    await chmod(cacheDir, 0o555);

    const first = await listScopePackages({ cacheDir, now: 0 });
    const second = await listScopePackages({ cacheDir, now: 1 });

    assertEquals(first.source, "network");
    assertEquals(second.source, "network");
    assertEquals(fetchStub.calls.length, 2);
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});

test("an unreadable cache is a miss", async () => {
  const cacheDir = await makeTempDir();
  try {
    await writeFile(
      join(cacheDir, "scope-binstruct.json"),
      JSON.stringify({ fetchedAt: 0, items: ITEMS }),
    );
    await chmod(join(cacheDir, "scope-binstruct.json"), 0o000);

    using fetchStub = stubFetch([Response.json({ items: ITEMS })]);

    const listing = await listScopePackages({ cacheDir, now: 1 });

    assertEquals(listing.source, "network");
    assertEquals(fetchStub.calls.length, 1);
  } finally {
    await rm(cacheDir, { recursive: true });
  }
});
