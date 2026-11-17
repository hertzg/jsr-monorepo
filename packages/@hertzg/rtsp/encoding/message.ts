/**
 * The generic RTSP message format of RFC 7826 section 5: a start-line, header
 * fields, an empty line and a message body.
 *
 * {@link decodeMessage} cuts one message off the front of a buffer and
 * {@link encodeMessage} writes one. Neither looks inside the start-line, that
 * is the job of the `protocol` modules.
 *
 * Header fields are {@link HeaderField} pairs in the order of their lines,
 * with each name as written. Nothing is sorted, respelled or merged, in
 * either direction.
 *
 * @example Decode a response and encode it again
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeMessage, encodeMessage } from "@hertzg/rtsp/encoding/message";
 *
 * const octets = new TextEncoder().encode(
 *   "RTSP/2.0 200 OK\r\n" +
 *     "CSeq: 3\r\n" +
 *     "\r\n",
 * );
 *
 * const [frame, bytesRead] = decodeMessage(octets)!;
 *
 * assertEquals(frame.startLine, "RTSP/2.0 200 OK");
 * assertEquals(frame.headerFields, [["CSeq", "3"]]);
 * assertEquals(bytesRead, 28);
 * assertEquals(encodeMessage(frame), octets);
 * ```
 *
 * @module
 */

const CR = 13;
const LF = 10;
const CRLF = "\r\n";
const CONTENT_LENGTH = "Content-Length";

/** One header field: its name exactly as written, and its value. */
export type HeaderField = [name: string, value: string];

/**
 * One RTSP message split into its three parts, with the start-line still a
 * plain string.
 */
export type MessageFrame = {
  /** The Request-Line or Status-Line, without its CRLF. */
  startLine: string;
  /**
   * The header fields, one pair per line, in the order of the lines. A name
   * that is on several lines is in several pairs. Folded values are already
   * unfolded.
   */
  headerFields: HeaderField[];
  /** The message body, empty when the message has none. */
  messageBody: Uint8Array;
};

/**
 * Decodes one RTSP message from the front of `octets`.
 *
 * Empty lines before the start-line are skipped and counted in the bytes
 * read. The header section ends at the first empty line. The body is as many
 * octets as the first `Content-Length` says, whatever its case, and none
 * without that header.
 *
 * Each header line becomes one pair, in the order of the lines. The name is
 * everything before the first colon, in the case it was written in, without
 * the spaces or tabs between it and the colon. The value is the rest,
 * without the whitespace around it. A folded value (CRLF followed by
 * spaces or tabs) is unfolded to one space. Lines with the same name stay
 * separate pairs.
 *
 * The start-line and the header fields are read one character per octet, so
 * an octet above 127 comes out as the character with that code.
 *
 * The returned `messageBody` is a copy, so the caller may reuse `octets`.
 *
 * @param octets The buffer to read from. It may hold more than one message.
 * @returns `undefined` when the message is not all there yet, otherwise the
 * frame and the number of octets it took up.
 *
 * @example Decode a response with a message body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeMessage } from "@hertzg/rtsp/encoding/message";
 *
 * const octets = new TextEncoder().encode(
 *   "RTSP/2.0 200 OK\r\n" +
 *     "CSeq: 312\r\n" +
 *     "Content-Type: application/sdp\r\n" +
 *     "Content-Length: 5\r\n" +
 *     "\r\n" +
 *     "v=0\r\n" +
 *     "RTSP/2.0 200 OK\r\n",
 * );
 *
 * const [frame, bytesRead] = decodeMessage(octets)!;
 *
 * assertEquals(frame.startLine, "RTSP/2.0 200 OK");
 * assertEquals(frame.headerFields, [
 *   ["CSeq", "312"],
 *   ["Content-Type", "application/sdp"],
 *   ["Content-Length", "5"],
 * ]);
 * assertEquals(frame.messageBody, new TextEncoder().encode("v=0\r\n"));
 * assertEquals(bytesRead, 85);
 * ```
 *
 * @example Keep the spelling and the repeated lines a camera sends
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeMessage } from "@hertzg/rtsp/encoding/message";
 *
 * const octets = new TextEncoder().encode(
 *   "RTSP/1.0 401 Unauthorized\r\n" +
 *     "cseq: 2\r\n" +
 *     'WWW-Authenticate: Digest realm="camera"\r\n' +
 *     'WWW-Authenticate: Basic realm="camera"\r\n' +
 *     "\r\n",
 * );
 *
 * const [frame] = decodeMessage(octets)!;
 *
 * assertEquals(frame.headerFields, [
 *   ["cseq", "2"],
 *   ["WWW-Authenticate", 'Digest realm="camera"'],
 *   ["WWW-Authenticate", 'Basic realm="camera"'],
 * ]);
 * assertEquals(new Headers(frame.headerFields).get("CSeq"), "2");
 * ```
 *
 * @example Wait for more octets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeMessage } from "@hertzg/rtsp/encoding/message";
 *
 * const octets = new TextEncoder().encode("RTSP/2.0 200 OK\r\nCSeq: 3\r\n");
 *
 * assertEquals(decodeMessage(octets), undefined);
 * ```
 */
