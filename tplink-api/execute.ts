/**
 * Execute commands on TP-Link router
 */

import { parse, stringify, type Action, type ParsedAction, type Section } from "./payload.ts";
import { fetchCgiGdpr } from "./client/fetchCgiGdpr.ts";
import type { Encryption } from "./client/encryption.ts";

export interface ExecuteOptions {
  encryption: Encryption;
  sequence: number;
  sessionId: string;
  tokenId: string;
  authTimes?: number;
}

export interface ActionResult {
  req: Action;
  res: Record<string, string> | Record<string, string>[] | null;
}

export interface ExecuteResult {
  error: number | null;
  actions: ActionResult[];
}

export async function execute(
  baseUrl: string,
  actions: Action[],
  options: ExecuteOptions
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

  const mappedActions: ActionResult[] = result.actions.map((item: ParsedAction) => {
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
  });

  return {
    error: result.error,
    actions: mappedActions,
  };
}
