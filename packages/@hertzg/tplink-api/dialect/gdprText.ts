/**
 * The `gdprText` dialect: EU/GDPR firmware speaking the bespoke text payload
 * format over `/cgi_gdpr`.
 *
 * This is the protocol the package was originally reverse-engineered against —
 * TL-MR6400, Archer VR900v, TL-MR6500v, Archer MR600 v2 and similar. Requests
 * carry a preamble of action types followed by one bracketed block per action;
 * responses carry one bracketed section per action index.
 */

import type {
  Action,
  CommandBatch,
  Credentials,
  DecodedBatch,
  Dialect,
  Envelope,
  SessionContext,
} from "./dialect.ts";
import { parseInfoHtml } from "../client/info.ts";
import { parsePublicKeyText } from "../client/publicKey.ts";
import { parseBusyText } from "../client/busy.ts";
import { parseSessionIdHeaders } from "../client/session.ts";
import { parseTokenIdHtml } from "../client/token.ts";
import { envelopeBody, rootHref, sessionCookie } from "../client/request.ts";

/**
 * A parsed section from a router response.
 */
export interface Section {
  /** Section identifier from the response header — the whole bracket content. */
  stack: string;
  /** Index of the action this section responds to. */
  actionIndex: number;
  /** Key-value attributes returned by the router. */
  attributes?: Record<string, string>;
  /** Script content for CGI responses. */
  script?: string;
  /** Error code for error sections. */
  code?: number;
}

/**
 * Placeholder for missing action indices in sparse responses.
 */
export interface PlaceholderSection {
  /** Index of the placeholder action. */
  actionIndex: number;
}

/**
 * A parsed action from the response, which may be a single section,
 * multiple sections (for actions returning multiple results), or a placeholder.
 */
export type ParsedAction = Section | Section[] | PlaceholderSection;

/**
 * Parsed response from the router containing error status and action results.
 */
export interface ParsedResponse {
  /** Error code from the response, or null if no error. */
  error: number | null;
  /** Array of parsed actions corresponding to request action indices. */
  actions: ParsedAction[];
}

const LINE_BREAK = "\r\n";
const DEFAULT_STACK = "0,0,0,0,0,0";

/**
 * Serializes an array of actions into the dialect's request payload format.
 *
 * The output format consists of:
 * 1. A preamble line with action types joined by `&`
 * 2. Action blocks with headers `[oid#stack#pStack]index,attrCount`
 * 3. Attribute lines, verbatim for the array form and `key=value` for the
 *    object form
 *
 * @param actions Array of actions to serialize
 * @returns Serialized payload string ready for encryption and transmission
 *
 * @example Stringify a single GET action
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { stringify } from "./gdprText.ts";
 *
 * const payload = stringify([[ACT.GET, "LTE_BANDINFO"]]);
 *
 * assertEquals(payload, "1\r\n[LTE_BANDINFO#0,0,0,0,0,0#0,0,0,0,0,0]0,0\r\n");
 * ```
 *
 * @example Stringify action with attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { stringify } from "./gdprText.ts";
 *
 * const payload = stringify([[ACT.SET, "OID", { key: "value" }]]);
 *
 * assertEquals(
 *   payload,
 *   "2\r\n[OID#0,0,0,0,0,0#0,0,0,0,0,0]0,1\r\nkey=value\r\n",
 * );
 * ```
 */
export function stringify(actions: readonly Action[]): string {
  const { preamble, blocks } = actions.reduce(
    (
      acc,
      [
        type,
        oid,
        attributes = [],
        stack = DEFAULT_STACK,
        pStack = DEFAULT_STACK,
      ],
      index,
    ) => {
      acc.preamble.push(type);

      const attributeLines = Array.isArray(attributes)
        ? attributes
        : Object.entries(attributes).map(([k, v]) => `${k}=${v}`);

      const header = [oid, stack, pStack].join("#");
      const marker = [index, attributeLines.length].join(",");

      acc.blocks.push(
        [`[${header}]${marker}`, ...attributeLines].join(LINE_BREAK),
      );

      return acc;
    },
    { preamble: [] as number[], blocks: [] as string[] },
  );

  return [preamble.join("&"), blocks.join(LINE_BREAK), ""].join(LINE_BREAK);
}

