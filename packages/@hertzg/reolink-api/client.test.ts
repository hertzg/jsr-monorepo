import { assertEquals, assertRejects } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { createClient } from "./client.ts";
import { aesCfbEncrypt, xorCipher } from "./encoding/cipher.ts";
import { loginCredentials, loginXml } from "./protocol/login.ts";
import { createBaichuanDecodeStream } from "./streams/decode.ts";
import { createBaichuanEncodeStream } from "./streams/encode.ts";

/** Wires a client to an in-memory camera speaking real Baichuan bytes. */
function cameraLink() {
  const toCamera = new TransformStream<Uint8Array, Uint8Array>();
  const toClient = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = createBaichuanEncodeStream();
  encoder.readable.pipeTo(toClient.writable).catch(() => {});
  return {
    connection: { readable: toClient.readable, writable: toCamera.writable },
    requests: toCamera.readable
      .pipeThrough(createBaichuanDecodeStream())
      .getReader(),
    camera: encoder.writable.getWriter(),
  };
}

Deno.test("login sends the nonce request, then the XOR-encrypted login", async () => {
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const login = client.login({ username: "admin", password: "hunter2" });

  const { value: nonceRequest } = await requests.read();
  assertEquals(nonceRequest?.header, {
    cmdId: 1,
    bodyLength: 0,
    channelId: 250,
    messageId: 1,
    code: 0xdc12,
    messageClass: 0x1465,
  });
  const nonceBody = xorCipher(
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
        "<body><Encryption><nonce>NONCE-0123</nonce></Encryption></body>",
    ),
    250,
  );
  await camera.write({
    header: {
      cmdId: 1,
      bodyLength: nonceBody.length,
      channelId: 250,
      messageId: 1,
      code: 0xdd01,
      messageClass: 0x1466,
    },
    body: nonceBody,
    payload: new Uint8Array(0),
  });

  const { value: loginRequest } = await requests.read();
  assertEquals(
    new TextDecoder().decode(xorCipher(loginRequest!.body, 250)),
    loginXml(
      loginCredentials({
        username: "admin",
        password: "hunter2",
        nonce: "NONCE-0123",
      }),
    ),
  );
  await camera.write({
    header: {
      cmdId: 1,
      bodyLength: 0,
      channelId: 250,
      messageId: 2,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });

  await login;
  await client.close();
});

