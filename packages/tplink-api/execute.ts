/**
 * Execute commands on TP-Link router.
 *
 * Provides the main API for sending commands to the router after authentication.
 */

import {
  type Action,
  parse,
  type ParsedAction,
  type Section,
  stringify,
} from "./payload.ts";
import { fetchCgiGdpr } from "./client/fetchCgiGdpr.ts";
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
  /** Array of action results corresponding to input actions */
  actions: ActionResult[];
}

/**
 * Executes one or more actions on the router.
 *
 * Handles the full request/response cycle:
 * 1. Serializes actions to the router's payload format
 * 2. Encrypts and sends the request
 * 3. Decrypts and parses the response
 * 4. Maps responses back to original requests
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
  const { encryption, sequence, sessionId, tokenId, authTimes = 1 } = options;

  const payload = stringify(actions);

  const response = await fetchCgiGdpr(baseUrl, payload, {
    encryption,
    sequence,
    sessionId,
    tokenId,
    authTimes,
  });

  if (!response) {
    return { error: -1, actions: [] };
  }

  const result = parse(response);

  const mappedActions: ActionResult[] = result.actions.map(
    (item: ParsedAction) => {
      const actionIndex = Array.isArray(item)
        ? item[0]?.actionIndex ?? 0
        : item?.actionIndex ?? 0;

      let newItem: Record<string, string> | Record<string, string>[] | null;

      if (Array.isArray(item)) {
        newItem = item.map((section: Section) => section.attributes ?? {});
      } else if (item && "attributes" in item && item.attributes) {
        if (Object.keys(item.attributes).length) {
          newItem = item.attributes;
        } else {
          newItem = null;
        }
      } else {
        newItem = null;
      }

      return {
        req: actions[actionIndex],
        res: newItem,
      };
    },
  );

  return {
    error: result.error,
    actions: mappedActions,
  };
}