export function decodeMessage(
  octets: Uint8Array,
): [MessageFrame, number] | undefined {
  const headStart = skipEmptyLines(octets);
  const headEnd = findEmptyLine(octets, headStart);
  if (headEnd === undefined) {
    return undefined;
  }

  const [startLine, ...headerLines] = decodeLatin1(
    octets.subarray(headStart, headEnd),
  ).replace(/\r\n[ \t]+/g, " ").split(CRLF);

  const headerFields = headerLines.map((line): HeaderField => {
    const colon = line.indexOf(":");
    return [line.slice(0, colon).trimEnd(), line.slice(colon + 1).trim()];
  });
  const contentLength = headerFields.find(([name]) =>
    isSameHeaderName(name, CONTENT_LENGTH)
  );

  const bodyStart = headEnd + 2 * CRLF.length;
  const bodyEnd = bodyStart + Number(contentLength?.[1] ?? 0);
  if (octets.length < bodyEnd) {
    return undefined;
  }

  const messageBody = octets.slice(bodyStart, bodyEnd);
  return [{ startLine, headerFields, messageBody }, bodyEnd];
}

/**
 * Encodes one RTSP message.
 *
 * Each pair of `headerFields` is written as one line, in the order given and
 * with the name as given.
 *
 * When `messageBody` is not empty, `Content-Length` is set to its length. If
 * `headerFields` holds that name already, in any case, the first such pair
 * keeps its place and its spelling and gets the new value, and later pairs
 * with that name are left out. Otherwise `Content-Length` is written as the
 * last line. The frame's `headerFields` and its pairs are not changed.
 *
 * The start-line and the header fields are written one octet per character,
 * so every character in them must have a code below 256.
 *
 * @param frame The start-line, header fields and message body to write.
 * @returns The octets of the message.
 *
 * @example Encode a request with a message body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeMessage } from "@hertzg/rtsp/encoding/message";
 *
 * const octets = encodeMessage({
 *   startLine: "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0",
 *   headerFields: [
 *     ["CSeq", "421"],
 *     ["Content-Type", "text/parameters"],
 *   ],
 *   messageBody: new TextEncoder().encode("barparam: barstuff\r\n"),
 * });
 *
 * assertEquals(
 *   new TextDecoder().decode(octets),
 *   "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0\r\n" +
 *     "CSeq: 421\r\n" +
 *     "Content-Type: text/parameters\r\n" +
 *     "Content-Length: 20\r\n" +
 *     "\r\n" +
 *     "barparam: barstuff\r\n",
 * );
 * ```
 *
 * @example Write the header names the way a camera wants them
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeMessage } from "@hertzg/rtsp/encoding/message";
 *
 * const octets = encodeMessage({
 *   startLine: "OPTIONS * RTSP/1.0",
 *   headerFields: [
 *     ["User-Agent", "PhonyClient/1.2"],
 *     ["cseq", "1"],
 *   ],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(
 *   new TextDecoder().decode(octets),
 *   "OPTIONS * RTSP/1.0\r\n" +
 *     "User-Agent: PhonyClient/1.2\r\n" +
 *     "cseq: 1\r\n" +
 *     "\r\n",
 * );
 * ```
 */
export function encodeMessage(frame: MessageFrame): Uint8Array {
  const { startLine, messageBody } = frame;
  const headerFields = messageBody.length > 0
    ? setHeaderField(frame.headerFields, [
      CONTENT_LENGTH,
      String(messageBody.length),
    ])
    : frame.headerFields;

  const lines = [
    startLine,
    ...headerFields.map(([name, value]) => `${name}: ${value}`),
  ];
  const head = encodeLatin1(lines.join(CRLF) + CRLF + CRLF);

  const octets = new Uint8Array(head.length + messageBody.length);
  octets.set(head);
  octets.set(messageBody, head.length);
  return octets;
}

/** Returns the index of the first octet after any leading CRLFs. */
function skipEmptyLines(octets: Uint8Array): number {
  let index = 0;
  while (octets[index] === CR && octets[index + 1] === LF) {
    index += CRLF.length;
  }
  return index;
}

/**
 * Returns the index of the CRLF CRLF that ends the header section, searching
 * from `start`, or `undefined` when it has not arrived yet.
 */
function findEmptyLine(octets: Uint8Array, start: number): number | undefined {
  for (let index = start; index + 3 < octets.length; index++) {
    if (
      octets[index] === CR && octets[index + 1] === LF &&
      octets[index + 2] === CR && octets[index + 3] === LF
    ) {
      return index;
    }
  }
  return undefined;
}

/**
 * One character per octet. `TextDecoder("latin1")` is not that: it decodes
 * windows-1252 and remaps 0x80-0x9F.
 */
function decodeLatin1(octets: Uint8Array): string {
  return Array.from(octets, (octet) => String.fromCharCode(octet)).join("");
}

/** One octet per character, the reverse of {@link decodeLatin1}. */
function encodeLatin1(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

/** Tells whether two header names are the same name, whatever their case. */
function isSameHeaderName(name: string, other: string): boolean {
  return name.toLowerCase() === other.toLowerCase();
}

/**
 * Returns a copy of `headerFields` in which the header named like `field`,
 * whatever its case, has the value of `field`.
 *
 * The first pair with that name keeps its place and its spelling and gets the
 * value, later pairs with that name are left out. Without such a pair,
 * `field` goes to the end. Neither `headerFields` nor its pairs are changed.
 */
function setHeaderField(
  headerFields: HeaderField[],
  field: HeaderField,
): HeaderField[] {
  const [name, value] = field;
  const first = headerFields.findIndex(([other]) =>
    isSameHeaderName(other, name)
  );
  if (first === -1) {
    return [...headerFields, [name, value]];
  }
  return headerFields.flatMap((other, index): HeaderField[] => {
    if (index === first) {
      return [[other[0], value]];
    }
    return isSameHeaderName(other[0], name) ? [] : [other];
  });
}