Deno.test("login rejects when the camera answers 401", async () => {
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const login = client.login({ username: "admin", password: "wrong" });

  await requests.read();
  const nonceBody = xorCipher(
    new TextEncoder().encode(
      '<?xml version="1.0" ?><body><nonce>NONCE-0123</nonce></body>',
    ),
    250,
  );
  await camera.write({
    header: {
      cmdId: 1,
      bodyLength: nonceBody.length,
      channelId: 250,
      messageId: 1,
      code: 0xdd01,
      messageClass: 0x1466,
    },
    body: nonceBody,
    payload: new Uint8Array(0),
  });
  await requests.read();
  await camera.write({
    header: {
      cmdId: 1,
      bodyLength: 0,
      channelId: 250,
      messageId: 2,
      code: 401,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });

  await assertRejects(() => login, Error, "status 401");
  await client.close();
});

Deno.test("subscribe streams AES-encrypted alarm pushes after login", async () => {
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const login = client.login({ username: "admin", password: "hunter2" });
  await requests.read();
  const nonceBody = xorCipher(
    new TextEncoder().encode(
      '<?xml version="1.0" ?><body><nonce>NONCE-0123</nonce></body>',
    ),
    250,
  );
  await camera.write({
    header: {
      cmdId: 1,
      bodyLength: nonceBody.length,
      channelId: 250,
      messageId: 1,
      code: 0xdd01,
      messageClass: 0x1466,
    },
    body: nonceBody,
    payload: new Uint8Array(0),
  });
  await requests.read();
  await camera.write({
    header: {
      cmdId: 1,
      bodyLength: 0,
      channelId: 250,
      messageId: 2,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await login;

  const subscription = client.subscribe();
  const { value: subscribeRequest } = await requests.read();
  assertEquals(subscribeRequest?.header.cmdId, 31);
  assertEquals(subscribeRequest?.header.channelId, 251);
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 3,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();

  const pushBody = aesCfbEncrypt(
    new TextEncoder().encode("08822D7143979103"),
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
        "<body><AlarmEventList><AlarmEvent>" +
        "<channelId>0</channelId><status>MD,visitor</status>" +
        "<AItype>people</AItype>" +
        "</AlarmEvent></AlarmEventList></body>",
    ),
  );
  await camera.write({
    header: {
      cmdId: 33,
      bodyLength: pushBody.length,
      channelId: 251,
      messageId: 0,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: pushBody,
    payload: new Uint8Array(0),
  });

  assertEquals((await events.read()).value, {
    channel: 0,
    motion: true,
    visitor: true,
    tamper: false,
    ai: ["people"],
  });
  await client.close();
});

Deno.test("subscribe repeats cmd 31 after a silent interval with no event yet", async () => {
  using time = new FakeTime();
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe({ keepAliveMs: 10_000 });
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await subscription;

  await time.tickAsync(10_000);

  const { value: keepAlive } = await requests.read();
  assertEquals(keepAlive?.header.cmdId, 31);
  assertEquals(keepAlive?.header.channelId, 251);
  await client.close();
});

Deno.test("subscribe pings with cmd 93 after a silent interval once events flow", async () => {
  using time = new FakeTime();
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe({ keepAliveMs: 10_000 });
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();
  const pushBody = new TextEncoder().encode(
    '<?xml version="1.0" ?><body><AlarmEventList><AlarmEvent>' +
      "<channelId>0</channelId><status>none</status>" +
      "</AlarmEvent></AlarmEventList></body>",
  );
  await camera.write({
    header: {
      cmdId: 33,
      bodyLength: pushBody.length,
      channelId: 251,
      messageId: 0,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: pushBody,
    payload: new Uint8Array(0),
  });
  await events.read();

  await time.tickAsync(10_000);

  const { value: keepAlive } = await requests.read();
  assertEquals(keepAlive?.header.cmdId, 93);
  assertEquals(keepAlive?.header.channelId, 250);
  await client.close();
});

Deno.test("subscribe does not ping while the camera keeps talking", async () => {
  using time = new FakeTime();
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe({ keepAliveMs: 10_000 });
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();
  const pushBody = new TextEncoder().encode(
    '<?xml version="1.0" ?><body><AlarmEventList><AlarmEvent>' +
      "<channelId>0</channelId><status>MD</status>" +
      "</AlarmEvent></AlarmEventList></body>",
  );

  await time.tickAsync(6_000);
  await camera.write({
    header: {
      cmdId: 33,
      bodyLength: pushBody.length,
      channelId: 251,
      messageId: 0,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: pushBody,
    payload: new Uint8Array(0),
  });
  await events.read();
  await time.tickAsync(6_000);

  await client.close();
  assertEquals((await requests.read()).done, true);
});

Deno.test("subscribe errors the event stream when the keepalive gets no answer", async () => {
  using time = new FakeTime();
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe({ keepAliveMs: 10_000 });
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();

  await time.tickAsync(10_000);
  await requests.read();
  await time.tickAsync(10_000);

  await assertRejects(() => events.read(), Error, "despite keepalive");
  await client.close();
});

Deno.test("the event stream ends when the camera closes the connection", async () => {
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe();
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();

  await camera.close();

  assertEquals((await events.read()).done, true);
  await client.close();
});

Deno.test("subscribe rejects a second subscription", async () => {
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe();
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await subscription;

  await assertRejects(() => client.subscribe(), Error, "already subscribed");
  await client.close();
});

Deno.test("subscribe rejects a second subscription made in the same tick", async () => {
  const { connection } = cameraLink();
  const client = createClient(connection);

  const first = client.subscribe();

  await assertRejects(() => client.subscribe(), Error, "already subscribed");
  await client.close();
  await assertRejects(() => first, Error, "closed");
});

Deno.test("close rejects requests still queued behind a slow write", async () => {
  const write = Promise.withResolvers<void>();
  const client = createClient({
    readable: new ReadableStream(),
    writable: new WritableStream({ write: () => write.promise }),
  });

  const logins = [1, 2, 3, 4].map(() =>
    assertRejects(
      () => client.login({ username: "admin", password: "hunter2" }),
      Error,
      "closed",
    )
  );
  const closing = client.close();
  await new Promise((resolve) => setTimeout(resolve, 0));
  write.resolve();

  await Promise.all(logins);
  await closing;
});

Deno.test("close ends the event stream and the connection's writable", async () => {
  const { connection, requests, camera } = cameraLink();
  const client = createClient(connection);

  const subscription = client.subscribe();
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      code: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();

  await client.close();

  assertEquals((await events.read()).done, true);
  assertEquals((await requests.read()).done, true);
});
