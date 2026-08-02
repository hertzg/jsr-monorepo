/**
 * The firmware dialect contract.
 *
 * A {@linkcode Dialect} describes *one firmware family's wire protocol* as a
 * flat table of pure functions: one request builder and one parser per protocol
 * step. Dialects never perform I/O and hold no state — builders return a
 * {@linkcode Request}, parsers take a string or {@linkcode Headers}. The
 * orchestrators own `fetch`, sequencing and crypto, and never branch on which
 * dialect they were handed.
 *
 * This module also holds the dialect-neutral action vocabulary
 * ({@linkcode ACT}, {@linkcode Action}) that every dialect translates into its
 * own on-the-wire representation.
 */

/**
 * Action type constants for TP-Link router commands.
 *
 * These values specify the operation type when constructing actions:
 * - `GET` (1): Retrieve data
 * - `SET` (2): Modify data
 * - `ADD` (3): Add new entry
 * - `DEL` (4): Delete entry
 * - `GL` (5): Get list
 * - `GS` (6): Get/Set combined operation
 * - `OP` (7): Execute operation
 * - `CGI` (8): CGI script execution
 *
 * The constants are dialect-neutral: each dialect maps them onto whatever its
 * firmware expects (decimal digits for `gdprText`, `go`/`gl`/`cgi` strings for
 * `gdprJson`).
 *
 * @example Action type constants
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 *
 * assertEquals(ACT.GET, 1);
 * assertEquals(ACT.SET, 2);
 * ```
 */
export const ACT = {
  GET: 1,
  SET: 2,
  ADD: 3,
  DEL: 4,
  GL: 5,
  GS: 6,
  OP: 7,
  CGI: 8,
} as const;

/**
 * Numeric action type value from the {@linkcode ACT} constant.
 */
export type ActionType = (typeof ACT)[keyof typeof ACT];

/**
 * Action tuple representing a single router command.
 *
 * @example Basic GET action
 * ```ts
 * import { ACT, type Action } from "./dialect.ts";
 *
 * const action: Action = [ACT.GET, "LTE_BANDINFO"];
 * ```
 *
 * @example GET with specific attributes to retrieve
 * ```ts
 * import { ACT, type Action } from "./dialect.ts";
 *
 * const action: Action = [ACT.GET, "LTE_SMS_UNREADMSGBOX", ["totalNumber"]];
 * ```
 *
 * @example SET with attribute values
 * ```ts
 * import { ACT, type Action } from "./dialect.ts";
 *
 * const action: Action = [ACT.SET, "LTE_SMS_UNREADMSGBOX", { pageNumber: "1" }];
 * ```
 */
export type Action = [
  type: ActionType,
  oid: string,
  attributes?: Record<string, string> | string[],
  stack?: string,
  pStack?: string,
];

/**
 * Variables scraped from the router's login page.
 *
 * Only {@linkcode RouterInfo.authTimes} is consumed by the library; every other
 * scraped variable is carried through for the caller's benefit.
 */
export interface RouterInfo {
  /** Login attempt counter, sent back as the `loginErrorShow` cookie. */
  authTimes?: number;
  /** Any other `var` declaration found on the login page. */
  [key: string]: unknown;
}

/**
 * RSA public key material and the request sequence base.
 */
export interface PublicKeyInfo {
  /** RSA public exponent, big-endian. */
  exponent: Uint8Array;
  /** RSA modulus, big-endian. Its length fixes the RSA chunk size. */
  modulus: Uint8Array;
  /** Sequence base that every signature's `s` parameter is derived from. */
  sequence: number;
}

/**
 * Login and busy state reported by the router before authentication.
 */
export interface BusyStatus {
  /** Whether a session is already established from another client. */
  isLoggedIn: boolean;
  /** Whether the router is busy serving another management session. */
  isBusy: boolean;
}

/**
 * Encrypted request envelope: AES ciphertext plus the RSA-encrypted signature.
 */
export interface Envelope {
  /** Base64 AES-CBC ciphertext of the plaintext payload. */
  data: string;
  /** Hex RSA-encrypted parameter string: `key&iv&h&s` for login, `h&s` for commands. */
  sign: string;
}

/**
 * Session material carried on every request made after login.
 */
export interface SessionContext {
  /** `JSESSIONID` cookie value returned by the login response. */
  sessionId: string;
  /** Token scraped from the authenticated landing page. */
  tokenId: string;
  /** Login attempt counter, sent back as the `loginErrorShow` cookie. */
  authTimes: number;
}

/**
 * Credentials as supplied by the caller, after the dialect's username default
 * has been applied.
 */
export interface Credentials {
  /** Account name, defaulted from {@linkcode Dialect.defaultUsername}. */
  username: string;
  /** Account password, verbatim. */
  password: string;
}

/**
 * One HTTP round trip's worth of actions.
 *
 * A dialect that packs every action into a single request emits one batch; a
 * dialect that can only carry one action per request emits one batch per
 * action. Both are the same code path for the orchestrator.
 */
export interface CommandBatch {
  /** Plaintext payload for this round trip, pre-encryption. */
  readonly payload: string;
  /** Indices into the caller's actions array, in the order the response returns them. */
  readonly indices: readonly number[];
}

/**
 * Decoded result of one round trip, positionally aligned with
 * {@linkcode CommandBatch.indices}.
 */
export interface DecodedBatch {
  /** Router error code, or `null` when the batch reported no error. */
  error: number | null;
  /** One entry per index in the batch; `null` where the router returned nothing. */
  results:
    readonly (Record<string, string> | Record<string, string>[] | null)[];
}

