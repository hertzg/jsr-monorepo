/**
 * Payload serialization for TP-Link router API.
 *
 * Handles conversion between action arrays and the router's custom text-based
 * protocol format used for API requests and responses.
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
 * @example Get LTE band information
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT } from "./payload.ts";
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
 * import { ACT, type Action } from "./payload.ts";
 *
 * const action: Action = [ACT.GET, "LTE_BANDINFO"];
 * ```
 *
 * @example GET with specific attributes to retrieve
 * ```ts
 * import { ACT, type Action } from "./payload.ts";
 *
 * const action: Action = [ACT.GET, "LTE_SMS_UNREADMSGBOX", ["totalNumber"]];
 * ```
 *
 * @example SET with attribute values
 * ```ts
 * import { ACT, type Action } from "./payload.ts";
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
 * A parsed section from a router response.
 */
export interface Section {
  /** Stack identifier from the response header */
  stack: string;
  /** Index of the action this section responds to */
  actionIndex: number;
  /** Key-value attributes returned by the router */
  attributes?: Record<string, string>;
  /** Script content for CGI responses */
  script?: string;
  /** Error code for error sections */
  code?: number;
}

/**
 * Placeholder for missing action indices in sparse responses.
 */
export interface PlaceholderSection {
  /** Index of the placeholder action */
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
  /** Error code from the response, or null if no error */
  error: number | null;
  /** Array of parsed actions corresponding to request action indices */
  actions: ParsedAction[];
}

const LINE_BREAK = "\r\n";

/**
 * Serializes an array of actions into the router's request payload format.
 *
 * The output format consists of:
 * 1. A preamble line with action types joined by `&`
 * 2. Action blocks with headers `[oid#stack#pStack]index,attrCount`
 * 3. Attribute lines in `key=value` format
 *
 * @param actions Array of actions to serialize
 * @returns Serialized payload string ready for encryption and transmission
 *
 * @example Stringify a single GET action
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT, stringify } from "./payload.ts";
 *
 * const payload = stringify([[ACT.GET, "LTE_BANDINFO"]]);
 *
 * assertEquals(payload, "1\r\n[LTE_BANDINFO#0,0,0,0,0,0#0,0,0,0,0,0]0,0\r\n");
 * ```
 *
 * @example Stringify action with attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ACT, stringify } from "./payload.ts";
 *
 * const payload = stringify([[ACT.SET, "OID", { key: "value" }]]);
 *
 * assertEquals(
 *   payload,
 *   "2\r\n[OID#0,0,0,0,0,0#0,0,0,0,0,0]0,1\r\nkey=value\r\n",
 * );
 * ```
 */
export function stringify(actions: Action[]): string {
  const { preamble, blocks } = actions.reduce(
    (
      acc,
      [
        type,
        oid,
        attributes = [],
        stack = "0,0,0,0,0,0",
        pStack = "0,0,0,0,0,0",
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
 * import { parse, type Section } from "./payload.ts";
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
 * import { parse } from "./payload.ts";
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
