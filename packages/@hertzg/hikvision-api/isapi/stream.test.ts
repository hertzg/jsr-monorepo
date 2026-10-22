import { assertEquals, assertRejects } from "@std/assert";
import { assertSpyCalls, resolvesNext, spy } from "@std/testing/mock";
import { alertStream } from "./event/alert.ts";
import { IsapiError } from "./status.ts";
import { stream } from "./stream.ts";

const DEVICE = {
  baseUrl: "http://192.0.2.10",
  username: "admin",
  password: "hunter2",
};
const MULTIPART = { "content-type": "multipart/mixed;boundary=boundary" };

function xmlPart(xml: string): string {
  return `--boundary\r\nContent-Type: application/xml; charset="UTF-8"\r\n` +
    `Content-Length: ${new TextEncoder().encode(xml).length}\r\n\r\n${xml}\r\n`;
}

function alertXml(fields: string): string {
  return "<EventNotificationAlert>" + fields + "</EventNotificationAlert>";
}

Deno.test("stream requests the resource's path with credentials", async () => {
  const fetch = spy(resolvesNext([new Response("", { headers: MULTIPART })]));

  await Array.fromAsync(await stream({ ...DEVICE, fetch }, alertStream));

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/Event/notification/alertStream",
  );
  const init = fetch.calls[0].args[1] as RequestInit;
  assertEquals(
    new Headers(init.headers).get("authorization"),
    "Basic YWRtaW46aHVudGVyMg==",
  );
});

Deno.test("stream yields one value per XML part across chunk boundaries", async () => {
  const body = xmlPart(alertXml(
    "<channelID>0</channelID><dateTime>2026-10-21T20:44:28</dateTime>" +
      "<eventType>videoloss</eventType><eventState>inactive</eventState>",
  )) + xmlPart(alertXml(
    "<dynChannelID>7</dynChannelID><dateTime>2026-10-21T20:44:39</dateTime>" +
      "<eventType>VMD</eventType><eventState>active</eventState>",
  ));
  const bytes = new TextEncoder().encode(body);
  const chunks = [
    bytes.subarray(0, 100),
    bytes.subarray(100, 300),
    bytes.subarray(300),
  ];
  const fetch = spy(resolvesNext([
    new Response(ReadableStream.from(chunks), { headers: MULTIPART }),
  ]));

  const alerts = await Array.fromAsync(
    await stream({ ...DEVICE, fetch }, alertStream),
  );

  assertEquals(
    alerts.map(({ channel, eventType, eventState }) => ({
      channel,
      eventType,
      eventState,
    })),
    [
      { channel: 0, eventType: "videoloss", eventState: "inactive" },
      { channel: 7, eventType: "VMD", eventState: "active" },
    ],
  );
});

Deno.test("stream skips parts that are not XML", async () => {
  const picture = "\xff\xd8\xff\xd9";
  const body =
    `--boundary\r\nContent-Type: image/jpeg\r\nContent-Length: ${picture.length}\r\n\r\n` +
    `${picture}\r\n` +
    xmlPart(alertXml("<eventType>linedetection</eventType>"));
  const fetch = spy(resolvesNext([
    new Response(new TextEncoder().encode(body), { headers: MULTIPART }),
  ]));

  const alerts = await Array.fromAsync(
    await stream({ ...DEVICE, fetch }, alertStream),
  );

  assertEquals(alerts.map((alert) => alert.eventType), ["linedetection"]);
});

Deno.test("stream passes the signal to fetch", async () => {
  const controller = new AbortController();
  const fetch = spy(resolvesNext([new Response("", { headers: MULTIPART })]));

  await Array.fromAsync(
    await stream({ ...DEVICE, fetch }, alertStream, {
      signal: controller.signal,
    }),
  );

  assertEquals(
    (fetch.calls[0].args[1] as RequestInit).signal,
    controller.signal,
  );
});

Deno.test("stream closes cleanly when the signal aborts", async () => {
  const controller = new AbortController();
  const fetch = spy((_url: string | URL | Request, init?: RequestInit) => {
    const signal = init!.signal!;
    const body = new ReadableStream<Uint8Array>({
      pull() {
        return new Promise<void>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        });
      },
    });
    return Promise.resolve(new Response(body, { headers: MULTIPART }));
  });

  const alerts = await stream({ ...DEVICE, fetch }, alertStream, {
    signal: controller.signal,
  });
  const reading = Array.fromAsync(alerts);
  controller.abort();

  assertEquals(await reading, []);
});

Deno.test("stream throws IsapiError with the HTTP status on 401", async () => {
  const fetch = spy(resolvesNext([new Response("", { status: 401 })]));

  const error = await assertRejects(
    () => stream({ ...DEVICE, fetch }, alertStream),
    IsapiError,
  );

  assertEquals(error.httpStatus, 401);
});

Deno.test("stream throws IsapiError when the device answers a ResponseStatus", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>4</statusCode><subStatusCode>notSupport</subStatusCode></ResponseStatus>",
      { headers: { "content-type": "application/xml" } },
    ),
  ]));

  await assertRejects(
    () => stream({ ...DEVICE, fetch }, alertStream),
    IsapiError,
    "notSupport",
  );
});

Deno.test("stream throws when the reply is neither multipart nor a ResponseStatus", async () => {
  const fetch = spy(resolvesNext([
    new Response("<html></html>", { headers: { "content-type": "text/html" } }),
  ]));

  await assertRejects(
    () => stream({ ...DEVICE, fetch }, alertStream),
    Error,
    "not multipart",
  );
});

Deno.test("stream ends on abort even when fetch ignores the signal, and cancels the body", async () => {
  const controller = new AbortController();
  const cancelled = spy(() => {});
  const fetch = spy((_url: string | URL | Request, _init?: RequestInit) => {
    const body = new ReadableStream<Uint8Array>({
      pull() {
        return new Promise<void>(() => {});
      },
      cancel: cancelled,
    });
    return Promise.resolve(new Response(body, { headers: MULTIPART }));
  });

  const alerts = await stream({ ...DEVICE, fetch }, alertStream, {
    signal: controller.signal,
  });
  const reading = Array.fromAsync(alerts);
  controller.abort();

  assertEquals(await reading, []);
  // Cancelling propagates back through the pipes over a few ticks.
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertSpyCalls(cancelled, 1);
});
