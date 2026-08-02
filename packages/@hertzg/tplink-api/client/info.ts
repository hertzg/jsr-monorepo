/**
 * Scrape router variables from the login page.
 */

import type { RouterInfo } from "../dialect/dialect.ts";

const MARKER = '<script type="text/javascript">';

/**
 * Scrapes the `var` declarations out of the last inline script block of the
 * router's login page.
 *
 * Every value is passed through `JSON.parse`, so `var authTimes=1;` yields the
 * number `1` and `var name="x";` yields the string `"x"`.
 *
 * @param html Login page body
 * @returns Scraped router variables
 *
 * @example Scrape the login attempt counter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseInfoHtml } from "./info.ts";
 *
 * const info = parseInfoHtml(
 *   '<html><body><script type="text/javascript">var authTimes=1;var isWizard="0";</script>',
 * );
 *
 * assertEquals(info.authTimes, 1);
 * assertEquals(info.isWizard, "0");
 * ```
 */
export function parseInfoHtml(html: string): RouterInfo {
  const js = html.slice(html.lastIndexOf(MARKER) + MARKER.length, -9);

  const entries = js
    .split(";")
    .map((s) => s.trim().slice(4))
    .filter((s) => s.length)
    .map((s) => s.split("="))
    .map(([k, v]) => [k, JSON.parse(v)]);

  return Object.fromEntries(entries);
}
