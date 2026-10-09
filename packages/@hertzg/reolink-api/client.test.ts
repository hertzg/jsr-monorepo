import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";
import { createClient } from "./client.ts";
import { aesCfbDecrypt, aesCfbEncrypt, xorCipher } from "./encoding/cipher.ts";
import { command } from "./protocol/command.ts";
import { loginCredentials, loginXml } from "./protocol/login.ts";
import { extensionXml } from "./protocol/message.ts";
import { privacyModeXml } from "./protocol/privacy.ts";
import { PTZ_COMMAND, ptzControlXml, ptzPresetXml } from "./protocol/ptz.ts";
import { sirenXml } from "./protocol/siren.ts";
import { snapshotXml } from "./protocol/snapshot.ts";
import { createBaichuanDecodeStream } from "./streams/decode.ts";
import { createBaichuanEncodeStream } from "./streams/encode.ts";
import { int, xmlParam } from "./protocol/xml.ts";

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

/**
 * A cameraLink whose client has logged in as admin/hunter2 with nonce
 * NONCE-0123, which makes the session key "08822D7143979103". The next
 * request gets message id 3.
 */
async function loggedIn() {
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
      encryption: 0xdd01,
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
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await login;
  return { client, requests, camera };
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
    encryption: 0xdc12,
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
      encryption: 0xdd01,
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
      status: 200,
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
      encryption: 0xdd01,
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
      status: 401,
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
      encryption: 0xdd01,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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

Deno.test("a push that fails to decrypt leaves the connection's readable alone", async () => {
  const { connection, requests, camera } = cameraLink();
  const cancel = spy();
  const source = connection.readable.getReader();
  const client = createClient({
    readable: new ReadableStream({
      pull: async (controller) => {
        const { value, done } = await source.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      },
      cancel,
    }),
    writable: connection.writable,
  });

  const subscription = client.subscribe();
  await requests.read();
  await camera.write({
    header: {
      cmdId: 31,
      bodyLength: 0,
      channelId: 251,
      messageId: 1,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  const events = (await subscription).getReader();
  await camera.write({
    header: {
      cmdId: 33,
      bodyLength: 3,
      channelId: 251,
      messageId: 0,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: Uint8Array.of(1, 2, 3),
    payload: new Uint8Array(0),
  });

  await assertRejects(() => events.read(), Error, "did not decrypt to XML");
  assertSpyCalls(cancel, 0);
  await client.close();
  await camera.close();
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
      status: 200,
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

Deno.test("channel requests reject before login", async () => {
  const { connection } = cameraLink();
  const client = createClient(connection);

  await assertRejects(() => client.snapshot(), Error, "not logged in");
  await client.close();
});

Deno.test("playSiren sends cmd 263 with the channel extension and the siren body, both AES-encrypted", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const play = client.playSiren({ channel: 0, times: 2 });
  const { value: request } = await requests.read();
  await camera.write({
    header: {
      cmdId: 263,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await play;

  assertEquals(request?.header.cmdId, 263);
  assertEquals(request?.header.channelId, 1);
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.body)),
    extensionXml(0),
  );
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    sirenXml({ channel: 0, times: 2 }),
  );
  await client.close();
});

Deno.test("stopSiren during a timed play starts manual play before stopping", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const ack = (messageId: number) =>
    camera.write({
      header: {
        cmdId: 263,
        bodyLength: 0,
        channelId: 1,
        messageId,
        status: 200,
        messageClass: 0x1464,
        payloadOffset: 0,
      },
      body: new Uint8Array(0),
      payload: new Uint8Array(0),
    });

  const play = client.playSiren({ times: 3 });
  await requests.read();
  await ack(3);
  await play;
  const stop = client.stopSiren();
  const { value: first } = await requests.read();
  await ack(4);
  const { value: second } = await requests.read();
  await ack(5);
  await stop;

  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, first!.payload)),
    sirenXml({ channel: 0, on: true }),
  );
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, second!.payload)),
    sirenXml({ channel: 0, on: false }),
  );
  await client.close();
});

Deno.test("stopSiren with nothing playing only sends the stop", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const stop = client.stopSiren();
  const { value: request } = await requests.read();
  await camera.write({
    header: {
      cmdId: 263,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await stop;

  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    sirenXml({ channel: 0, on: false }),
  );
  await client.close();
});

Deno.test("setPrivacyMode sends cmd 575 with the sleep body", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const set = client.setPrivacyMode({ enabled: true });
  const { value: request } = await requests.read();
  await camera.write({
    header: {
      cmdId: 575,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await set;

  assertEquals(request?.header.cmdId, 575);
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    privacyModeXml(true),
  );
  await client.close();
});

Deno.test("privacyMode sends cmd 574 without a body and reads sleep from the reply", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const state = client.privacyMode({ channel: 2 });
  const { value: request } = await requests.read();
  const body = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
        '<body><sleepState version="1.1"><sleep>1</sleep></sleepState></body>',
    ),
  );
  await camera.write({
    header: {
      cmdId: 574,
      bodyLength: body.length,
      channelId: 3,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body,
    payload: new Uint8Array(0),
  });

  assertEquals(await state, true);
  assertEquals(request?.header.channelId, 3);
  assertEquals(request?.payload, new Uint8Array(0));
  await client.close();
});

