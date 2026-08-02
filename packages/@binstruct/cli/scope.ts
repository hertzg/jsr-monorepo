/**
 * The `@binstruct` package listing for the Binary Structure CLI.
 *
 * Level 0 of ADR 0001 — bare `binstruct` — has to name the packages worth
 * trying, and the only source that is right on the day it is read is JSR
 * itself: `GET https://jsr.io/api/scopes/binstruct/packages`. The listing is
 * fetched, cached under the OS cache directory, and the CLI package itself is
 * dropped from it. See `@binstruct/cli` ADR 0006.
 *
 * **The listing is a hint, never a gate.** Every failure — no `--allow-net`,
 * no network, a non-200 answer, a body that is not a listing — resolves to an
 * empty list with a reason attached, and the caller still shows the shorthand
 * rule and the escape hatch. Nothing here throws, and nothing here writes to
 * stdout.
 *
 * Three permissions are consulted, and each is *queried* rather than assumed,
 * so a missing one degrades instead of raising an interactive prompt in the
 * middle of a pipeline:
 *
 * - `--allow-net=jsr.io` — without it the request is skipped entirely.
 * - `--allow-env` — locates the OS cache directory (`HOME`,
 *   `XDG_CACHE_HOME`, `LOCALAPPDATA`). Without it there is no cache, only the
 *   live request.
 * - `--allow-read` / `--allow-write` on that directory — without either, the
 *   cache is skipped in that direction.
 *
 * @module
 */

import { dirname, join } from "@std/path";

/** Host the listing is fetched from, and the one `--allow-net` must name. */
const JSR_HOST = "jsr.io";

/** The scope whose packages the CLI lists. */
const SCOPE = "binstruct";

/**
 * Endpoint the listing comes from.
 *
 * `limit` is the API's maximum. A scope larger than that would be truncated
 * rather than paged, which is acceptable for a list whose job is to suggest a
 * starting point.
 */
const LISTING_URL =
  `https://${JSR_HOST}/api/scopes/${SCOPE}/packages?limit=100`;

/** Package never listed: the CLI doing the listing. */
const EXCLUDED = "cli";

/** Directory the cache file lives in, under the OS cache directory. */
const CACHE_DIR = "binstruct-cli";

/** Name of the cache file inside {@linkcode CACHE_DIR}. */
const CACHE_FILE = `scope-${SCOPE}.json`;

/** How long a cached listing is served before the network is tried again. */
const CACHE_TTL = 24 * 60 * 60 * 1000;

/** How long the request is given before it is abandoned. */
const REQUEST_TIMEOUT = 3_000;

/**
 * One package of the scope, as JSR describes it.
 */
export type ScopePackage = {
  /** Short name, e.g. `png`; prefix `@binstruct/` for the JSR coordinate. */
  readonly name: string;
  /** JSR's one-paragraph description, empty when the package has none. */
  readonly description: string;
};

/**
 * Where the packages of a {@linkcode ScopeListing} came from.
 *
 * - `network` — freshly fetched from JSR.
 * - `cache` — a cached listing still inside its TTL; no request was made.
 * - `stale-cache` — the request failed and an expired cache answered instead.
 * - `none` — nothing was available; `packages` is empty.
 */
export type ListingSource = "network" | "cache" | "stale-cache" | "none";

/**
 * The result of {@linkcode listScopePackages}.
 *
 * `packages` is empty only when `source` is `none`, and `reason` is present
 * exactly when something went wrong — on `stale-cache` it says why the
 * refresh failed, on `none` it says why there is no list at all.
 */
export type ScopeListing = {
  /** The scope's packages, sorted by name, without `@binstruct/cli`. */
  readonly packages: readonly ScopePackage[];
  /** Where they came from. */
  readonly source: ListingSource;
  /** Why the network answer is missing, when it is. */
  readonly reason?: string;
};

/**
 * Options for {@linkcode listScopePackages}.
 */
export type ScopeListingOptions = {
  /**
   * Directory holding the cache file. Absent means the OS cache directory;
   * `null` disables the cache in both directions.
   */
  readonly cacheDir?: string | null;
  /** Current time in milliseconds, for ageing the cache. */
  readonly now?: number;
  /** How long a cached listing is served before a refetch, in milliseconds. */
  readonly ttl?: number;
};

