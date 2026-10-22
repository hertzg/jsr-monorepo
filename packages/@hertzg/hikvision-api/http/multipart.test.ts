import { assertEquals } from "@std/assert";
import { createPartsStream, parseBoundary, type Part } from "./multipart.ts";

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function utf8(body: Uint8Array): string {
  return new TextDecoder().decode(body);
}

function split(chunks: Uint8Array[], boundary = "boundary"): Promise<Part[]> {
  return Array.fromAsync(
    ReadableStream.from(chunks).pipeThrough(createPartsStream(boundary)),
  );
}

Deno.test("parseBoundary reads a bare, quoted, or dash-prefixed boundary", () => {
  assertEquals(parseBoundary("multipart/mixed;boundary=boundary"), "boundary");
  assertEquals(
    parseBoundary('multipart/mixed; boundary="frontier"'),
    "frontier",
  );
  assertEquals(
    parseBoundary("multipart/mixed; boundary=--boundary"),
    "boundary",
  );
  assertEquals(parseBoundary("application/xml; charset=UTF-8"), undefined);
  assertEquals(parseBoundary(null), undefined);
});

Deno.test("createPartsStream splits parts and parses their headers", async () => {
  const body = "--boundary\r\n" +
    'Content-Type: application/xml; charset="UTF-8"\r\n' +
    "Content-Length: 12\r\n" +
    "\r\n" +
    "<a>first</a>\r\n" +
    "--boundary\r\n" +
    'Content-Type: application/xml; charset="UTF-8"\r\n' +
    "Content-Length: 13\r\n" +
    "\r\n" +
    "<a>second</a>\r\n";

  const parts = await split([bytes(body)]);

  assertEquals(parts.map((part) => utf8(part.body)), [
    "<a>first</a>",
    "<a>second</a>",
  ]);
  assertEquals(
    parts[0].headers.get("content-type"),
    'application/xml; charset="UTF-8"',
  );
  assertEquals(parts[1].headers.get("content-length"), "13");
});

Deno.test("createPartsStream reassembles a part delivered one byte at a time", async () => {
  const body =
    "--boundary\r\nContent-Type: application/xml\r\nContent-Length: 12\r\n\r\n" +
    "<a>first</a>\r\n--boundary\r\n";
  const chunks = Array.from(bytes(body), (byte) => Uint8Array.of(byte));

  const parts = await split(chunks);

  assertEquals(parts.map((part) => utf8(part.body)), ["<a>first</a>"]);
});

Deno.test("createPartsStream trusts Content-Length over boundary text inside a binary body", async () => {
  const picture = bytes("\xff\xd8--boundary\r\n\xff\xd9");
  const head = bytes(
    `--boundary\r\nContent-Type: image/jpeg\r\nContent-Length: ${picture.length}\r\n\r\n`,
  );
  const tail = bytes(
    "\r\n--boundary\r\nContent-Type: text/plain\r\nContent-Length: 4\r\n\r\nnext\r\n",
  );

  const parts = await split([head, picture, tail]);

  assertEquals(parts.length, 2);
  assertEquals(parts[0].headers.get("content-type"), "image/jpeg");
  assertEquals(parts[0].body, picture);
  assertEquals(utf8(parts[1].body), "next");
});

Deno.test("createPartsStream reads to the next boundary line when there is no Content-Length", async () => {
  const body = "--boundary\r\nContent-Type: text/plain\r\n\r\nno length\r\n" +
    "--boundary\r\nContent-Type: text/plain\r\n\r\nstill none\r\n--boundary--\r\n";

  const parts = await split([bytes(body)]);

  assertEquals(parts.map((part) => utf8(part.body)), [
    "no length",
    "still none",
  ]);
});

Deno.test("createPartsStream drops bytes before the first boundary and a truncated last part", async () => {
  const body = "preamble\r\n--boundary\r\nContent-Length: 5\r\n\r\nwhole\r\n" +
    "--boundary\r\nContent-Length: 100\r\n\r\ncut off";

  const parts = await split([bytes(body)]);

  assertEquals(parts.map((part) => utf8(part.body)), ["whole"]);
});

Deno.test("createPartsStream uses the boundary it was given", async () => {
  const body = "--frontier\r\nContent-Length: 2\r\n\r\nok\r\n--frontier--\r\n";

  const parts = await split([bytes(body)], "frontier");

  assertEquals(parts.map((part) => utf8(part.body)), ["ok"]);
});

Deno.test("createPartsStream skips a close delimiter and keeps reading, as cameras need", async () => {
  const body =
    "--boundary\r\nContent-Type: application/xml\r\nContent-Length: 11\r\n\r\n" +
    "<a>first</a\r\n" +
    "--boundary--\r\n" +
    "--boundary\r\nContent-Type: application/xml\r\nContent-Length: 12\r\n\r\n" +
    "<a>second</a\r\n" +
    "--boundary--\r\n";

  const parts = await split([bytes(body)]);

  assertEquals(parts.map((part) => utf8(part.body)), [
    "<a>first</a",
    "<a>second</a",
  ]);
  assertEquals(parts[1].headers.get("content-length"), "12");
  assertEquals(parts[1].headers.has("--boundary"), false);
});