/**
 * A firmware family's wire protocol, expressed as pure functions and data.
 *
 * Every member is pure: no I/O, no state, no time or randomness. Request
 * builders return a {@linkcode Request} that the orchestrator hands to `fetch`;
 * parsers take the response text or headers. Because of that, every claim about
 * a firmware's protocol is a string-in/string-out unit test needing no device.
 *
 * ## Authoring a dialect
 *
 * Dialects are authored by **spreading an existing dialect** and overriding only
 * what differs. The interface deliberately has no optional members: optionality
 * would force `dialect.x ?? fallback` at every call site, which is the pile of
 * conditionals this design exists to avoid. Spread composition supplies the
 * defaults instead.
 *
 * Adding a member to this interface later stays source-compatible for
 * spread-authored dialects, and is breaking only for dialects implemented from
 * scratch — so spreading is the sanctioned style.
 *
 * @example Author a dialect by spreading an existing one
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import type { Dialect } from "./dialect.ts";
 * import { gdprJson } from "./gdprJson.ts";
 *
 * const vx800v: Dialect = {
 *   ...gdprJson,
 *   id: "vx800v",
 *   commandRequest: (baseUrl, envelope, session) =>
 *     new Request(new URL("cgi_gdpr", baseUrl), {
 *       method: "POST",
 *       headers: { TokenID: session.tokenId },
 *       body: `sign=${envelope.sign}\r\ndata=${envelope.data}\r\n`,
 *     }),
 * };
 *
 * assertEquals(vx800v.id, "vx800v");
 * assertEquals(vx800v.defaultUsername, gdprJson.defaultUsername);
 *
 * const request = vx800v.commandRequest(
 *   "http://192.168.1.1",
 *   { data: "ZGF0YQ==", sign: "00ff" },
 *   { sessionId: "sid", tokenId: "tok", authTimes: 1 },
 * );
 *
 * assertEquals(request.url, "http://192.168.1.1/cgi_gdpr");
 * assertEquals(request.headers.get("TokenID"), "tok");
 * ```
 */
export interface Dialect {
  /** Stable identifier, carried on the authentication result for diagnostics. */
  readonly id: string;
  /** Username used when the caller supplies none. */
  readonly defaultUsername: string;

  /**
   * Builds the request for the login page, whose inline script carries
   * `authTimes` and friends.
   *
   * @param baseUrl Base URL of the router
   * @returns Request for the login page
   */
  infoRequest(baseUrl: string): Request;
  /**
   * Scrapes router variables out of the login page.
   *
   * @param html Login page body
   * @returns Scraped router variables
   */
  parseInfo(html: string): RouterInfo;

  /**
   * Builds the request for the RSA public key and sequence base.
   *
   * @param baseUrl Base URL of the router
   * @returns Request for the public key endpoint
   */
  publicKeyRequest(baseUrl: string): Request;
  /**
   * Extracts RSA parameters from the public key response.
   *
   * @param text Public key response body
   * @returns RSA modulus, exponent and sequence base
   */
  parsePublicKey(text: string): PublicKeyInfo;

  /**
   * Builds the request that reports whether a session is already established.
   *
   * @param baseUrl Base URL of the router
   * @returns Request for the busy endpoint
   */
  busyRequest(baseUrl: string): Request;
  /**
   * Extracts login and busy flags from the busy response.
   *
   * @param text Busy response body
   * @returns Login and busy state
   */
  parseBusy(text: string): BusyStatus;

  /**
   * Encodes credentials into the plaintext login payload, pre-encryption.
   *
   * @param credentials Username and password
   * @returns Plaintext login payload
   */
  encodeLogin(credentials: Credentials): string;
  /**
   * Builds the login request. Owns where the envelope rides — query string,
   * request body, or anywhere else the firmware expects it.
   *
   * @param baseUrl Base URL of the router
   * @param envelope Encrypted login envelope
   * @returns Login request
   */
  loginRequest(baseUrl: string, envelope: Envelope): Request;
  /**
   * Extracts the session id from the login response headers.
   *
   * @param headers Login response headers
   * @returns Session id, or `null` when the router refused the login
   */
  parseSessionId(headers: Headers): string | null;

  /**
   * Builds the request for the authenticated page carrying the security token.
   *
   * @param baseUrl Base URL of the router
   * @param session Session id and login attempt counter
   * @returns Request for the token-bearing page
   */
  tokenRequest(
    baseUrl: string,
    session: Pick<SessionContext, "sessionId" | "authTimes">,
  ): Request;
  /**
   * Extracts the security token from the authenticated page.
   *
   * @param html Authenticated page body
   * @returns Security token
   */
  parseTokenId(html: string): string;

  /**
   * Splits actions into round trips and serializes each. Owns the operation
   * vocabulary, stack defaults, and batching.
   *
   * @param actions Actions requested by the caller
   * @returns One batch per HTTP round trip needed
   */
  encodeCommands(actions: readonly Action[]): readonly CommandBatch[];
  /**
   * Builds a command request for one batch's envelope.
   *
   * @param baseUrl Base URL of the router
   * @param envelope Encrypted command envelope
   * @param session Session material from authentication
   * @returns Command request
   */
  commandRequest(
    baseUrl: string,
    envelope: Envelope,
    session: SessionContext,
  ): Request;
  /**
   * Decodes a decrypted command response into results aligned with the batch.
   *
   * @param text Decrypted command response body
   * @param batch Batch the response answers
   * @returns Error code and one result per batch index
   */
  decodeCommand(text: string, batch: CommandBatch): DecodedBatch;
}