function parseSectionHeader(line: string): Section {
  const endOfHeaderIndex = line.indexOf("]");
  const stack = line.slice(1, endOfHeaderIndex);
  const trailingNumber = Number(line.slice(endOfHeaderIndex + 1));
  const section: Section = {
    stack,
    actionIndex: trailingNumber,
  };

  switch (stack) {
    case "cgi":
      return { ...section, script: "" };
    case "error":
      return { ...section, code: trailingNumber };
    default:
      return { ...section, attributes: {} };
  }
}

function parseAttributeLine(line: string, section: Section): void {
  const [name, ...values] = line.split("=");
  if (section.attributes) {
    section.attributes[name] = values.join("=");
  }
}

function parseScriptLine(line: string, section: Section): void {
  if (section.script !== undefined) {
    section.script += `${line}\n`;
  }
}

/**
 * Parses a router response string into a structured response object.
 *
 * Handles various section types:
 * - Regular sections with attributes
 * - Error sections with error codes
 * - CGI sections with script content
 * - Multiple sections for the same action index
 *
 * @param data Raw response string from the router (after decryption)
 * @returns Parsed response with error status and action results
 *
 * @example Parse a simple response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse, type Section } from "./gdprText.ts";
 *
 * const response = parse("[stack]0\nkey=value");
 * const action = response.actions[0] as Section;
 *
 * assertEquals(response.error, null);
 * assertEquals(action.attributes?.key, "value");
 * ```
 *
 * @example Parse error response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "./gdprText.ts";
 *
 * const response = parse("[error]5");
 *
 * assertEquals(response.error, 5);
 * ```
 */
export function parse(data: string): ParsedResponse {
  const lines = data.split("\n");

  const sections: Section[] = [];
  let section: Section | undefined;

  for (const line of lines) {
    if (line.startsWith("[")) {
      section = parseSectionHeader(line);
      sections.push(section);
    } else if (section && section.stack === "cgi") {
      parseScriptLine(line, section);
    } else if (line && section) {
      parseAttributeLine(line, section);
    }
  }

  const combined = sections.reduce(
    (acc, section) => {
      if (section.stack === "error") {
        acc.error = section.code ?? null;
      } else {
        const existing = acc.actions[section.actionIndex] as
          | Section
          | Section[]
          | undefined;
        if (existing) {
          acc.actions[section.actionIndex] = Array.isArray(existing)
            ? [...existing, section]
            : [existing, section];
        } else {
          acc.actions[section.actionIndex] = section;
        }
      }
      return acc;
    },
    { error: null, actions: [] } as ParsedResponse,
  );

  for (let i = 0; i < combined.actions.length; i++) {
    if (!combined.actions[i]) {
      combined.actions[i] = { actionIndex: i };
    }
  }

  return combined;
}

function normalizeSection(
  action: ParsedAction | undefined,
): Record<string, string> | Record<string, string>[] | null {
  if (Array.isArray(action)) {
    return action.map((section) => section.attributes ?? {});
  }

  if (action && "attributes" in action && action.attributes) {
    return Object.keys(action.attributes).length ? action.attributes : null;
  }

  return null;
}

