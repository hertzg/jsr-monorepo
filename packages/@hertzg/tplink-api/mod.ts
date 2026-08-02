/**
 * TP-Link Router API client library for Deno.
 *
 * This module provides authentication and command execution capabilities for
 * TP-Link routers (EU/GDPR versions) via direct API calls. The library handles
 * the router's proprietary encryption protocol (AES + RSA) and provides a
 * type-safe interface for executing commands.
 *
 * ## How the protocol works
 *
 * There is no specification for any of this. It was read out of the routers'
 * own web UI, which any of these devices will serve you without logging in.
 *
 * A TP-Link router is a **settings database with a web page in front of it**.
 * The web UI has no real pages — every screen reads and writes rows in that
 * database, and this library talks to the same interface. So every request
 * says four things:
 *
 * - **what to do** — read, write, add, delete, list ({@link ACT})
 * - **which group of settings** — the `oid`
 * - **which one of them** — the `stack`
 * - **what values** — the attributes
 *
 * ### `oid` — a group of settings
 *
 * Despite the name this is *not* an SNMP or ASN.1 OID; there are no dotted
 * numbers. It is the name of an object in the device's data model, which
 * descends from the Broadband Forum's CWMP/TR-069 standards for remotely
 * managing home routers. Two generations are in the field, and the prefix
 * tells you which one a device speaks:
 *
 * | Prefix   | Data model                | Specification    |
 * |----------|---------------------------|------------------|
 * | `IGD_*`  | `InternetGatewayDevice:1` | TR-098 (older)   |
 * | `DEV2_*` | `Device:2`                | TR-181 (newer)   |
 *
 * So `DEV2_DEV_INFO` is `Device.DeviceInfo`. Names containing `X_TP_` are
 * TP-Link vendor extensions — `X_<VENDOR>_` is the TR-069 convention for
 * anything outside the standard model.
 *
 * For `ACT.OP` the same slot holds an operation name instead (`ACT_REBOOT`,
 * `ACT_WLAN_SCAN`, …), and for `ACT.CGI` it holds a CGI path (`/cgi/login`).
 *
 * ### `stack` — which instance
 *
 * A router can have several WAN connections and several wireless networks, so
 * naming the settings group is not enough. `stack` is six comma-separated
 * numbers selecting *which instance*, one slot per level of nesting:
 *
 * ```text
 * 0,0,0,0,0,0   unspecified — the object itself, or every instance for a list
 * 1,0,0,0,0,0   the first instance
 * 2,3,0,0,0,0   the third instance nested under the second
 * ```
 *
 * Trailing zeros mean "unset". `pStack` is the same path for the *parent*
 * object; it exists for {@link ACT}.ADD, where the instance being created has
 * no path of its own yet.
 *
 * > `stack` here is unrelated to TR-181's `Device.InterfaceStack`, which is
 * > about network-interface layering. Same word, different concept.
 *
 * ### "GDPR" names the encryption, not the format
 *
 * `cgi_gdpr`, `getGDPRParm` and the firmware's own `gdprProxy.js` all refer to
 * the encryption layer TP-Link retrofitted for EU compliance. **Both** dialects
 * below are "GDPR" firmware — the word does not distinguish them. What
 * distinguishes them is the data model generation above.
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
 * 5G modems: a JSON payload posted to `/cgi_gdpr?9`. It is built from that
 * firmware's own JavaScript, recovered from the capture attached to
 * [issue #82](https://github.com/hertzg/jsr-monorepo/issues/82) — so the
 * endpoint, the operation vocabulary and the payload shape come from the
 * vendor's source rather than from guesswork.
 *
 * It nonetheless **has never been run against a device**, and its tests assert
 * the wire format only. The two dialects carry opposite kinds of confidence:
 * {@link gdprText} has no recovered source but years of use against real
 * hardware, while {@link gdprJson} has the source and no hardware.
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
 * | Parameter  | Required | Default         | Description                                      |
 * |------------|----------|-----------------|--------------------------------------------------|
 * | actionType | Yes      | —               | Operation type from {@link ACT}                  |
 * | oid        | Yes      | —               | Settings group (`IGD_*` / `DEV2_*`); an operation name for `ACT.OP`; a CGI path for `ACT.CGI` |
 * | attributes | No       | `[]`            | Names to read, or an object of values to write   |
 * | stack      | No       | `"0,0,0,0,0,0"` | Which instance to address                        |
 * | pStack     | No       | `"0,0,0,0,0,0"` | Parent object's instance. Needed by `ACT.ADD`    |
 *
 * On the wire, reading and writing are the same syntax — an attribute is sent
 * bare to read it and as `name=value` to write it. The array form produces the
 * former and the object form the latter, which is why they look like two
 * different shapes in this API.
 *
 * ## Discovering Actions
 *
 * ### Read the firmware — no login required
 *
 * The fastest route is usually the router's own JavaScript, which it serves
 * unauthenticated:
 *
 * | Path                | What it tells you                                    |
 * |---------------------|------------------------------------------------------|
 * | `/js/gdprProxy.js`  | the `ACT_*` constants, the payload codec, the endpoint |
 * | `/js/oid_str.js`    | every `oid` the firmware knows                        |
 * | `/js/lib.js`        | real call sites — how `stack` values are actually used |
 * | `/locale/errCode.js`| every error code, by name                             |
 * | `/`                 | model name, `adminType`, lockout state (see below)     |
 *
 * In `gdprProxy.js`, look for the `ACT_*` block at the top, `act:` / `exe:`
 * for the older text codec, and any `$.dm.Proxy.setup({ ajax: { url: … } })`
 * block — its `url` *is* the command endpoint, and the operation table right
 * after it is the complete vocabulary that firmware accepts.
 *
 * ### Watch live traffic
 *
 * To see decrypted payloads as you click around, hook the encryptor from the
 * browser console while logged in:
 *
 * ```js ignore
 * $.Iencryptor.AESDecrypt_backup = $.Iencryptor.AESDecrypt;
 * $.Iencryptor.AESEncrypt_backup = $.Iencryptor.AESEncrypt;
 * $.Iencryptor.AESDecrypt = function (data) {
 *     const decrypted = $.Iencryptor.AESDecrypt_backup(data);
 *     console.log("RECV:\n" + decrypted);
 *     return decrypted;
 * };
 * $.Iencryptor.AESEncrypt = function (data, isLogin) {
 *     console.log("SEND:\n" + data);
 *     return $.Iencryptor.AESEncrypt_backup(data, isLogin);
 * };
 * ```
 *
 * Note the second argument: `AESEncrypt` takes `isLogin`, and dropping it
 * breaks the login request, because login is the one call that must carry the
 * AES key and IV inside its signature. That flag — not any signature length —
 * is the real distinction between a login and everything else.
 *
 * Navigate the UI and read the console to discover the `actionType`, `oid`,
 * `attributes`, `stack` and `pStack` for each operation.
 *
 * ## Action Type Constants
 *
 * The {@link ACT} object provides action type constants:
 *
 * - {@link ACT}.GET (1) - Read one object
 * - {@link ACT}.SET (2) - Write attributes
 * - {@link ACT}.ADD (3) - Create an instance
 * - {@link ACT}.DEL (4) - Delete an instance
 * - {@link ACT}.GL (5) - Get list — every instance
 * - {@link ACT}.GS (6) - Get sub-list — instances beneath a parent
 * - {@link ACT}.OP (7) - Invoke an operation
 * - {@link ACT}.CGI (8) - Call a CGI endpoint
 *
 * A ninth value, `ACT_SIG = 9`, exists in the firmware but is not an action you
 * can request — it is why the newer firmware's endpoint is spelled
 * `/cgi_gdpr?9`. In the pre-encryption protocol the query string carried the
 * list of action types in the request (`/cgi?1&2&5`); encryption moved that
 * list into the payload, and the newer JSON transport kept the old spelling
 * with a single fixed type.
 *
 * ## Response Structure
 *
 * The {@link execute} function returns an {@link ExecuteResult}:
 *
 * - `error`: Error code from router (0 = success), or null
 * - `actions`: Array of {@link ActionResult} mapping requests to responses
 *
 * `error` is a raw firmware code. The full table lives in the router's own
 * `/locale/errCode.js`; the ones you are most likely to see:
 *
 * | Code    | Firmware name                  | Meaning                          |
 * |---------|--------------------------------|----------------------------------|
 * | `9000`  | `CMM_METHOD_NOT_SUPPORTED`     | that action is not allowed here  |
 * | `9001`  | `CMM_REQUEST_DENIED`           | refused, often not authenticated |
 * | `9003`  | `CMM_INVALID_ARGUMENTS`        | malformed attributes             |
 * | `9005`  | `CMM_INVALID_PARAM_NAME`       | unknown attribute name           |
 * | `9007`  | `CMM_INVALID_PARAM_VALUE`      | value rejected                   |
 * | `9804`  | `CMM_OBJECT_NOT_FOUND`         | no such `oid`                    |
 * | `9805`  | `CMM_INSTANCE_NOT_FOUND`       | no such `stack` instance         |
 * | `9812`  | `CMM_REACH_MAX_INSTANCE_NUM`   | cannot add another               |
 * | `71012` | `ERR_HTTP_ERR_GET`             | read failed                      |
 * | `71013` | `ERR_HTTP_ERR_SET`             | write failed                     |
 * | `71233` | `ERR_HTTP_ERR_USER_PWD_NOT_CORRECT` | bad credentials             |
 *
 * A `-1` means the request never completed — a non-200 response, not a
 * firmware code.
 *
 * ## Why a failed login tells you so little
 *
 * {@link authenticate} returns `null` when it does not get a session, and it
 * cannot tell you why. That is the router's design, not an omission here: the
 * device answers a wrong password and a correct one the same way, and its own
 * web UI simply reloads the login page and reads the counters off it.
 *
 * Those counters are on {@link AuthResult}`.info` when a login succeeds, and
 * they are the only signal available:
 *
 * - `authTimes` — the number of **failed** attempts so far
 * - `forbidFlag` / `forbidTime` — whether the device has locked you out, and
 *   for how long
 *
 * Routers in this family lock out after 3–5 failed attempts. If you are
 * automating retries, read those values rather than looping — and note that a
 * lockout looks identical to a wrong password from `authenticate`'s return
 * value alone.
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
