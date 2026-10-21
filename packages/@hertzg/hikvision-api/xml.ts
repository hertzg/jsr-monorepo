/**
 * Reading ISAPI XML documents.
 *
 * Every ISAPI reply is one XML document: a config document such as
 * `<DeviceInfo>`, a stream part such as `<EventNotificationAlert>`, or a
 * `<ResponseStatus>` describing why the request failed. Devices answer
 * HTTP 200 to requests they do not support, so the failure has to be read
 * from the body:
 *
 * ```xml
 * <ResponseStatus version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
 * <requestURL>/ISAPI/Smart/FieldDetection/1</requestURL>
 * <statusCode>4</statusCode>
 * <statusString>Invalid Operation</statusString>
 * <subStatusCode>notSupport</subStatusCode>
 * </ResponseStatus>
 * ```
 *
 * {@link parseIsapi} parses a document and throws an {@link IsapiError} on
 * such a body. The other helpers read children of an element by local name,
 * ignoring namespaces, so a document works the same whether the firmware
 * declares `xmlns` or not.
 *
 * @example Detect a not-supported reply
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { IsapiError, parseIsapi } from "@hertzg/hikvision-api/xml";
 *
 * const xml = "<ResponseStatus><statusCode>4</statusCode>" +
 *   "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";
 *
 * assertThrows(() => parseIsapi(xml), IsapiError, "notSupport");
 * ```
 *
 * @module
 */

import { isCData, isElement, isText, parse, type XmlElement } from "@std/xml";

/** The fields of a `<ResponseStatus>` document. */
export type ResponseStatus = {
  /** The path the device is answering about. */
  requestURL?: string;
  /** `1` is OK; anything else is a failure. */
  statusCode: number;
  /** A short description, such as `Invalid Operation`. */
  statusString?: string;
  /** The precise reason, such as `notSupport` or `badAuthorization`. */
  subStatusCode?: string;
};

/** A `<ResponseStatus>` with a status code other than `1`. */
export class IsapiError extends Error {
  /** The parsed `<ResponseStatus>`. */
  readonly status: ResponseStatus;

  /**
   * @param status The parsed `<ResponseStatus>`.
   */
  constructor(status: ResponseStatus) {
    super(
      `ISAPI ${status.requestURL ?? "request"} failed: ${status.statusCode} ${
        status.subStatusCode ?? status.statusString ?? ""
      }`.trimEnd(),
    );
    this.name = "IsapiError";
    this.status = status;
  }
}

/**
 * Parses an ISAPI document and returns its root element.
 *
 * @param xml The document text.
 * @returns The root element.
 * @throws {IsapiError} When the document is a `<ResponseStatus>` whose
 *   `statusCode` is not `1`.
 *
 * @example Read the root of a device reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIsapi, text } from "@hertzg/hikvision-api/xml";
 *
 * const root = parseIsapi(
 *   '<?xml version="1.0" encoding="UTF-8" ?>' +
 *     '<DeviceInfo xmlns="http://www.hikvision.com/ver20/XMLSchema">' +
 *     "<deviceType>NVR</deviceType></DeviceInfo>",
 * );
 *
 * assertEquals(root.name.local, "DeviceInfo");
 * assertEquals(text(root, "deviceType"), "NVR");
 * ```
 */
export function parseIsapi(xml: string): XmlElement {
  const root = parse(xml).root;
  if (root.name.local === "ResponseStatus") {
    const status = parseResponseStatus(root);
    if (status.statusCode !== 1) {
      throw new IsapiError(status);
    }
  }
  return root;
}

/**
 * Reads the fields of a `<ResponseStatus>` element.
 *
 * @param element The `<ResponseStatus>` element.
 * @returns The status fields.
 *
 * @example Read a successful status
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { parseResponseStatus } from "@hertzg/hikvision-api/xml";
 *
 * const root = parse(
 *   "<ResponseStatus><requestURL>/ISAPI/System/reboot</requestURL>" +
 *     "<statusCode>1</statusCode><statusString>OK</statusString>" +
 *     "<subStatusCode>ok</subStatusCode></ResponseStatus>",
 * ).root;
 *
 * assertEquals(parseResponseStatus(root), {
 *   requestURL: "/ISAPI/System/reboot",
 *   statusCode: 1,
 *   statusString: "OK",
 *   subStatusCode: "ok",
 * });
 * ```
 */
export function parseResponseStatus(element: XmlElement): ResponseStatus {
  return {
    requestURL: text(element, "requestURL"),
    statusCode: Number(text(element, "statusCode") ?? "0"),
    statusString: text(element, "statusString"),
    subStatusCode: text(element, "subStatusCode"),
  };
}

/**
 * The child elements of `parent` with local name `name`, in document order.
 *
 * @param parent The element to look under.
 * @param name The local name to match.
 * @returns The matching children; empty when there are none.
 *
 * @example Collect repeated entries
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { elements, text } from "@hertzg/hikvision-api/xml";
 *
 * const list = parse(
 *   "<List><Item><id>1</id></Item><Item><id>2</id></Item></List>",
 * ).root;
 *
 * assertEquals(elements(list, "Item").map((item) => text(item, "id")), ["1", "2"]);
 * ```
 */
