/**
 * Execute commands on TP-Link router.
 *
 * Provides the main API for sending commands to the router after
 * authentication. Payload framing, endpoint selection and batching all live in
 * the {@linkcode Dialect}; this module owns only the I/O and the encryption
 * calls, and never branches on which dialect it was given.
 */

import type { Action, Dialect, SessionContext } from "./dialect/dialect.ts";
import { gdprText } from "./dialect/gdprText.ts";
import type { Encryption } from "./client/encryption.ts";

/**
 * Options required for executing commands on the router.
 * These values are obtained from {@linkcode authenticate}.
 */
export interface ExecuteOptions {
  /** Encryption instance for payload encryption/decryption */
  encryption: Encryption;
  /** Sequence number for request signing */
  sequence: number;
  /** Session ID from authentication */
  sessionId: string;
  /** Security token from authentication */
  tokenId: string;
  /** Authentication times counter (defaults to 1) */
  authTimes?: number;
  /** Firmware dialect to speak (defaults to {@linkcode gdprText}) */
  dialect?: Dialect;
  /** Swappable `fetch`, for tests or non-standard HTTP stacks */
  fetch?: typeof globalThis.fetch;
}

/**
 * Result of a single action execution, mapping request to response.
 */
export interface ActionResult {
  /** Original action that was requested */
  req: Action;
  /** Response data: single object, array of objects, or null if no data */
  res: Record<string, string> | Record<string, string>[] | null;
}

/**
 * Result of executing one or more actions on the router.
 */
export interface ExecuteResult {
  /** Error code from router, or null if successful */
  error: number | null;
  /** Array of action results, positionally aligned with the input actions */
  actions: ActionResult[];
}

const encoder = new TextEncoder();

/**
 * Executes one or more actions on the router.
 *
 * Handles the full request/response cycle:
 * 1. Splits the actions into as many round trips as the dialect needs
 * 2. Encrypts and sends each request
 * 3. Decrypts and decodes each response
 * 4. Maps responses back onto the original requests by position
 *
 * The returned `actions` array always has one entry per input action, in input
 * order; actions the router returned nothing for carry `res: null`. A transport
 * failure (any non-200 response) short-circuits to
 * `{ error: -1, actions: [] }`.
 *
 * @param baseUrl Base URL of the router
 * @param actions Array of actions to execute
 * @param options Execution options from authentication result
 * @returns Execution result with error status and action responses
 *
 * @example Get LTE band information
 * ```ts ignore
 * import { ACT, authenticate, execute } from "@hertzg/tplink-api";
 *
 * const auth = await authenticate("http://192.168.1.1", { password: "admin" });
 * if (auth) {
 *   const result = await execute(
 *     "http://192.168.1.1",
 *     [[ACT.GET, "LTE_BANDINFO"]],
 *     auth,
 *   );
 *   // result.actions[0].res contains the band info
 * }
 * ```
 *
 * @example Execute multiple actions
 * ```ts ignore
 * import { ACT, authenticate, execute } from "@hertzg/tplink-api";
 *
 * const auth = await authenticate("http://192.168.1.1", { password: "admin" });
 * if (auth) {
 *   const result = await execute(
 *     "http://192.168.1.1",
 *     [
 *       [ACT.SET, "LTE_SMS_UNREADMSGBOX", { pageNumber: "1" }],
 *       [ACT.GS, "LTE_SMS_UNREADMSGENTRY", ["index", "from", "content"]],
 *     ],
 *     auth,
 *   );
 * }
 * ```
 */
export async function execute(
  baseUrl: string,
  actions: Action[],
  options: ExecuteOptions,
): Promise<ExecuteResult> {
  const {
    encryption,
    sequence,
    sessionId,
    tokenId,
    authTimes = 1,
    dialect = gdprText,
    fetch = globalThis.fetch,
  } = options;

  const session: SessionContext = { sessionId, tokenId, authTimes };
  const results: ActionResult[] = actions.map((req) => ({ req, res: null }));
  let error: number | null = null;

  for (const batch of dialect.encodeCommands(actions)) {
    const envelope = encryption.encrypt(
      encoder.encode(batch.payload),
      sequence,
    );

    const response = await fetch(
      dialect.commandRequest(baseUrl, envelope, session),
    );

    if (response.status !== 200) {
      await response.body?.cancel();
      return { error: -1, actions: [] };
    }

    const decoded = dialect.decodeCommand(
      encryption.decrypt(await response.text()),
      batch,
    );

    error ??= decoded.error;
    batch.indices.forEach((index, position) => {
      results[index].res = decoded.results[position] ?? null;
    });
  }

  return { error, actions: results };
}
