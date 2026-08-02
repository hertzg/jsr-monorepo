/**
 * TP-Link Router API client library for Deno.
 *
 * This module provides authentication and command execution capabilities for
 * TP-Link routers (EU/GDPR versions) via direct API calls. The library handles
 * the router's proprietary encryption protocol (AES + RSA) and provides a
 * type-safe interface for executing commands.
 *
 * ## Supported Models
 *
 * - TL-MR6400
 * - Archer VR900v
 * - TL-MR6500v
 * - Archer MR600 v2
 * - Other EU/GDPR TP-Link routers with similar firmware
 *
 * These all speak the {@link gdprText} dialect, which is the default — nothing
 * needs to be selected for them.
 *
 * ## Experimental: unconfirmed on hardware
 *
 * The {@link gdprJson} dialect describes a second protocol shape seen on newer
 * 5G modems: a JSON payload posted to `/cgi_gdpr?9`. It was reconstructed from a
 * partially-redacted HAR capture and a reporter's reverse-engineered example in
 * [issue #82](https://github.com/hertzg/jsr-monorepo/issues/82), and **has never
 * been run against a device**. Its tests assert the wire format only.
 *
 * It is believed to cover:
 *
 * - TP-LINK NE200 5G
 * - VX800v (reported as "seems identical", zero captures)
 *
 * If you own one of these, pass `dialect: gdprJson` and please report what
 * happens on issue #82 — confirming it is what moves these models onto the
 * supported list.
 *
 * ```ts ignore
 * import { authenticate, gdprJson } from "@hertzg/tplink-api";
 *
 * const auth = await authenticate("http://192.168.254.1", {
 *   password: "secret",
 *   dialect: gdprJson,
 * });
 * ```
 *
 * ## Main Functions
 *
 * - {@link authenticate}: Establish a session with the router
 * - {@link execute}: Execute commands on an authenticated router
 *
 * ## Firmware Dialects
 *
 * A {@link Dialect} is a plain object of pure functions describing one firmware
 * family's wire protocol. Both `authenticate` and `execute` take an optional
 * `dialect` (and an optional `fetch`); `authenticate` carries the dialect
 * forward on its result, so `execute(baseUrl, actions, auth)` keeps working
 * unchanged. See the `@hertzg/tplink-api/dialect` entrypoint for the full
 * contract and for how to author a dialect for a model that is not covered.
 *
 * ## Action Format
 *
 * Actions are tuples of type {@link Action} with the following structure:
 * `[actionType, operationId, attributes?, stack?, pStack?]`
 *
 * | Parameter   | Required | Default (`gdprText`) | Description                              |
 * |-------------|----------|----------------------|------------------------------------------|
 * | actionType  | Yes      | —                    | Operation type from {@link ACT}          |
 * | operationId | Yes      | —                    | Operation identifier (e.g., "LTE_BANDINFO") |
 * | attributes  | No       | `[]`                 | Array for reads, object for writes       |
 * | stack       | No       | `"0,0,0,0,0,0"`      | Stack context (device-specific)          |
 * | pStack      | No       | `"0,0,0,0,0,0"`      | Parent stack (rarely modified)           |
 *
 * What an omitted `stack` or `pStack` becomes on the wire is a dialect concern,
 * so the Default column above is {@link gdprText}'s. {@link gdprJson} defaults
 * `stack` to `"1,0,0,0,0,0"` for `go` reads and `"0,0,0,0,0,0"` otherwise; see
 * each dialect's own documentation.
 *
 * ## Discovering Actions
 *
 * To find available actions and their parameters, you can hook into the
 * router's web UI encryption methods. Open your browser's developer console
 * while logged into the router and paste the following snippet:
 *
 * ```js ignore
 * $.Iencryptor.AESDecrypt_backup = $.Iencryptor.AESDecrypt;
 * $.Iencryptor.AESEncrypt_backup = $.Iencryptor.AESEncrypt;
 * $.Iencryptor.AESDecrypt = function(data) {
 *     let decrypted = $.Iencryptor.AESDecrypt_backup(data);
 *     console.log("RECV:\n" + decrypted);
 *     return decrypted;
 * }
 * $.Iencryptor.AESEncrypt = function(data) {
 *     console.log("SEND:\n" + data);
 *     return $.Iencryptor.AESEncrypt_backup(data);
 * }
 * ```
 *
 * This logs `RECV:` and `SEND:` messages before encrypting/decrypting payloads.
 * Navigate through the router's UI and observe the console to discover the
 * `actionType`, `operationId`, `attributes`, `stack`, and `pStack` values
 * for each operation.
 *
 * ## Action Type Constants
 *
 * The {@link ACT} object provides action type constants:
 *
 * - {@link ACT}.GET (1) - Retrieve data
 * - {@link ACT}.SET (2) - Modify data
 * - {@link ACT}.ADD (3) - Add new entry
 * - {@link ACT}.DEL (4) - Delete entry
 * - {@link ACT}.GL (5) - Get list
 * - {@link ACT}.GS (6) - Get/Set combined operation
 * - {@link ACT}.OP (7) - Execute operation
 * - {@link ACT}.CGI (8) - CGI script execution
 *
 * ## Response Structure
 *
 * The {@link execute} function returns an {@link ExecuteResult}:
 *
 * - `error`: Error code from router (0 = success), or null
 * - `actions`: Array of {@link ActionResult} mapping requests to responses
 *
 * @example Basic authentication and command execution
 * ```ts ignore
 * import { ACT, authenticate, execute } from "@hertzg/tplink-api";
 *
 * const auth = await authenticate("http://192.168.1.1", {
 *   password: "admin",
 * });
 *
 * if (auth) {
 *   const result = await execute(
 *     "http://192.168.1.1",
 *     [[ACT.GET, "LTE_BANDINFO"]],
 *     auth,
 *   );
 *   // result.error === 0 indicates success
 *   // result.actions[0].res contains the response data
 * }
 * ```
 *
 * @example Get unread SMS count with specific attributes
 * ```ts ignore
 * import { ACT, type Action } from "@hertzg/tplink-api";
 *
 * const actions: Action[] = [
 *   [ACT.GET, "LTE_SMS_UNREADMSGBOX", ["totalNumber"]],
 * ];
 * ```
 *
 * @example Retrieve SMS messages with pagination
 * ```ts ignore
 * import { ACT, type Action } from "@hertzg/tplink-api";
 *
 * const actions: Action[] = [
 *   [ACT.SET, "LTE_SMS_UNREADMSGBOX", { pageNumber: "1" }],
 *   [ACT.GS, "LTE_SMS_UNREADMSGENTRY", ["index", "from", "content", "receivedTime"]],
 * ];
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
  gdprJson,
  gdprText,
  type PublicKeyInfo,
  type RouterInfo,
  type SessionContext,
} from "./dialect/mod.ts";
export {
  type ActionResult,
  execute,
  type ExecuteOptions,
  type ExecuteResult,
} from "./execute.ts";
export {
  authenticate,
  type AuthOptions,
  type AuthResult,
} from "./authenticate.ts";
