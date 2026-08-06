import { assertEquals } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { lazy } from "./lazy.ts";
import { type Coder, type Context, createContext } from "../core.ts";
import { u8be } from "../numeric/numeric.ts";
import { refine } from "../refine/refine.ts";
import { struct } from "../struct/struct.ts";
import { bytes } from "../bytes/bytes.ts";

Deno.test("lazy - round-trips like the coder it wraps", () => {
  const inner = u8be();
  const coder = lazy(() => inner);

  const buffer = new Uint8Array(4);
  const written = coder.encode(42, buffer);
  const [decoded, read] = coder.decode(buffer);

  const referenceBuffer = new Uint8Array(4);
  const referenceWritten = inner.encode(42, referenceBuffer);
  const [referenceDecoded, referenceRead] = inner.decode(referenceBuffer);

  assertEquals(decoded, referenceDecoded);
  assertEquals(written, referenceWritten);
  assertEquals(read, referenceRead);
});

Deno.test("lazy - does not call the factory until first use", () => {
  const factory = spy(() => u8be());
  const coder = lazy(factory);

  assertSpyCalls(factory, 0);

  const buffer = new Uint8Array(4);
  coder.encode(7, buffer);

  assertSpyCalls(factory, 1);
});

Deno.test("lazy - builds the inner coder at most once across many calls", () => {
  const factory = spy(() => u8be());
  const coder = lazy(factory);

  const buffer = new Uint8Array(4);
  for (let i = 0; i < 5; i++) {
    coder.encode(i, buffer);
    coder.decode(buffer);
  }

  assertSpyCalls(factory, 1);
});

Deno.test("lazy - shares a single context across nested encode/decode calls", () => {
  const inner = struct({ a: u8be(), b: u8be() });
  const coder = lazy(() => inner);

  const buffer = new Uint8Array(4);
  const value = { a: 1, b: 2 };

  const encodeCtx = createContext("encode");
  const written = coder.encode(value, buffer, encodeCtx);

  const decodeCtx = createContext("decode");
  const [decoded, read] = coder.decode(buffer, decodeCtx);

  assertEquals(decoded, value);
  assertEquals(written, read);
});

interface Frame {
  hasNext: 0 | 1;
  rest: Frame | Uint8Array;
}

interface FrameHost {
  hasNext: 0 | 1;
  rest: Uint8Array;
}

// `lazy()` memoizes the coder its factory returns, so each test builds its own
// pair rather than sharing one across the file — otherwise the second test to
// run would only ever see an already-resolved cycle.
function makeFrameCoder(): Coder<Frame> {
  // `lazyFrame` closes the cycle: it's created before `frameCoder` exists, but
  // its factory (`() => frameCoder`) isn't invoked until the first
  // encode/decode, by which point `frameCoder`'s own initializer has finished.
  const lazyFrame: Coder<Frame> = lazy(() => frameCoder);

  // `rest` is a greedy `bytes()` field, so it always consumes everything left
  // in the view it's handed. Encoding first (to learn the exact byte count)
  // and then decoding only that exact slice keeps every level self-delimiting
  // without needing an explicit length field.
  const frameCoder: Coder<Frame> = refine(
    struct({ hasNext: u8be() as unknown as Coder<0 | 1>, rest: bytes() }),
    {
      refine: (host: FrameHost, ctx: Context): Frame => {
        if (host.hasNext === 0) {
          return { hasNext: 0, rest: host.rest };
        }
        const [rest] = lazyFrame.decode(host.rest, ctx);
        return { hasNext: 1, rest };
      },
      unrefine: (frame: Frame, ctx: Context): FrameHost => {
        if (frame.hasNext === 0) {
          return { hasNext: 0, rest: frame.rest as Uint8Array };
        }
        const scratch = new Uint8Array(1024);
        const bytesWritten = lazyFrame.encode(
          frame.rest as Frame,
          scratch,
          ctx,
        );
        return { hasNext: 1, rest: scratch.subarray(0, bytesWritten) };
      },
    },
  )();

  return frameCoder;
}

Deno.test("lazy - self-referential graph round-trips through multiple levels", () => {
  const frameCoder = makeFrameCoder();
  const value: Frame = {
    hasNext: 1,
    rest: {
      hasNext: 1,
      rest: {
        hasNext: 0,
        rest: new Uint8Array(0),
      },
    },
  };

  const buffer = new Uint8Array(16);
  const written = frameCoder.encode(value, buffer);
  const [decoded, read] = frameCoder.decode(buffer.subarray(0, written));

  assertEquals(decoded, value);
  assertEquals(written, read);
});

Deno.test("lazy - self-referential graph round-trips a single leaf", () => {
  const frameCoder = makeFrameCoder();
  const value: Frame = { hasNext: 0, rest: new Uint8Array(0) };

  const buffer = new Uint8Array(16);
  const written = frameCoder.encode(value, buffer);
  const [decoded, read] = frameCoder.decode(buffer.subarray(0, written));

  assertEquals(decoded, value);
  assertEquals(written, read);
});

interface Ping {
  kind: 0;
  next: Pong;
}
interface Pong {
  kind: 1;
  ttl: number;
}

Deno.test("lazy - breaks a build-time cycle between two struct coders", () => {
  const pingCoder: Coder<Ping> = struct({
    kind: u8be() as unknown as Coder<0>,
    next: lazy(() => pongCoder),
  });

  const pongCoder: Coder<Pong> = struct({
    kind: u8be() as unknown as Coder<1>,
    ttl: u8be(),
  });

  const value: Ping = { kind: 0, next: { kind: 1, ttl: 64 } };
  const buffer = new Uint8Array(8);

  const written = pingCoder.encode(value, buffer);
  const [decoded, read] = pingCoder.decode(buffer);

  assertEquals(decoded, value);
  assertEquals(written, read);
});
