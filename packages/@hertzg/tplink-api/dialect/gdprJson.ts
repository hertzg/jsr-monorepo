/**
 * The `gdprJson` dialect: EU/GDPR firmware speaking a JSON payload format over
 * `/cgi_gdpr?9`.
 *
 * **Experimental — never run against real hardware.** The protocol here was
 * reconstructed from a partially-redacted HAR capture and a reporter's
 * reverse-engineered reference implementation attached to
 * [issue #82](https://github.com/hertzg/jsr-monorepo/issues/82). Its tests
 * assert the wire format only; nothing here has been confirmed by a device.
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
  type RouterInfo,
  type SessionContext,
} from "./dialect.ts";
import { gdprText } from "./gdprText.ts";
import { envelopeBody, rootHref } from "../client/request.ts";

const DEFAULT_PSTACK = "0,0,0,0,0,0";

/**
 * Operation names observed in the NE200's web UI traffic.
 *
 * Only reads have ever been captured. Write action types are deliberately
 * absent so that {@linkcode gdprJson}'s `encodeCommands` throws instead of
 * inventing a mapping.
 */
const OPERATIONS: Partial<Record<ActionType, string>> = {
  [ACT.GET]: "go",
  [ACT.GL]: "gl",
  [ACT.CGI]: "cgi",
};

/**
 * Stack default per operation, from the single captured sample: `go` requests
 * address the first instance, `gl` requests enumerate from the root.
 */
const STACK_DEFAULTS: Record<string, string> = {
  go: "1,0,0,0,0,0",
  gl: "0,0,0,0,0,0",
  cgi: "0,0,0,0,0,0",
};

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
 * @throws {Error} When the action type has no observed JSON mapping — every
 * write operation, as of the only capture that exists
 *
 * @example Serialize a read of a single object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { encodeAction } from "./gdprJson.ts";
 *
 * assertEquals(
 *   encodeAction([ACT.GET, "DEV2_LTE_LINK_CFG"]),
 *   '{"data":{"stack":"1,0,0,0,0,0","pstack":"0,0,0,0,0,0"},' +
 *     '"operation":"go","oid":"DEV2_LTE_LINK_CFG"}',
 * );
 * ```
 *
 * @example Write operations have no observed mapping and throw
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { encodeAction } from "./gdprJson.ts";
 *
 * assertThrows(() => encodeAction([ACT.SET, "DEV2_WLAN", { ssid: "x" }]), Error);
 * ```
 */
export function encodeAction(action: Action): string {
  const [type, oid, attributes = [], stack, pStack = DEFAULT_PSTACK] = action;
  const operation = OPERATIONS[type];

  if (!operation) {
    throw new Error(
      `gdprJson has no observed wire mapping for action type ${type}; ` +
        `only ACT.GET, ACT.GL and ACT.CGI have ever been captured ` +
        `(see https://github.com/hertzg/jsr-monorepo/issues/82)`,
    );
  }

  return JSON.stringify({
    data: {
      ...attributeFields(attributes),
      stack: stack ?? STACK_DEFAULTS[operation],
      pstack: pStack,
    },
    operation,
    oid,
  });
}

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
 * **Experimental — believed to cover the TP-LINK NE200 5G modem and probably
 * the VX800v, but unconfirmed on hardware.** See
 * [issue #82](https://github.com/hertzg/jsr-monorepo/issues/82).
 *
 * Differences from `gdprText`, all measured from the NE200 capture:
 *
 * | Concern | `gdprText` | `gdprJson` |
 * |---|---|---|
 * | Command endpoint | `/cgi_gdpr` | `/cgi_gdpr?9` |
 * | Public key endpoint | `/cgi/getParm` | `/cgi/getGDPRParm` |
 * | Login | own endpoint `/cgi/login`, envelope in the query string | a command posted to `/cgi_gdpr?9` |
 * | Default username | `admin` | `user` |
 * | Credentials | `username\npassword` | base64 fields inside JSON |
 * | Payload | bracketed text blocks | JSON envelope |
 * | Operations | `1`, `2`, … | `go`, `gl`, `cgi` |
 * | Stack default | `0,0,0,0,0,0` | `1,0,0,0,0,0` for `go`, `0,0,0,0,0,0` otherwise |
 * | Batching | N actions per request | one action per request |
 * | Session cookie | `loginErrorShow` + `JSESSIONID` | `JSESSIONID` only |
 *
 * Responses come in two shapes: `go` and `gl` answer with a JSON envelope,
 * while `cgi` operations answer with the plain-text `$.ret=<code>` form that the
 * captured login response uses. `decodeCommand` handles both.
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
  defaultUsername: "user",

  /**
   * The NE200's login page structure is unverified and nothing in this
   * dialect's flow consumes scraped variables — it never sends the
   * `loginErrorShow` cookie — so the page is fetched for session order and
   * then discarded rather than run through a scraper written for a different
   * firmware.
   */
  parseInfo: (): RouterInfo => ({}),

  publicKeyRequest: (baseUrl: string): Request =>
    new Request(new URL("cgi/getGDPRParm", baseUrl), {
      method: "POST",
      headers: { Referer: rootHref(baseUrl) },
    }),

  encodeLogin: ({ username, password }: Credentials): string =>
    JSON.stringify({
      data: {
        UserName: base64(username),
        Passwd: base64(password),
        Action: "1",
        stack: STACK_DEFAULTS.cgi,
        pstack: DEFAULT_PSTACK,
      },
      operation: "cgi",
      oid: "/cgi/login",
    }),

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
