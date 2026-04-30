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
 * ## Main Functions
 *
 * - {@link authenticate}: Establish a session with the router
 * - {@link execute}: Execute commands on an authenticated router
 *
 * ## Action Format
 *
 * Actions are tuples of type {@link Action} with the following structure:
 * `[actionType, operationId, attributes?, stack?, pStack?]`
 *
 * | Parameter   | Required | Default          | Description                              |
 * |-------------|----------|------------------|------------------------------------------|
 * | actionType  | Yes      | —                | Operation type from {@link ACT}          |
 * | operationId | Yes      | —                | Operation identifier (e.g., "LTE_BANDINFO") |
 * | attributes  | No       | `[]`             | Array for reads, object for writes       |
 * | stack       | No       | `"0,0,0,0,0,0"`  | Stack context (device-specific)          |
 * | pStack      | No       | `"0,0,0,0,0,0"`  | Parent stack (rarely modified)           |
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

export { ACT, type Action, type ActionType } from "./payload.ts";
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