/**
 * EU/GDPR firmware speaking the bespoke text payload format over `/cgi_gdpr`.
 *
 * This dialect is the package default; callers targeting TL-MR6400, Archer
 * VR900v, TL-MR6500v, Archer MR600 v2 and similar models never need to name it.
 *
 * All actions of one `execute` call travel in a single request: the dialect
 * emits exactly one batch covering every action index.
 *
 * @example Build a command request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gdprText } from "./gdprText.ts";
 *
 * const request = gdprText.commandRequest(
 *   "http://192.168.1.1",
 *   { data: "ZGF0YQ==", sign: "00ff" },
 *   { sessionId: "abc123", tokenId: "tok", authTimes: 1 },
 * );
 *
 * assertEquals(request.method, "POST");
 * assertEquals(request.url, "http://192.168.1.1/cgi_gdpr");
 * assertEquals(request.headers.get("tokenid"), "tok");
 * assertEquals(
 *   request.headers.get("cookie"),
 *   "loginErrorShow=1; JSESSIONID=abc123",
 * );
 * assertEquals(await request.text(), "sign=00ff\r\ndata=ZGF0YQ==\r\n");
 * ```
 *
 * @example Batch every action into one round trip
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./dialect.ts";
 * import { gdprText } from "./gdprText.ts";
 *
 * const batches = gdprText.encodeCommands([
 *   [ACT.GET, "IGD_DEV_INFO"],
 *   [ACT.GET, "LTE_BANDINFO"],
 * ]);
 *
 * assertEquals(batches.length, 1);
 * assertEquals(batches[0].indices, [0, 1]);
 * ```
 */
export const gdprText: Dialect = {
  id: "gdprText",
  defaultUsername: "admin",

  infoRequest: (baseUrl: string): Request =>
    new Request(new URL("/", baseUrl), {
      method: "GET",
      headers: { Referer: rootHref(baseUrl) },
    }),
  parseInfo: parseInfoHtml,

  publicKeyRequest: (baseUrl: string): Request =>
    new Request(new URL("cgi/getParm", baseUrl), {
      method: "POST",
      headers: { Referer: rootHref(baseUrl) },
    }),
  parsePublicKey: parsePublicKeyText,

  busyRequest: (baseUrl: string): Request =>
    new Request(new URL("cgi/getBusy", baseUrl), {
      method: "POST",
      headers: { Referer: rootHref(baseUrl) },
    }),
  parseBusy: parseBusyText,

  encodeLogin: ({ username, password }: Credentials): string =>
    `${username}\n${password}`,

  loginRequest: (baseUrl: string, envelope: Envelope): Request => {
    const url = new URL("cgi/login", baseUrl);
    url.searchParams.set("data", envelope.data);
    url.searchParams.set("sign", envelope.sign);
    url.searchParams.set("Action", "1");
    url.searchParams.set("LoginStatus", "0");

    return new Request(url, {
      method: "POST",
      headers: { Referer: rootHref(baseUrl) },
    });
  },
  parseSessionId: parseSessionIdHeaders,

  tokenRequest: (
    baseUrl: string,
    session: Pick<SessionContext, "sessionId" | "authTimes">,
  ): Request =>
    new Request(new URL("/", baseUrl), {
      method: "GET",
      headers: {
        Referer: rootHref(baseUrl),
        Cookie: sessionCookie(session),
      },
    }),
  parseTokenId: parseTokenIdHtml,

  encodeCommands: (actions: readonly Action[]): readonly CommandBatch[] => [{
    payload: stringify(actions),
    indices: actions.map((_, index) => index),
  }],

  commandRequest: (
    baseUrl: string,
    envelope: Envelope,
    session: SessionContext,
  ): Request =>
    new Request(new URL("cgi_gdpr", baseUrl), {
      method: "POST",
      headers: {
        Referer: rootHref(baseUrl),
        Cookie: sessionCookie(session),
        TokenID: session.tokenId,
        "Content-Type": "text/plain",
      },
      body: envelopeBody(envelope),
    }),

  decodeCommand: (text: string, batch: CommandBatch): DecodedBatch => {
    const parsed = parse(text);

    return {
      error: parsed.error,
      results: batch.indices.map((_, position) =>
        normalizeSection(parsed.actions[position])
      ),
    };
  },
};
