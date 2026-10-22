/**
 * Splitting a `multipart/mixed` body into parts.
 *
 * The alert stream is one HTTP response that never ends. Its body is a
 * sequence of parts, each a block of headers and a body:
 *
 * ```
 * --boundary\r\n
 * Content-Type: application/xml; charset="UTF-8"\r\n
 * Content-Length: 464\r\n
 * \r\n
 * <EventNotificationAlert>…</EventNotificationAlert>\r\n
 * --boundary\r\n
 * …
 * ```
 *
 * {@link createPartsStream} turns the bytes into {@link Part}s, one per
 * block, with the body as bytes. A part's body is taken from its
 * `Content-Length` when there is one, so a JPEG part that happens to contain
 * the boundary text is read whole; without one the body runs to the next
 * boundary line. Devices declare a length that covers the XML plus one
 * trailing line ending (LF on an NVR, CRLF on a camera), never the XML
 * alone, so the body carries that line ending too; the next part is found
 * by searching for `--boundary` after the declared length, so the over-count
 * changes nothing. Whatever the part is, it comes out as bytes; deciding
 * what it means is the consumer's job.
 *
 * @example Split a two-part body
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createPartsStream } from "./parts.ts";
 *
 * const body = "--boundary\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\n" +
 *   "hello\r\n" +
 *   "--boundary\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\n" +
 *   "world\r\n--boundary--\r\n";
 * const parts = ReadableStream.from([new TextEncoder().encode(body)])
 *   .pipeThrough(createPartsStream("boundary"));
 *
 * const bodies = await Array.fromAsync(parts, (part) => new TextDecoder().decode(part.body));
 * assertEquals(bodies, ["hello", "world"]);
 * ```
 *
 * @module
 */

import { concat, indexOfNeedle } from "@std/bytes";

/** One part of a multipart body. */
export type Part = {
  /** The part's headers, such as `content-type` and `content-length`. */
  headers: Headers;
  /** The part's body, exactly as sent. */
  body: Uint8Array;
};

/**
 * The boundary named by a `multipart/*` content type.
 *
 * Hikvision devices write `boundary=boundary`. Leading dashes in the value
 * are dropped, since the delimiter on the wire is `--` plus the boundary.
 * Older NVRs are known to name one boundary here and write the literal
 * `--boundary` on the wire; this reads the header as sent and does not
 * paper over that.
 *
 * @param contentType The response's `Content-Type` header value.
 * @returns The boundary, or `undefined` when the header names none.
 *
 * @example Read the boundary from a content type
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseBoundary } from "./parts.ts";
 *
 * assertEquals(parseBoundary("multipart/mixed;boundary=boundary"), "boundary");
 * assertEquals(parseBoundary('multipart/mixed; boundary="--boundary"'), "boundary");
 * assertEquals(parseBoundary("application/xml"), undefined);
 * ```
 */
export function parseBoundary(contentType: string | null): string | undefined {
  const match = contentType?.match(/boundary="?([^";]+)"?/i);
  return match?.[1].replace(/^-+/, "");
}

/**
 * A stream that splits multipart bytes into {@link Part}s.
 *
 * Bytes before the first boundary are dropped. A part cut off by the end of
 * the input is dropped too. A close delimiter (`--boundary--`) is skipped
 * rather than taken as the end: cameras write one after each event part
 * and keep posting; an NVR never writes one.
 *
 * @param boundary The boundary without its leading dashes, as
 *   {@link parseBoundary} returns it.
 * @returns A transform from body bytes to parts.
 *
 * @example Parts arrive whole however the bytes are chunked
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createPartsStream } from "./parts.ts";
 *
 * const body = "--boundary\r\nContent-Type: application/xml\r\nContent-Length: 12\r\n\r\n" +
 *   "<a>hello</a>\r\n--boundary\r\n";
 * const bytes = new TextEncoder().encode(body);
 * const chunks = [bytes.subarray(0, 20), bytes.subarray(20, 70), bytes.subarray(70)];
 *
 * const [part] = await Array.fromAsync(
 *   ReadableStream.from(chunks).pipeThrough(createPartsStream("boundary")),
 * );
 *
 * assertEquals(part.headers.get("content-type"), "application/xml");
 * assertEquals(new TextDecoder().decode(part.body), "<a>hello</a>");
 * ```
 */
export function createPartsStream(
  boundary: string,
): TransformStream<Uint8Array, Part> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("latin1");
  const delimiter = encoder.encode(`--${boundary}`);
  const lineDelimiter = encoder.encode(`\r\n--${boundary}`);
  const headersEnd = encoder.encode("\r\n\r\n");
  let buffer = new Uint8Array(0);

  function next(): Part | undefined {
    let start = indexOfNeedle(buffer, delimiter);
    if (start === -1) {
      return undefined;
    }
    // A close delimiter (`--boundary--`) is skipped, not treated as the end:
    // cameras write one after each event part and keep the stream open.
    while (isCloseDelimiter(buffer, start + delimiter.length)) {
      buffer = buffer.subarray(start + delimiter.length + 2);
      start = indexOfNeedle(buffer, delimiter);
      if (start === -1) {
        return undefined;
      }
    }
    const end = indexOfNeedle(buffer, headersEnd, start + delimiter.length);
    if (end === -1) {
      return undefined;
    }
    const headers = parseHeaders(
      decoder.decode(buffer.subarray(start + delimiter.length, end)),
    );
    const bodyStart = end + headersEnd.length;
    const length = headers.get("content-length");
    let bodyEnd: number;
    if (length !== null) {
      bodyEnd = bodyStart + Number(length);
      if (bodyEnd > buffer.length) {
        return undefined;
      }
    } else {
      bodyEnd = indexOfNeedle(buffer, lineDelimiter, bodyStart);
      if (bodyEnd === -1) {
        return undefined;
      }
    }
    const body = buffer.slice(bodyStart, bodyEnd);
    buffer = buffer.subarray(bodyEnd);
    return { headers, body };
  }

  return new TransformStream({
    transform(chunk, controller) {
      buffer = concat([buffer, chunk]);
      for (let part = next(); part !== undefined; part = next()) {
        controller.enqueue(part);
      }
    },
  });
}

function isCloseDelimiter(buffer: Uint8Array, at: number): boolean {
  return buffer[at] === 0x2d && buffer[at + 1] === 0x2d;
}

function parseHeaders(block: string): Headers {
  const headers = new Headers();
  for (const line of block.split("\r\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    headers.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  return headers;
}
