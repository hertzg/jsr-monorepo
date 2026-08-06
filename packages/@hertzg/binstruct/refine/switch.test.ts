import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { struct } from "../struct/struct.ts";
import { u8 } from "../numeric/numeric.ts";
import { bytes } from "../bytes/bytes.ts";
import { string } from "../string/string.ts";
import { decode, encode } from "../helpers.ts";
import { type Context, createContext } from "../core.ts";
import { refineSwitch } from "./switch.ts";
import type { Refiner } from "./refine.ts";

// Test types
interface BasePacket {
  type: number;
  data: Uint8Array;
}

interface PingPacket {
  type: 1;
  timestamp: number;
}

interface DataPacket {
  type: 2;
  payload: string;
}

interface AckPacket {
  type: 3;
  sequenceNumber: number;
}

Deno.test("refineSwitch - basic round-trip with single refiner", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
    },
    {
      refine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
      unrefine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
    },
  );

  const buffer = new Uint8Array(10);
  const ping: PingPacket = { type: 1, timestamp: 42 };

  const written = packetCoder.encode(ping, buffer);
  const [decoded, read] = packetCoder.decode(buffer);

  assertEquals(written, 2); // 1 byte type + 1 byte data
  assertEquals(read, written);
  assertEquals(decoded.type, 1);
  assertEquals(decoded.timestamp, 42);
});

Deno.test("refineSwitch - multiple refiners with different types", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const dataRefiner: Refiner<BasePacket, DataPacket, []> = {
    refine: (packet, ctx) => ({
      type: 2,
      payload: decode(string(packet.data.length), packet.data, ctx),
    }),
    unrefine: (data, ctx) => ({
      type: data.type,
      data: encode(
        string(data.payload.length),
        data.payload,
        ctx,
        new Uint8Array(100),
      ),
    }),
  };

  const ackRefiner: Refiner<BasePacket, AckPacket, []> = {
    refine: (packet, ctx) => ({
      type: 3,
      sequenceNumber: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ack, ctx) => ({
      type: ack.type,
      data: encode(u8(), ack.sequenceNumber, ctx, new Uint8Array(1)),
    }),
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(5),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
      data: dataRefiner,
      ack: ackRefiner,
    },
    {
      refine: (packet, _ctx) => {
        if (packet.type === 1) return "ping";
        if (packet.type === 2) return "data";
        if (packet.type === 3) return "ack";
        return null;
      },
      unrefine: (packet, _ctx) => {
        if (packet.type === 1) return "ping";
        if (packet.type === 2) return "data";
        if (packet.type === 3) return "ack";
        return null;
      },
    },
  );

  const buffer = new Uint8Array(10);

  // Test ping packet
  const ping: PingPacket = { type: 1, timestamp: 42 };
  const writtenPing = packetCoder.encode(ping, buffer);
  const [decodedPing, readPing] = packetCoder.decode(buffer);
  assertEquals(writtenPing, readPing);
  assertEquals(decodedPing.type, 1);
  assertEquals((decodedPing as PingPacket).timestamp, 42);

  // Test data packet
  const dataPacket: DataPacket = { type: 2, payload: "hello" };
  const writtenData = packetCoder.encode(dataPacket, buffer);
  const [decodedData, readData] = packetCoder.decode(buffer);
  assertEquals(writtenData, readData);
  assertEquals(decodedData.type, 2);
  assertEquals((decodedData as DataPacket).payload, "hello");

  // Test ack packet
  const ack: AckPacket = { type: 3, sequenceNumber: 123 };
  const writtenAck = packetCoder.encode(ack, buffer);
  const [decodedAck, readAck] = packetCoder.decode(buffer);
  assertEquals(writtenAck, readAck);
  assertEquals(decodedAck.type, 3);
  assertEquals((decodedAck as AckPacket).sequenceNumber, 123);
});

Deno.test("refineSwitch - decode error when selector.refine returns null", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
    },
    {
      refine: (_packet, _ctx) => null, // Always return null
      unrefine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
    },
  );

  const buffer = new Uint8Array([1, 42]); // type=1, data=42

  assertThrows(
    () => packetCoder.decode(buffer),
    Error,
    "refineSwitch: selector.refine returned null",
  );
});

Deno.test("refineSwitch - encode error when selector.unrefine returns null", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
    },
    {
      refine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
      unrefine: (_packet, _ctx) => null, // Always return null
    },
  );

  const buffer = new Uint8Array(10);
  const ping: PingPacket = { type: 1, timestamp: 42 };

  assertThrows(
    () => packetCoder.encode(ping, buffer),
    Error,
    "refineSwitch: selector.unrefine returned null",
  );
});

