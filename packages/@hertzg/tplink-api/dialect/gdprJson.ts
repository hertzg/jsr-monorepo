/**
 * The `gdprJson` dialect: EU/GDPR firmware speaking a JSON payload format over
 * `/cgi_gdpr?9`.
 *
 * Confirmed on a TP-Link EX220: login, a `go` read and a `gl` read all work.
 * The operation table is confirmed from the NE200's own client library
 * (`js/gdprProxy.js`); write *requests* (`so`/`ao`/`do`/`op`) are confirmed
 * shaped correctly, their *responses* are not yet observed.
 *
 * The cipher, the signature rule, the session order and the session transport
 * are identical to `gdprText` — that is what makes this a dialect rather than a
 * separate package. What differs is documented on each member below.
 */

import {
  ACT,
  type Action,
  type ActionType,
  type CommandBatch,
  type Credentials,
  type DecodedBatch,
  type Dialect,
  type Envelope,
  type SessionContext,
} from "./dialect.ts";
import { gdprText } from "./gdprText.ts";
import { envelopeBody, rootHref } from "../client/request.ts";

/**
 * Wire operation name for every {@linkcode ActionType}, from the NE200's own
 * client library (`js/gdprProxy.js`).
 */
const OPERATIONS: Record<ActionType, string> = {
  [ACT.GET]: "go",
  [ACT.SET]: "so",
  [ACT.ADD]: "ao",
  [ACT.DEL]: "do",
  [ACT.GL]: "gl",
  [ACT.GS]: "gs",
  [ACT.OP]: "op",
  [ACT.CGI]: "cgi",
};

/**
 * Action types whose request always carries `isuseractive: true`, matching
 * the browser: a write can't fire there without a click first.
 */
const WRITE_TYPES: ReadonlySet<ActionType> = new Set([
  ACT.SET,
  ACT.ADD,
  ACT.DEL,
  ACT.OP,
]);

/**
 * Instance path used when the caller supplies none.
 *
 * The firmware's own request prefilter fills both `stack` and `pstack` with
 * all-zeros for every operation, without regard to which one it is:
 *
 * ```js ignore
 * if (!data.data.stack)  data.data.stack  = "0,0,0,0,0,0";
 * if (!data.data.pstack) data.data.pstack = "0,0,0,0,0,0";
 * ```
 *
 * "First instance" is a property of the object being addressed, not of the
 * operation addressing it, so there is nothing to vary per operation here.
 */
const DEFAULT_STACK = "0,0,0,0,0,0";

function base64(text: string): string {
  return new TextEncoder().encode(text).toBase64();
}

function jsonHeaders(baseUrl: string): Record<string, string> {
  return {
    Accept: "text/plain, */*; q=0.01",
    "Content-Type": "text/plain",
    Origin: new URL("/", baseUrl).origin,
    Referer: rootHref(baseUrl),
    "X-Requested-With": "XMLHttpRequest",
  };
}

function attributeFields(
  attributes: Record<string, string> | string[],
): Record<string, string> {
  return Array.isArray(attributes)
    ? Object.fromEntries(attributes.map((name) => [name, ""]))
    : attributes;
}

/**
 * Serializes one action into the dialect's JSON request payload.
 *
 * @param action Action to serialize
 * @returns JSON payload string ready for encryption and transmission
 *
 * @example Serialize a read of a single object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { encodeAction } from "./gdprJson.ts";
 *
 * assertEquals(
 *   encodeAction([ACT.GET, "DEV2_LTE_LINK_CFG"]),
 *   '{"data":{"stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
 *     '"operation":"go","oid":"DEV2_LTE_LINK_CFG"}',
 * );
 * ```
 *
 * @example Serialize a write
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { encodeAction } from "./gdprJson.ts";
 *
 * assertEquals(
 *   encodeAction([ACT.SET, "DEV2_ADT_WIFI_COMMON", { guestDNSEnable: "0" }]),
 *   '{"data":{"guestDNSEnable":"0","stack":"0,0,0,0,0,0",' +
 *     '"pstack":"0,0,0,0,0,0"},"operation":"so","oid":"DEV2_ADT_WIFI_COMMON",' +
 *     '"isuseractive":true}',
 * );
 * ```
 */
export function encodeAction(action: Action): string {
  const [type, oid, attributes = [], stack, pStack = DEFAULT_STACK] = action;

  return JSON.stringify({
    data: {
      ...attributeFields(attributes),
      stack: stack ?? DEFAULT_STACK,
      pstack: pStack,
    },
    operation: OPERATIONS[type],
    oid,
    ...(WRITE_TYPES.has(type) ? { isuseractive: true } : {}),
  });
}

/**
 * Envelope shape that `go` and `gl` operations answer with. The error field
 * is lowercase `errorcode`, not `errorCode`.
 */
interface JsonResponse {
  success?: boolean;
  errorcode?: unknown;
  data?: unknown;
}

function toRecord(value: unknown): Record<string, string> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)]),
  );
}

function normalizeData(
  value: unknown,
): Record<string, string> | Record<string, string>[] | null {
  return Array.isArray(value)
    ? value.map((entry) => toRecord(entry) ?? {})
    : toRecord(value);
}

const RETURN_MARKER = "$.ret=";

/**
 * Reads the `$.ret=<code>` plain-text reply that `cgi` operations answer with
 * instead of a JSON envelope — the shape the captured login response has.
 *
 * @param text Decrypted response body
 * @returns Return code, or `-1` when no marker is present
 */
function returnCode(text: string): number {
  const start = text.indexOf(RETURN_MARKER);
  if (start === -1) {
    return -1;
  }

  const code = Number.parseInt(text.slice(start + RETURN_MARKER.length), 10);
  return Number.isFinite(code) ? code : -1;
}

