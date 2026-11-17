/**
 * The generic RTSP message format of RFC 7826 section 5: a start-line, header
 * fields, an empty line and a message body.
 *
 * {@link decodeMessage} cuts one message off the front of a buffer and
 * {@link encodeMessage} writes one. Neither looks inside the start-line, that
 * is the job of the `protocol` modules.
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
 * assertEquals(frame.headerFields.get("CSeq"), "3");
 * assertEquals(bytesRead, 28);
 * assertEquals(encodeMessage(frame), octets);
 * ```
 *
 * @module
 */

const CR = 13;
const LF = 10;
const CRLF = "\r\n";

/**
 * Header names RFC 7826 section 18 spells differently from "capital letter
 * after every dash". `Headers` only keeps the lower-case name, so the encoder
 * needs these to write the name the RFC uses.
 */
const HEADER_NAME_SPELLINGS: Record<string, string> = {
  "cseq": "CSeq",
  "mtag": "MTag",
  "rtp-info": "RTP-Info",
  "www-authenticate": "WWW-Authenticate",
};

/**
 * One RTSP message split into its three parts, with the start-line still a
 * plain string.
 */
export type MessageFrame = {
  /** The Request-Line or Status-Line, without its CRLF. */
  startLine: string;
  /** The header fields. Folded values are already unfolded. */
  headerFields: Headers;
  /** The message body, empty when the message has none. */
  messageBody: Uint8Array;
};

/**
 * Decodes one RTSP message from the front of `octets`.
 *
 * Empty lines before the start-line are skipped and counted in the bytes
 * read. The header section ends at the first empty line. A folded header
 * value (CRLF followed by spaces or tabs) is unfolded to one space. The body
 * is as many octets as `Content-Length` says, none without that header.
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
 * assertEquals(frame.headerFields.get("Content-Type"), "application/sdp");
 * assertEquals(frame.messageBody, new TextEncoder().encode("v=0\r\n"));
 * assertEquals(bytesRead, 85);
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

  const headerFields = new Headers();
  for (const line of headerLines) {
    const colon = line.indexOf(":");
    headerFields.append(line.slice(0, colon).trim(), line.slice(colon + 1));
  }

  const bodyStart = headEnd + 2 * CRLF.length;
  const bodyEnd = bodyStart + Number(headerFields.get("Content-Length") ?? 0);
  if (octets.length < bodyEnd) {
    return undefined;
  }

  const messageBody = octets.slice(bodyStart, bodyEnd);
  return [{ startLine, headerFields, messageBody }, bodyEnd];
}

/**
 * Encodes one RTSP message.
 *
 * When `messageBody` is not empty, `Content-Length` is set to its length and
 * any value in `headerFields` is overwritten. The frame's `headerFields` are
 * not changed.
 *
 * Header fields are written in the order `Headers` iterates them: sorted by
 * name, one line per name. `Headers` keeps names in lower case only, so each
 * name is written the way RFC 7826 spells it: a capital letter at the start
 * and after every dash, plus `CSeq`, `MTag`, `RTP-Info` and
 * `WWW-Authenticate`.
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
 *   headerFields: new Headers({
 *     "CSeq": "421",
 *     "Content-Type": "text/parameters",
 *   }),
 *   messageBody: new TextEncoder().encode("barparam: barstuff\r\n"),
 * });
 *
 * assertEquals(
 *   new TextDecoder().decode(octets),
 *   "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0\r\n" +
 *     "Content-Length: 20\r\n" +
 *     "Content-Type: text/parameters\r\n" +
 *     "CSeq: 421\r\n" +
 *     "\r\n" +
 *     "barparam: barstuff\r\n",
 * );
 * ```
 */
export function encodeMessage(frame: MessageFrame): Uint8Array {
  const { startLine, messageBody } = frame;
  const headerFields = new Headers(frame.headerFields);
  if (messageBody.length > 0) {
    headerFields.set("Content-Length", String(messageBody.length));
  }

  const lines = [startLine];
  for (const [name, value] of headerFields) {
    lines.push(`${spellHeaderName(name)}: ${value}`);
  }
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

/** Turns a lower-case header name into the spelling RFC 7826 uses. */
function spellHeaderName(name: string): string {
  return HEADER_NAME_SPELLINGS[name] ??
    name.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-");
}