/**
 * Reads a package listing out of a parsed JSR scope-packages response.
 *
 * This is the whole of the response-shape knowledge, kept pure so the network
 * path and the cache file can share it and so it can be tested without
 * either. Every field but `name` is optional to us: an entry without a usable
 * name is dropped, a missing description becomes the empty string, and the
 * CLI's own package is never a member. The result is sorted by name, because
 * the order the API returns is not part of its contract.
 *
 * The cache file is written in this same shape, so a hand-edited or truncated
 * cache is rejected by the same rules as a bad response.
 *
 * @param body The parsed JSON body
 * @returns The packages, or `undefined` when the body is not a listing at all
 *
 * @example A listing is read, sorted, and stripped of the CLI itself
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { readScopeListing } from "./scope.ts";
 *
 * const packages = readScopeListing({
 *   items: [
 *     { scope: "binstruct", name: "png", description: "PNG image format." },
 *     { scope: "binstruct", name: "cli", description: "The CLI." },
 *     { scope: "binstruct", name: "arp" },
 *   ],
 * });
 *
 * assertEquals(packages, [
 *   { name: "arp", description: "" },
 *   { name: "png", description: "PNG image format." },
 * ]);
 * ```
 *
 * @example A body that is not a listing is rejected rather than read as empty
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { readScopeListing } from "./scope.ts";
 *
 * assertEquals(readScopeListing({ error: "not found" }), undefined);
 * assertEquals(readScopeListing("<!doctype html>"), undefined);
 * assertEquals(readScopeListing({ items: [] }), []);
 * ```
 */
