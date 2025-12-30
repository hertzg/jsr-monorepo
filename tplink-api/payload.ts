/**
 * Payload serialization for TP-Link router API
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

export type ActionType = (typeof ACT)[keyof typeof ACT];

export type Action = [
  type: ActionType,
  oid: string,
  attributes?: Record<string, string> | string[],
  stack?: string,
  pStack?: string,
];

export interface Section {
  stack: string;
  actionIndex: number;
  attributes?: Record<string, string>;
  script?: string;
  code?: number;
}

export interface PlaceholderSection {
  actionIndex: number;
}

export type ParsedAction = Section | Section[] | PlaceholderSection;

export interface ParsedResponse {
  error: number | null;
  actions: ParsedAction[];
}

const LINE_BREAK = "\r\n";

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