Deno.test("snapshot collects the payload chunks that follow the reply", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const xml = (text: string) =>
    aesCfbEncrypt(
      aesKey,
      new TextEncoder().encode('<?xml version="1.0" ?>' + text),
    );

  const snapshot = client.snapshot();
  const { value: request } = await requests.read();
  const reply = xml("<body><Snap><pictureSize>6</pictureSize></Snap></body>");
  await camera.write({
    header: {
      cmdId: 109,
      bodyLength: reply.length,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: reply,
    payload: new Uint8Array(0),
  });
  const firstBody = xml(
    "<body><binaryData><encryptLen>4</encryptLen></binaryData></body>",
  );
  const firstPayload = aesCfbEncrypt(
    aesKey,
    Uint8Array.of(0xff, 0xd8, 0xff, 0xe0),
  );
  await camera.write({
    header: {
      cmdId: 109,
      bodyLength: firstBody.length + firstPayload.length,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: firstBody.length,
    },
    body: firstBody,
    payload: firstPayload,
  });
  const secondBody = xml("<body><binaryData /></body>");
  await camera.write({
    header: {
      cmdId: 109,
      bodyLength: secondBody.length + 2,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: secondBody.length,
    },
    body: secondBody,
    payload: Uint8Array.of(0xff, 0xd9),
  });
  await camera.write({
    header: {
      cmdId: 109,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });

  assertEquals(
    await snapshot,
    Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9),
  );
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    snapshotXml({ channel: 0, stream: "main" }),
  );
  await client.close();
});

Deno.test("snapshot rejects an image of a different size than announced", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const snapshot = client.snapshot({ stream: "sub" });
  await requests.read();
  const reply = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" ?><body><Snap><pictureSize>10</pictureSize></Snap></body>',
    ),
  );
  await camera.write({
    header: {
      cmdId: 109,
      bodyLength: reply.length,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: reply,
    payload: new Uint8Array(0),
  });
  await camera.write({
    header: {
      cmdId: 109,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });

  await assertRejects(() => snapshot, Error, "announced 10 bytes but sent 0");
  await client.close();
});

Deno.test("ptz sends cmd 18 with the command and speed", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const move = client.ptz({ command: PTZ_COMMAND.LEFT, speed: 32 });
  const { value: request } = await requests.read();
  await camera.write({
    header: {
      cmdId: 18,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await move;

  assertEquals(request?.header.cmdId, 18);
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    ptzControlXml({ channel: 0, command: "Left", speed: 32 }),
  );
  await client.close();
});

Deno.test("ptzPresets sends cmd 190 and lists the named presets", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const presets = client.ptzPresets();
  const { value: request } = await requests.read();
  const body = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" ?><body><PtzPreset><presetList>' +
        "<preset><id>1</id><name>gate</name></preset>" +
        "</presetList></PtzPreset></body>",
    ),
  );
  await camera.write({
    header: {
      cmdId: 190,
      bodyLength: body.length,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body,
    payload: new Uint8Array(0),
  });

  assertEquals(await presets, [{ id: 1, name: "gate" }]);
  assertEquals(request?.header.cmdId, 190);
  await client.close();
});

Deno.test("ptzGoToPreset sends cmd 19 with the preset id", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const go = client.ptzGoToPreset({ id: 1 });
  const { value: request } = await requests.read();
  await camera.write({
    header: {
      cmdId: 19,
      bodyLength: 0,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await go;

  assertEquals(request?.header.cmdId, 19);
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    ptzPresetXml({ channel: 0, id: 1 }),
  );
  await client.close();
});

Deno.test("ptzPosition sends cmd 433 without a body and reads pan and tilt", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");

  const position = client.ptzPosition();
  const { value: request } = await requests.read();
  const body = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
        '<body><ptzCurPos version="1.1"><pPos>510</pPos><tPos>130</tPos>' +
        "</ptzCurPos></body>",
    ),
  );
  await camera.write({
    header: {
      cmdId: 433,
      bodyLength: body.length,
      channelId: 1,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body,
    payload: new Uint8Array(0),
  });

  assertEquals(await position, { pan: 510, tilt: 130 });
  assertEquals(request?.header.cmdId, 433);
  assertEquals(request?.payload, new Uint8Array(0));
  await client.close();
});

Deno.test("call without a channel addresses the host with an empty body and reads the reply", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const getPorts = command(37, "GET_NETPORT_CFG_V20", [
    xmlParam("RtspPort", { rtspPort: int(), enable: int() }),
  ]);

  const reply = client.call(getPorts);
  const { value: request } = await requests.read();
  const body = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n<body>' +
        '<RtspPort version="1.1"><rtspPort>554</rtspPort><enable>1</enable></RtspPort>' +
        "</body>\n",
    ),
  );
  await camera.write({
    header: {
      cmdId: 37,
      bodyLength: body.length,
      channelId: 250,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body,
    payload: new Uint8Array(0),
  });

  assertEquals(await reply, {
    body: { RtspPort: { rtspPort: 554, enable: 1 } },
    payload: new Uint8Array(0),
  });
  assertEquals(request?.header.channelId, 250);
  assertEquals(request?.body, new Uint8Array(0));
  await client.close();
});

