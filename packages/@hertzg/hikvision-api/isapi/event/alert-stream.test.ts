import { assertEquals, assertRejects } from "@std/assert";
import { assertSpyCalls, resolvesNext, spy } from "@std/testing/mock";
import { IsapiError } from "../status.ts";
import { openAlertStream } from "./alert-stream.ts";

const OPTIONS = {
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

Deno.test("openAlertStream requests the alert stream path with credentials", async () => {
  const fetch = spy(resolvesNext([new Response("", { headers: MULTIPART })]));

  await Array.fromAsync(await openAlertStream({ ...OPTIONS, fetch }));

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

Deno.test("openAlertStream yields one alert per XML part across chunk boundaries", async () => {
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
    await openAlertStream({ ...OPTIONS, fetch }),
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

Deno.test("openAlertStream stamps each alert with its arrival time", async () => {
  const before = Date.now();
  const fetch = spy(resolvesNext([
    new Response(xmlPart(alertXml("<eventType>VMD</eventType>")), {
      headers: MULTIPART,
    }),
  ]));

  const [alert] = await Array.fromAsync(
    await openAlertStream({ ...OPTIONS, fetch }),
  );

  const at = Date.parse(alert.at);
  assertEquals(at >= before && at <= Date.now(), true);
});

Deno.test("openAlertStream skips parts that are not XML", async () => {
  const picture = "\xff\xd8\xff\xd9";
  const body =
    `--boundary\r\nContent-Type: image/jpeg\r\nContent-Length: ${picture.length}\r\n\r\n` +
    `${picture}\r\n` +
    xmlPart(alertXml("<eventType>linedetection</eventType>"));
  const fetch = spy(resolvesNext([
    new Response(new TextEncoder().encode(body), { headers: MULTIPART }),
  ]));

  const alerts = await Array.fromAsync(
    await openAlertStream({ ...OPTIONS, fetch }),
  );

  assertEquals(alerts.map((alert) => alert.eventType), ["linedetection"]);
});

Deno.test("openAlertStream closes cleanly when the signal aborts", async () => {
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

  const alerts = await openAlertStream({
    ...OPTIONS,
    fetch,
    signal: controller.signal,
  });
  const reading = Array.fromAsync(alerts);
  controller.abort();

  assertEquals(await reading, []);
});

Deno.test("openAlertStream throws IsapiError with the HTTP status on 401", async () => {
  const fetch = spy(resolvesNext([new Response("", { status: 401 })]));

  const error = await assertRejects(
    () => openAlertStream({ ...OPTIONS, fetch }),
    IsapiError,
  );

  assertEquals(error.httpStatus, 401);
});

Deno.test("openAlertStream throws IsapiError when the device answers a ResponseStatus", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>4</statusCode><subStatusCode>notSupport</subStatusCode></ResponseStatus>",
      { headers: { "content-type": "application/xml" } },
    ),
  ]));

  await assertRejects(
    () => openAlertStream({ ...OPTIONS, fetch }),
    IsapiError,
    "notSupport",
  );
});

Deno.test("openAlertStream throws when the reply is neither multipart nor a ResponseStatus", async () => {
  const fetch = spy(resolvesNext([
    new Response("<html></html>", { headers: { "content-type": "text/html" } }),
  ]));

  await assertRejects(
    () => openAlertStream({ ...OPTIONS, fetch }),
    Error,
    "not multipart",
  );
});

Deno.test("openAlertStream ends on abort even when fetch ignores the signal, and cancels the body", async () => {
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

  const alerts = await openAlertStream({
    ...OPTIONS,
    fetch,
    signal: controller.signal,
  });
  const reading = Array.fromAsync(alerts);
  controller.abort();

  assertEquals(await reading, []);
  // Cancelling propagates back through the pipes over a few ticks.
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertSpyCalls(cancelled, 1);
});
