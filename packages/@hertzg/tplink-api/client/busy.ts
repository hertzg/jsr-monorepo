/**
 * Read the router's login and busy flags.
 */

import type { BusyStatus } from "../dialect/dialect.ts";

/**
 * Reads `var isLogined` and `var isBusy` from the busy endpoint's response.
 *
 * The parse is positional: the first non-empty line is the login flag and the
 * second is the busy flag.
 *
 * @param text Busy response body
 * @returns Login and busy state
 *
 * @example Read an idle, logged-out router
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseBusyText } from "./busy.ts";
 *
 * const status = parseBusyText("var isLogined=0;\nvar isBusy=0;\n");
 *
 * assertEquals(status, { isLoggedIn: false, isBusy: false });
 * ```
 *
 * @example Read a router with an active session
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseBusyText } from "./busy.ts";
 *
 * const status = parseBusyText("var isLogined=1;\nvar isBusy=1;\n");
 *
 * assertEquals(status, { isLoggedIn: true, isBusy: true });
 * ```
 */
export function parseBusyText(text: string): BusyStatus {
  const [isLoggedInLine, isBusyLine] = text.split("\n").map((s) => s.trim());

  return {
    isLoggedIn: Boolean(Number(isLoggedInLine.slice(14, -1))),
    isBusy: Boolean(Number(isBusyLine.slice(11, -1))),
  };
}