Deno.test("refineSwitch - decode error when selector returns invalid key", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
    },
    {
      // Return invalid key that doesn't exist in refiners
      // deno-lint-ignore no-explicit-any
      refine: (_packet, _ctx) => "invalid" as any,
      unrefine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
    },
  );

  const buffer = new Uint8Array([1, 42]); // type=1, data=42

  assertThrows(
    () => packetCoder.decode(buffer),
    Error,
    'refineSwitch: Invalid refiner key "invalid"',
  );
});

Deno.test("refineSwitch - encode error when selector returns invalid key", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
    },
    {
      refine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
      // Return invalid key that doesn't exist in refiners
      // deno-lint-ignore no-explicit-any
      unrefine: (_packet, _ctx) => "invalid" as any,
    },
  );

  const buffer = new Uint8Array(10);
  const ping: PingPacket = { type: 1, timestamp: 42 };

  assertThrows(
    () => packetCoder.encode(ping, buffer),
    Error,
    'refineSwitch: Invalid refiner key "invalid"',
  );
});

Deno.test("refineSwitch - context propagation", () => {
  const refinePing = spy((packet: BasePacket, ctx: Context): PingPacket => ({
    type: 1,
    timestamp: decode(u8(), packet.data, ctx),
  }));

  const unrefinePing = spy((ping: PingPacket, ctx: Context): BasePacket => ({
    type: ping.type,
    data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
  }));

  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: refinePing,
    unrefine: unrefinePing,
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
    },
    {
      refine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
      unrefine: (packet, _ctx) => (packet.type === 1 ? "ping" : null),
    },
  );

  const buffer = new Uint8Array(10);
  const ping: PingPacket = { type: 1, timestamp: 42 };

  // The caller's own context must reach the refiner — asserting on its
  // `direction` alone would also accept a freshly created one.
  const encodeCtx = createContext("encode");
  packetCoder.encode(ping, buffer, encodeCtx);
  assertSpyCalls(unrefinePing, 1);
  assertStrictEquals(unrefinePing.calls[0].args[1], encodeCtx);

  const decodeCtx = createContext("decode");
  packetCoder.decode(buffer, decodeCtx);
  assertSpyCalls(refinePing, 1);
  assertStrictEquals(refinePing.calls[0].args[1], decodeCtx);
});

Deno.test("refineSwitch - passthrough refiner for unknown values", () => {
  const pingRefiner: Refiner<BasePacket, PingPacket, []> = {
    refine: (packet, ctx) => ({
      type: 1,
      timestamp: decode(u8(), packet.data, ctx),
    }),
    unrefine: (ping, ctx) => ({
      type: ping.type,
      data: encode(u8(), ping.timestamp, ctx, new Uint8Array(1)),
    }),
  };

  const passthroughRefiner: Refiner<BasePacket, BasePacket, []> = {
    refine: (packet, _ctx) => packet,
    unrefine: (packet, _ctx) => packet,
  };

  const baseCoder = struct({
    type: u8(),
    data: bytes(1),
  });

  const packetCoder = refineSwitch(
    baseCoder,
    {
      ping: pingRefiner,
      unknown: passthroughRefiner,
    },
    {
      refine: (packet, _ctx) => (packet.type === 1 ? "ping" : "unknown"),
      unrefine: (packet, _ctx) => (packet.type === 1 ? "ping" : "unknown"),
    },
  );

  const buffer = new Uint8Array(10);

  // Test known packet (ping)
  const ping: PingPacket = { type: 1, timestamp: 42 };
  const writtenPing = packetCoder.encode(ping, buffer);
  const [decodedPing, readPing] = packetCoder.decode(buffer);
  assertEquals(writtenPing, readPing);
  assertEquals(decodedPing.type, 1);
  assertEquals((decodedPing as PingPacket).timestamp, 42);

  // Test unknown packet (passthrough)
  const unknown: BasePacket = { type: 99, data: new Uint8Array([123]) };
  const writtenUnknown = packetCoder.encode(unknown, buffer);
  const [decodedUnknown, readUnknown] = packetCoder.decode(buffer);
  assertEquals(writtenUnknown, readUnknown);
  assertEquals(decodedUnknown.type, 99);
  assertEquals((decodedUnknown as BasePacket).data[0], 123);
});