export function readScopeListing(body: unknown): ScopePackage[] | undefined {
  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return undefined;

  const packages: ScopePackage[] = [];
  for (const item of items) {
    const { name, description } = (item ?? {}) as {
      name?: unknown;
      description?: unknown;
    };
    if (typeof name !== "string" || name === "" || name === EXCLUDED) continue;
    packages.push({
      name,
      description: typeof description === "string" ? description : "",
    });
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Answers whether a permission is already granted, without asking for it.
 *
 * `Deno.permissions.query` never prompts, which is the point: a listing that
 * is only ever a hint must not stop a pipeline to ask for the network.
 *
 * @param descriptor The permission to check
 * @returns Whether it is granted
 */
async function granted(
  descriptor: Deno.PermissionDescriptor,
): Promise<boolean> {
  try {
    return (await Deno.permissions.query(descriptor)).state === "granted";
  } catch {
    return false;
  }
}

/**
 * Reads an environment variable, or `undefined` when it is unset or unreadable.
 *
 * @param name The variable to read
 * @returns Its value, when there is one to be had
 */
async function readEnv(name: string): Promise<string | undefined> {
  if (!await granted({ name: "env", variable: name })) return undefined;
  try {
    return Deno.env.get(name) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Locates the cache file under the OS cache directory.
 *
 * Follows the platform conventions — `%LOCALAPPDATA%` on Windows,
 * `~/Library/Caches` on macOS, `$XDG_CACHE_HOME` then `~/.cache` elsewhere.
 *
 * @returns The file path, or `undefined` when the directory cannot be located
 */
async function defaultCacheDir(): Promise<string | undefined> {
  if (Deno.build.os === "windows") {
    const local = await readEnv("LOCALAPPDATA");
    return local === undefined ? undefined : join(local, CACHE_DIR);
  }

  if (Deno.build.os === "darwin") {
    const home = await readEnv("HOME");
    return home === undefined
      ? undefined
      : join(home, "Library", "Caches", CACHE_DIR);
  }

  const xdg = await readEnv("XDG_CACHE_HOME");
  if (xdg !== undefined) return join(xdg, CACHE_DIR);

  const home = await readEnv("HOME");
  return home === undefined ? undefined : join(home, ".cache", CACHE_DIR);
}

/**
 * Resolves the cache file path the options ask for.
 *
 * @param cacheDir The configured directory, `null` to disable the cache
 * @returns The file path, or `undefined` when there is no cache to use
 */
async function cacheFilePath(
  cacheDir: string | null | undefined,
): Promise<string | undefined> {
  if (cacheDir === null) return undefined;
  const directory = cacheDir ?? await defaultCacheDir();
  return directory === undefined ? undefined : join(directory, CACHE_FILE);
}

/** A listing as it was stored on disk. */
type CacheEntry = {
  /** When the listing was fetched, in milliseconds. */
  readonly fetchedAt: number;
  /** The packages it held. */
  readonly packages: readonly ScopePackage[];
};

/**
 * Reads the cache file, treating every failure as a cache miss.
 *
 * @param file Path to the cache file
 * @returns The stored listing, or `undefined` when there is not a usable one
 */
async function readCache(file: string): Promise<CacheEntry | undefined> {
  if (!await granted({ name: "read", path: file })) return undefined;

  try {
    const raw: unknown = JSON.parse(await Deno.readTextFile(file));
    const packages = readScopeListing(raw);
    const fetchedAt = (raw as { fetchedAt?: unknown } | null)?.fetchedAt;

    if (
      packages === undefined || packages.length === 0 ||
      typeof fetchedAt !== "number"
    ) {
      return undefined;
    }
    return { fetchedAt, packages };
  } catch {
    return undefined;
  }
}

/**
 * Writes the cache file, treating every failure as nothing having happened.
 *
 * Stored in the shape the API answers with, so {@linkcode readScopeListing}
 * validates both.
 *
 * @param file Path to the cache file
 * @param entry The listing to store
 */
async function writeCache(file: string, entry: CacheEntry): Promise<void> {
  if (!await granted({ name: "write", path: file })) return;

  try {
    await Deno.mkdir(dirname(file), { recursive: true });
    await Deno.writeTextFile(
      file,
      JSON.stringify({ fetchedAt: entry.fetchedAt, items: entry.packages }),
    );
  } catch {
    // The cache is an optimisation; failing to keep it is not an error.
  }
}

/**
 * Fetches the scope listing, naming the reason instead of throwing.
 *
 * An unknown scope answers 404 and a malformed request answers 400, so status
 * is checked generically rather than case by case. An answer carrying no
 * packages is treated as a failure too — it is not worth caching, and an
 * expired cache is a better list than none.
 *
 * @returns The packages, or why there are none
 */
async function fetchListing(): Promise<
  { ok: true; packages: readonly ScopePackage[] } | {
    ok: false;
    reason: string;
  }
> {
  if (!await granted({ name: "net", host: JSR_HOST })) {
    return {
      ok: false,
      reason:
        `listing packages needs --allow-net=${JSR_HOST}, and it was not granted`,
    };
  }

  try {
    const response = await fetch(LISTING_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, reason: `${JSR_HOST} answered ${response.status}` };
    }

    const packages = readScopeListing(await response.json());
    if (packages === undefined || packages.length === 0) {
      return { ok: false, reason: `${JSR_HOST} answered no package listing` };
    }
    return { ok: true, packages };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Lists the packages of the `@binstruct` scope, live from JSR.
 *
 * The answer is cached under the OS cache directory for a day, so repeated
 * invocations cost one request between them and an offline run that has
 * listed before still gets a list. When the request fails an expired cache is
 * used in preference to nothing, and when there is no cache either the result
 * is an empty list carrying the reason — never an exception, so the caller can
 * always fall back to explaining the shorthand rule instead of a listing.
 *
 * @param options Cache location, clock and TTL overrides
 * @returns The packages and where they came from
 *
 * @example A live listing, without the network
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stub } from "@std/testing/mock";
 * import { listScopePackages } from "./scope.ts";
 *
 * using _fetch = stub(
 *   globalThis,
 *   "fetch",
 *   () =>
 *     Promise.resolve(
 *       Response.json({ items: [{ name: "png", description: "PNG." }] }),
 *     ),
 * );
 *
 * const listing = await listScopePackages({ cacheDir: null });
 *
 * assertEquals(listing.source, "network");
 * assertEquals(listing.packages, [{ name: "png", description: "PNG." }]);
 * ```
 *
 * @example A failure is a reason and an empty list, never a throw
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stub } from "@std/testing/mock";
 * import { listScopePackages } from "./scope.ts";
 *
 * using _fetch = stub(globalThis, "fetch", () => Promise.reject(new TypeError("offline")));
 *
 * const listing = await listScopePackages({ cacheDir: null });
 *
 * assertEquals(listing.source, "none");
 * assertEquals(listing.packages, []);
 * assertEquals(listing.reason, "offline");
 * ```
 */
export async function listScopePackages(
  options: ScopeListingOptions = {},
): Promise<ScopeListing> {
  const now = options.now ?? Date.now();
  const ttl = options.ttl ?? CACHE_TTL;

  const file = await cacheFilePath(options.cacheDir);
  const cached = file === undefined ? undefined : await readCache(file);

  if (cached !== undefined && now - cached.fetchedAt < ttl) {
    return { packages: cached.packages, source: "cache" };
  }

  const fetched = await fetchListing();
  if (fetched.ok) {
    if (file !== undefined) {
      await writeCache(file, { fetchedAt: now, packages: fetched.packages });
    }
    return { packages: fetched.packages, source: "network" };
  }

  return cached === undefined
    ? { packages: [], source: "none", reason: fetched.reason }
    : {
      packages: cached.packages,
      source: "stale-cache",
      reason: fetched.reason,
    };
}