Deno.test("call with a channel sends the extension and the encoded body", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const setPorts = command(36, "SET_NETPORT_CFG_V20", [
    xmlParam("RtspPort", { rtspPort: int(), enable: int() }),
  ]);

  const reply = client.call(setPorts, {
    channel: 1,
    body: { RtspPort: { rtspPort: 8554, enable: 0 } },
  });
  const { value: request } = await requests.read();
  await camera.write({
    header: {
      cmdId: 36,
      bodyLength: 0,
      channelId: 2,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  await reply;

  assertEquals(request?.header.channelId, 2);
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.body)),
    extensionXml(1),
  );
  assertEquals(
    new TextDecoder().decode(aesCfbDecrypt(aesKey, request!.payload)),
    '<?xml version="1.0" encoding="UTF-8" ?>\n<body>' +
      '<RtspPort version="1.1"><rtspPort>8554</rtspPort><enable>0</enable></RtspPort>' +
      "</body>\n",
  );
  await client.close();
});

Deno.test("call rejects when the camera answers with an error status", async () => {
  const { client, requests, camera } = await loggedIn();
  const reboot = command(23, "REBOOT_V20", []);

  const reply = client.call(reboot);
  await requests.read();
  await camera.write({
    header: {
      cmdId: 23,
      bodyLength: 0,
      channelId: 250,
      messageId: 3,
      status: 400,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });

  await assertRejects(() => reply, Error, "status 400");
  await client.close();
});

Deno.test("pushes decodes a known push by the PUSHES table", async () => {
  const { client, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const pushes = client.pushes().getReader();

  const body = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n<body>\n' +
        '<Serial version="1.1">\n<channelId>0</channelId>\n' +
        "<baudRate>9600</baudRate>\n<dataBit>CS8</dataBit>\n" +
        "<stopBit>1</stopBit>\n<parity>none</parity>\n" +
        "<flowControl>none</flowControl>\n" +
        "<controlProtocol>PELCO_D</controlProtocol>\n" +
        "<controlAddress>1</controlAddress>\n</Serial>\n</body>\n",
    ),
  );
  await camera.write({
    header: {
      cmdId: 79,
      bodyLength: body.length,
      channelId: 251,
      messageId: 0,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body,
    payload: new Uint8Array(0),
  });

  assertEquals((await pushes.read()).value, {
    name: "SERIAL_CHANGE_REPORT",
    id: 79,
    body: {
      Serial: {
        channelId: 0,
        baudRate: 9600,
        dataBit: "CS8",
        stopBit: 1,
        parity: "none",
        flowControl: "none",
        controlProtocol: "PELCO_D",
        controlAddress: 1,
      },
    },
  });
  await client.close();
});

Deno.test("pushes passes an unknown push through as raw XML", async () => {
  const { client, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const pushes = client.pushes().getReader();
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n<body>\n' +
    '<futureReport version="1.1">\n<level>3</level>\n</futureReport>\n</body>\n';

  const body = aesCfbEncrypt(aesKey, new TextEncoder().encode(xml));
  await camera.write({
    header: {
      cmdId: 999,
      bodyLength: body.length,
      channelId: 251,
      messageId: 0,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body,
    payload: new Uint8Array(0),
  });

  assertEquals((await pushes.read()).value, { name: undefined, id: 999, xml });
  await client.close();
});

Deno.test("a push the table cannot read errors the push stream but not the client", async () => {
  const { client, requests, camera } = await loggedIn();
  const aesKey = new TextEncoder().encode("08822D7143979103");
  const pushes = client.pushes().getReader();

  const broken = aesCfbEncrypt(
    aesKey,
    new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8" ?>\n<body>' +
        '<Serial version="1.1"><channelId>0</channelId></Serial></body>\n',
    ),
  );
  await camera.write({
    header: {
      cmdId: 79,
      bodyLength: broken.length,
      channelId: 251,
      messageId: 0,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: broken,
    payload: new Uint8Array(0),
  });
  await assertRejects(() => pushes.read(), Error, "<Serial> has no <baudRate>");

  const reply = client.call(command(23, "REBOOT_V20", []));
  await requests.read();
  await camera.write({
    header: {
      cmdId: 23,
      bodyLength: 0,
      channelId: 250,
      messageId: 3,
      status: 200,
      messageClass: 0x1464,
      payloadOffset: 0,
    },
    body: new Uint8Array(0),
    payload: new Uint8Array(0),
  });
  assertEquals((await reply).body, {});
  await client.close();
});

Deno.test("pushes rejects a second push stream", async () => {
  const { client } = await loggedIn();
  client.pushes();

  assertThrows(() => client.pushes(), Error, "already has a push stream");
  await client.close();
});

Deno.test("close ends the push stream", async () => {
  const { client } = await loggedIn();
  const pushes = client.pushes().getReader();

  await client.close();

  assertEquals((await pushes.read()).done, true);
});
