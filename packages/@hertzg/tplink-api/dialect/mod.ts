/**
 * Firmware dialects for the TP-Link router API.
 *
 * A {@linkcode Dialect} describes one firmware family's wire protocol as a flat
 * table of pure functions — one request builder and one parser per protocol
 * step. Dialects perform no I/O and hold no state: builders return a `Request`,
 * parsers take a string or `Headers`. `authenticate` and `execute` own `fetch`,
 * sequencing and crypto, and never branch on which dialect they hold.
 *
 * ## Built-in dialects
 *
 * | Dialect | Wire shape | Models |
 * |---|---|---|
 * | {@linkcode gdprText} | text blocks over `/cgi_gdpr` | TL-MR6400, Archer VR900v, TL-MR6500v, Archer MR600 v2 |
 * | {@linkcode gdprJson} | JSON over `/cgi_gdpr?9` | TP-LINK NE200, probably VX800v — **unconfirmed on hardware** |
 *
 * Dialects are named by protocol shape, never by model, and there is no runtime
 * model registry — a registry is exactly what a third party could not extend
 * without editing this package. The model-to-dialect mapping above is
 * documentation.
 *
 * ## Authoring a dialect
 *
 * Spread an existing dialect and override only what differs. {@linkcode Dialect}
 * has no optional members on purpose, so spreading is what supplies defaults.
 *
 * @example Select a dialect for a router that speaks JSON
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gdprJson, gdprText } from "./mod.ts";
 *
 * assertEquals(gdprText.defaultUsername, "admin");
 * assertEquals(gdprJson.defaultUsername, "user");
 * ```
 *
 * @example Derive a dialect for a model that differs in one place
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { type Dialect, gdprJson } from "./mod.ts";
 *
 * const vx800v: Dialect = {
 *   ...gdprJson,
 *   id: "vx800v",
 *   publicKeyRequest: (baseUrl) =>
 *     new Request(new URL("cgi/getParm", baseUrl), { method: "POST" }),
 * };
 *
 * assertEquals(
 *   vx800v.publicKeyRequest("http://192.168.1.1").url,
 *   "http://192.168.1.1/cgi/getParm",
 * );
 * assertEquals(vx800v.defaultUsername, "user");
 * ```
 *
 * @module
 */

export {
  ACT,
  type Action,
  type ActionType,
  type BusyStatus,
  type CommandBatch,
  type Credentials,
  type DecodedBatch,
  type Dialect,
  type Envelope,
  type PublicKeyInfo,
  type RouterInfo,
  type SessionContext,
} from "./dialect.ts";
export { gdprText } from "./gdprText.ts";
export { gdprJson } from "./gdprJson.ts";