export function elements(parent: XmlElement, name: string): XmlElement[] {
  return parent.children.filter(isElement).filter((child) =>
    child.name.local === name
  );
}

/**
 * The first child element of `parent` with local name `name`.
 *
 * @param parent The element to look under.
 * @param name The local name to match.
 * @returns The child, or `undefined` when there is none.
 *
 * @example Reach a nested element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { element, text } from "@hertzg/hikvision-api/xml";
 *
 * const root = parse("<Grid><Size><rows>18</rows></Size></Grid>").root;
 *
 * assertEquals(text(element(root, "Size")!, "rows"), "18");
 * assertEquals(element(root, "Missing"), undefined);
 * ```
 */
export function element(
  parent: XmlElement,
  name: string,
): XmlElement | undefined {
  return elements(parent, name)[0];
}

/**
 * The text content of `element`: its text and CDATA children joined.
 *
 * @param element The element to read.
 * @returns The text, `""` for an empty element.
 *
 * @example Read an element's text
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { textOf } from "@hertzg/hikvision-api/xml";
 *
 * assertEquals(textOf(parse("<model>DS-2CD2043G2-I</model>").root), "DS-2CD2043G2-I");
 * ```
 */
export function textOf(element: XmlElement): string {
  return element.children
    .filter((node) => isText(node) || isCData(node))
    .map((node) => node.text)
    .join("");
}

/**
 * The text of the first child of `parent` named `name`.
 *
 * @param parent The element to look under.
 * @param name The local name of the child.
 * @returns The child's text, or `undefined` when there is no such child.
 *
 * @example Read an optional field
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { text } from "@hertzg/hikvision-api/xml";
 *
 * const alert = parse("<Alert><eventType>VMD</eventType></Alert>").root;
 *
 * assertEquals(text(alert, "eventType"), "VMD");
 * assertEquals(text(alert, "channelName"), undefined);
 * ```
 */
export function text(parent: XmlElement, name: string): string | undefined {
  const child = element(parent, name);
  return child === undefined ? undefined : textOf(child);
}

/**
 * The text of the child named `name`, which must exist.
 *
 * @param parent The element to look under.
 * @param name The local name of the child.
 * @returns The child's text.
 * @throws {Error} When `parent` has no child named `name`.
 *
 * @example Fail on a missing required field
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { requireText } from "@hertzg/hikvision-api/xml";
 *
 * const info = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;
 *
 * assertThrows(() => requireText(info, "firmwareVersion"), Error, "<firmwareVersion>");
 * ```
 */
export function requireText(parent: XmlElement, name: string): string {
  const value = text(parent, name);
  if (value === undefined) {
    throw new Error(`ISAPI <${parent.name.local}> has no <${name}>`);
  }
  return value;
}

/**
 * Splits a comma-separated ISAPI list such as `human,vehicle`.
 *
 * @param value The list text, or `undefined` for a missing element.
 * @returns The trimmed, non-empty items; `[]` for `undefined` or `""`.
 *
 * @example Split detection targets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tokens } from "@hertzg/hikvision-api/xml";
 *
 * assertEquals(tokens("human,vehicle"), ["human", "vehicle"]);
 * assertEquals(tokens(undefined), []);
 * ```
 */
export function tokens(value: string | undefined): string[] {
  return (value ?? "").split(",").map((token) => token.trim()).filter((
    token,
  ) => token !== "");
}

/** A point in a device's normalized 1000 x 1000 screen space. */
export type Point = {
  /** `<positionX>`, 0 at the left edge. */
  x: number;
  /** `<positionY>`, 0 at the top edge. */
  y: number;
};

/**
 * Reads the `<positionX>`/`<positionY>` pairs listed under `parent`.
 *
 * Works for every ISAPI coordinate list: `<RegionCoordinatesList>` holds
 * `<RegionCoordinates>`, `<CoordinatesList>` holds `<Coordinates>`, and
 * both name the pair the same way.
 *
 * @param parent The list element.
 * @returns The points in document order.
 *
 * @example Read a line's two ends
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { points } from "@hertzg/hikvision-api/xml";
 *
 * const list = parse(
 *   "<CoordinatesList>" +
 *     "<Coordinates><positionX>826</positionX><positionY>767</positionY></Coordinates>" +
 *     "<Coordinates><positionX>880</positionX><positionY>762</positionY></Coordinates>" +
 *     "</CoordinatesList>",
 * ).root;
 *
 * assertEquals(points(list), [{ x: 826, y: 767 }, { x: 880, y: 762 }]);
 * ```
 */
export function points(parent: XmlElement): Point[] {
  return parent.children.filter(isElement).map((pair) => ({
    x: Number(requireText(pair, "positionX")),
    y: Number(requireText(pair, "positionY")),
  }));
}