function errorCode(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return -1;
}

/**
 * EU/GDPR firmware speaking a JSON payload format over `/cgi_gdpr?9`.
 *
 * Differences from `gdprText`:
 *
 * | Concern | `gdprText` | `gdprJson` |
 * |---|---|---|
 * | Command endpoint | `/cgi_gdpr` | `/cgi_gdpr?9` |
 * | Public key endpoint | `/cgi/getParm` | `/cgi/getGDPRParm` |
 * | Login | own endpoint `/cgi/login`, envelope in the query string | a command posted to `/cgi_gdpr?9` |
 * | Default username | `admin` | `user` |
 * | Credentials | `username\npassword` | base64 fields inside JSON |
 * | Payload | bracketed text blocks | JSON envelope |
 * | Operations | `1`, `2`, … | `go`, `gl`, `gs`, `so`, `ao`, `do`, `op`, `cgi` |
 * | Stack default | `0,0,0,0,0,0` | `0,0,0,0,0,0` |
 * | Batching | N actions per request | one action per request |
 * | Session cookie | `loginErrorShow` + `JSESSIONID` | `JSESSIONID` only |
 *
 * Responses come in two shapes: `go` and `gl` answer with a JSON envelope,
 * `cgi` answers with the plain-text `$.ret=<code>` form. `decodeCommand`
 * handles both and assumes writes answer with one of the two as well.
 *
 * @example Encode a login payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gdprJson } from "./gdprJson.ts";
 *
 * assertEquals(
 *   gdprJson.encodeLogin({ username: "user", password: "hunter2" }),
 *   '{"data":{"UserName":"dXNlcg==","Passwd":"aHVudGVyMg==","Action":"1",' +
 *     '"stack":"0,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
 *     '"operation":"cgi","oid":"/cgi/login"}',
 * );
 * ```
 *
 * @example One request per action
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { gdprJson } from "./gdprJson.ts";
 *
 * const batches = gdprJson.encodeCommands([
 *   [ACT.GET, "DEV2_DEV_INFO"],
 *   [ACT.GL, "DEV2_LTE_SERVING_CELL_INFO"],
 * ]);
 *
 * assertEquals(batches.length, 2);
 * assertEquals(batches[0].indices, [0]);
 * assertEquals(batches[1].indices, [1]);
 * ```
 *
 * @example Decode a list response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gdprJson } from "./gdprJson.ts";
 *
 * const decoded = gdprJson.decodeCommand(
 *   '{"success":true,"data":[{"band":"n78"},{"band":"1"}]}',
 *   { payload: "", indices: [3] },
 * );
 *
 * assertEquals(decoded.error, null);
 * assertEquals(decoded.results, [[{ band: "n78" }, { band: "1" }]]);
 * ```
 *
 * @example Decode the plain-text reply of a `cgi` operation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gdprJson } from "./gdprJson.ts";
 *
 * const decoded = gdprJson.decodeCommand("$.ret=0;", {
 *   payload: "",
 *   indices: [0],
 * });
 *
 * assertEquals(decoded.error, null);
 * assertEquals(decoded.results, [null]);
 * ```
 */
export const gdprJson: Dialect = {
  ...gdprText,

  id: "gdprJson",

  /**
   * Last-resort fallback only. The login page's `adminType` states which
   * account the firmware actually expects, and a device with a provisioned
   * admin account reports `"admin"`, for which this default is wrong.
   */
  defaultUsername: "user",

  publicKeyRequest: (baseUrl: string): Request =>
    new Request(new URL("cgi/getGDPRParm", baseUrl), {
      method: "POST",
      headers: { Referer: rootHref(baseUrl) },
    }),

  /**
   * Login is not a separate endpoint in this dialect — it is an ordinary `cgi`
   * command addressed to the `/cgi/login` oid, so it goes through
   * {@linkcode encodeAction} rather than repeating the envelope shape.
   */
  encodeLogin: ({ username, password }: Credentials): string =>
    encodeAction([ACT.CGI, "/cgi/login", {
      UserName: base64(username),
      Passwd: base64(password),
      Action: "1",
    }]),

  loginRequest: (baseUrl: string, envelope: Envelope): Request =>
    new Request(new URL("cgi_gdpr?9", baseUrl), {
      method: "POST",
      headers: jsonHeaders(baseUrl),
      body: envelopeBody(envelope),
    }),

  tokenRequest: (
    baseUrl: string,
    session: Pick<SessionContext, "sessionId" | "authTimes">,
  ): Request =>
    new Request(new URL("/", baseUrl), {
      method: "GET",
      headers: {
        Referer: rootHref(baseUrl),
        Cookie: `JSESSIONID=${session.sessionId}`,
      },
    }),

  encodeCommands: (actions: readonly Action[]): readonly CommandBatch[] =>
    actions.map((action, index) => ({
      payload: encodeAction(action),
      indices: [index],
    })),

  commandRequest: (
    baseUrl: string,
    envelope: Envelope,
    session: SessionContext,
  ): Request =>
    new Request(new URL("cgi_gdpr?9", baseUrl), {
      method: "POST",
      headers: {
        ...jsonHeaders(baseUrl),
        Cookie: `JSESSIONID=${session.sessionId}`,
        TokenID: session.tokenId,
      },
      body: envelopeBody(envelope),
    }),

  decodeCommand: (text: string, _batch: CommandBatch): DecodedBatch => {
    const trimmed = text.trimStart();

    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      const code = returnCode(trimmed);
      return { error: code === 0 ? null : code, results: [null] };
    }

    const body = JSON.parse(trimmed) as JsonResponse;

    return {
      error: body.success === true ? null : errorCode(body.errorcode),
      results: [normalizeData(body.data)],
    };
  },
};
