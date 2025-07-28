import { assertEquals, assertThrows } from "jsr:@std/assert";
import { struct } from "./struct.ts";
import {
  f32be,
  f64be,
  s16be,
  s32be,
  s8be,
  u16be,
  u32be,
  u8be,
} from "./numeric.ts";
import { arrayOf } from "./array.ts";
import { stringLP, stringNT } from "./string.ts";

Deno.test("struct: basic functionality", async (t) => {
  await t.step("encodes and decodes simple struct", () => {
    const personCoder = struct({
      id: u32be,
      age: u8be,
      height: f32be,
    });

    const person = { id: 12345, age: 30, height: 1.75 };
    const buffer = new Uint8Array(100);
    const bytesWritten = personCoder.encode(person, buffer);
    const [decoded, bytesRead] = personCoder.decode(buffer);

    assertEquals(decoded, person);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("encodes and decodes struct with all numeric types", () => {
    const dataCoder = struct({
      u8: u8be,
      u16: u16be,
      u32: u32be,
      s8: s8be,
      s16: s16be,
      s32: s32be,
      f32: f32be,
      f64: f64be,
    });

    const data = {
      u8: 255,
      u16: 65535,
      u32: 4294967295,
      s8: -128,
      s16: -32768,
      s32: -2147483648,
      f32: 3.14159,
      f64: Math.PI,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = dataCoder.encode(data, buffer);
    const [decoded, bytesRead] = dataCoder.decode(buffer);

    assertEquals(decoded.u8, data.u8);
    assertEquals(decoded.u16, data.u16);
    assertEquals(decoded.u32, data.u32);
    assertEquals(decoded.s8, data.s8);
    assertEquals(decoded.s16, data.s16);
    assertEquals(decoded.s32, data.s32);
    assertEquals(Math.abs(decoded.f32 - data.f32) < 0.0001, true);
    assertEquals(Math.abs(decoded.f64 - data.f64) < 0.000000000000001, true);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("encodes and decodes empty struct", () => {
    const emptyCoder = struct({});
    const data = {};

    const buffer = new Uint8Array(100);
    const bytesWritten = emptyCoder.encode(data, buffer);
    const [decoded, bytesRead] = emptyCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("encodes and decodes struct with arrays", () => {
    const gameStateCoder = struct({
      playerCount: u8be,
      scores: arrayOf(u16be, u8be),
      positions: arrayOf(f32be, u8be),
    });

    const gameState = {
      playerCount: 4,
      scores: [100, 200, 150, 300],
      positions: [1.5, 2.7, 3.14, 4.2],
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = gameStateCoder.encode(gameState, buffer);
    const [decoded, bytesRead] = gameStateCoder.decode(buffer);

    assertEquals(decoded.playerCount, gameState.playerCount);
    assertEquals(decoded.scores, gameState.scores);
    assertEquals(decoded.positions.length, gameState.positions.length);
    for (let i = 0; i < gameState.positions.length; i++) {
      assertEquals(
        Math.abs(decoded.positions[i] - gameState.positions[i]) < 0.001,
        true,
      );
    }
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("encodes and decodes struct with string fields", () => {
    const userCoder = struct({
      id: u32be,
      name: stringLP(u16be),
      email: stringNT(),
      bio: stringLP(u32be),
    });

    const user = {
      id: 12345,
      name: "John Doe",
      email: "john@example.com",
      bio: "Software developer from სამყარო! 🌍",
    };

    const buffer = new Uint8Array(200);
    const bytesWritten = userCoder.encode(user, buffer);
    const [decoded, bytesRead] = userCoder.decode(buffer);

    assertEquals(decoded.id, user.id);
    assertEquals(decoded.name, user.name);
    assertEquals(decoded.email, user.email);
    assertEquals(decoded.bio, user.bio);
    assertEquals(bytesWritten, bytesRead);
  });
});

Deno.test("struct: property order", async (t) => {
  await t.step("maintains property order", () => {
    const orderCoder = struct({
      first: u8be,
      second: u16be,
      third: u32be,
    });

    const data = { first: 1, second: 2, third: 3 };
    const buffer = new Uint8Array(100);
    const bytesWritten = orderCoder.encode(data, buffer);
    const [decoded, bytesRead] = orderCoder.decode(buffer);

    // Check that properties are in the same order
    const originalKeys = Object.keys(data);
    const decodedKeys = Object.keys(decoded);
    assertEquals(decodedKeys, originalKeys);
    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with different property orders", () => {
    const coder1 = struct({
      a: u8be,
      b: u16be,
      c: u32be,
    });

    const coder2 = struct({
      c: u32be,
      a: u8be,
      b: u16be,
    });

    const data1 = { a: 1, b: 2, c: 3 };
    const data2 = { c: 3, a: 1, b: 2 };

    const buffer1 = new Uint8Array(100);
    const buffer2 = new Uint8Array(100);

    const bytesWritten1 = coder1.encode(data1, buffer1);
    const bytesWritten2 = coder2.encode(data2, buffer2);

    const [decoded1, bytesRead1] = coder1.decode(buffer1);
    const [decoded2, bytesRead2] = coder2.decode(buffer2);

    assertEquals(decoded1, data1);
    assertEquals(decoded2, data2);
    assertEquals(bytesWritten1, bytesRead1);
    assertEquals(bytesWritten2, bytesRead2);
  });
});

Deno.test("struct: edge cases", async (t) => {
  await t.step("handles struct with single property", () => {
    const singleCoder = struct({
      value: u32be,
    });

    const data = { value: 42 };
    const buffer = new Uint8Array(100);
    const bytesWritten = singleCoder.encode(data, buffer);
    const [decoded, bytesRead] = singleCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles struct with many properties", () => {
    const manyPropsCoder = struct({
      p1: u8be,
      p2: u8be,
      p3: u8be,
      p4: u8be,
      p5: u8be,
      p6: u8be,
      p7: u8be,
      p8: u8be,
      p9: u8be,
      p10: u8be,
    });

    const data = {
      p1: 1,
      p2: 2,
      p3: 3,
      p4: 4,
      p5: 5,
      p6: 6,
      p7: 7,
      p8: 8,
      p9: 9,
      p10: 10,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = manyPropsCoder.encode(data, buffer);
    const [decoded, bytesRead] = manyPropsCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles struct with zero values", () => {
    const zeroCoder = struct({
      u8: u8be,
      u16: u16be,
      u32: u32be,
      f32: f32be,
      f64: f64be,
    });

    const data = {
      u8: 0,
      u16: 0,
      u32: 0,
      f32: 0.0,
      f64: 0.0,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = zeroCoder.encode(data, buffer);
    const [decoded, bytesRead] = zeroCoder.decode(buffer);

    assertEquals(decoded.u8, data.u8);
    assertEquals(decoded.u16, data.u16);
    assertEquals(decoded.u32, data.u32);
    assertEquals(decoded.f32, data.f32);
    assertEquals(decoded.f64, data.f64);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles struct with maximum values", () => {
    const maxCoder = struct({
      u8: u8be,
      u16: u16be,
      u32: u32be,
      s8: s8be,
      s16: s16be,
      s32: s32be,
    });

    const data = {
      u8: 255,
      u16: 65535,
      u32: 4294967295,
      s8: 127,
      s16: 32767,
      s32: 2147483647,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = maxCoder.encode(data, buffer);
    const [decoded, bytesRead] = maxCoder.decode(buffer);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles struct with arrays of strings", () => {
    const configCoder = struct({
      version: u8be,
      names: arrayOf(stringLP(u16be), u8be),
      tags: arrayOf(stringNT(), u8be),
      description: stringLP(u32be),
    });

    const config = {
      version: 1,
      names: ["Alice", "Bob", "Charlie", "სამყარო"],
      tags: ["tag1", "tag2", "tag3"],
      description: "Configuration with string arrays and Unicode support 🌍",
    };

    const buffer = new Uint8Array(500);
    const bytesWritten = configCoder.encode(config, buffer);
    const [decoded, bytesRead] = configCoder.decode(buffer);

    assertEquals(decoded.version, config.version);
    assertEquals(decoded.names, config.names);
    assertEquals(decoded.tags, config.tags);
    assertEquals(decoded.description, config.description);
    assertEquals(bytesWritten, bytesRead);
  });
});

Deno.test("struct: error handling", async (t) => {
  await t.step("throws on buffer too small for first property", () => {
    const coder = struct({
      id: u32be,
      age: u8be,
    });

    const data = { id: 12345, age: 30 };
    const buffer = new Uint8Array(100);
    coder.encode(data, buffer);

    // Try to decode with a buffer that's too small for the first property
    const smallBuffer = new Uint8Array(2);
    assertThrows(() => coder.decode(smallBuffer), Error);
  });

  await t.step("throws on buffer too small for later property", () => {
    const coder = struct({
      id: u8be,
      age: u32be,
    });

    const data = { id: 123, age: 30 };
    const buffer = new Uint8Array(100);
    coder.encode(data, buffer);

    // Create a buffer that's big enough for first property but not for second
    const partialBuffer = new Uint8Array(2);
    assertThrows(() => coder.decode(partialBuffer), Error);
  });

  await t.step("throws on empty buffer", () => {
    const coder = struct({
      id: u32be,
      age: u8be,
    });

    const emptyBuffer = new Uint8Array(0);
    assertThrows(() => coder.decode(emptyBuffer), Error);
  });
});

Deno.test("struct: roundtrip with offset", async (t) => {
  await t.step("works with buffer offset", () => {
    const coder = struct({
      id: u16be,
      age: u8be,
      height: f32be,
    });

    const data = { id: 12345, age: 30, height: 1.75 };
    const buffer = new Uint8Array(100);
    const offset = 10;
    const view = buffer.subarray(offset);

    const bytesWritten = coder.encode(data, view);
    const [decoded, bytesRead] = coder.decode(view);

    assertEquals(decoded, data);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("works with multiple structs in same buffer", () => {
    const coder = struct({
      id: u8be,
      value: u16be,
    });

    const data1 = { id: 1, value: 100 };
    const data2 = { id: 2, value: 200 };

    const buffer = new Uint8Array(100);

    // Encode first struct
    const bytesWritten1 = coder.encode(data1, buffer);

    // Encode second struct after first
    const view2 = buffer.subarray(bytesWritten1);
    const bytesWritten2 = coder.encode(data2, view2);

    // Decode first struct
    const [decoded1, bytesRead1] = coder.decode(buffer);
    assertEquals(decoded1, data1);
    assertEquals(bytesWritten1, bytesRead1);

    // Decode second struct
    const view2ForDecode = buffer.subarray(bytesWritten1);
    const [decoded2, bytesRead2] = coder.decode(view2ForDecode);
    assertEquals(decoded2, data2);
    assertEquals(bytesWritten2, bytesRead2);
  });
});

Deno.test("struct: floating point precision", async (t) => {
  await t.step("maintains precision for f32 properties", () => {
    const coder = struct({
      x: f32be,
      y: f32be,
      z: f32be,
    });

    const data = { x: 1.5, y: 2.7, z: 3.14159 };
    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(Math.abs(decoded.x - data.x) < 0.0001, true);
    assertEquals(Math.abs(decoded.y - data.y) < 0.0001, true);
    assertEquals(Math.abs(decoded.z - data.z) < 0.0001, true);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("maintains precision for f64 properties", () => {
    const coder = struct({
      pi: f64be,
      e: f64be,
      phi: f64be,
    });

    const data = { pi: Math.PI, e: Math.E, phi: 1.618033988749895 };
    const buffer = new Uint8Array(100);
    const bytesWritten = coder.encode(data, buffer);
    const [decoded, bytesRead] = coder.decode(buffer);

    assertEquals(Math.abs(decoded.pi - data.pi) < 0.000000000000001, true);
    assertEquals(Math.abs(decoded.e - data.e) < 0.000000000000001, true);
    assertEquals(Math.abs(decoded.phi - data.phi) < 0.000000000000001, true);
    assertEquals(bytesWritten, bytesRead);
  });
});

Deno.test("struct: complex nested structures", async (t) => {
  await t.step("handles struct with nested arrays", () => {
    const nestedCoder = struct({
      id: u32be,
      tags: arrayOf(u8be, u8be),
      scores: arrayOf(u16be, u8be),
      metadata: struct({
        created: u32be,
        updated: u32be,
      }),
    });

    const data = {
      id: 12345,
      tags: [1, 2, 3, 4, 5],
      scores: [100, 200, 300],
      metadata: {
        created: 1640995200,
        updated: 1640995200,
      },
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = nestedCoder.encode(data, buffer);
    const [decoded, bytesRead] = nestedCoder.decode(buffer);

    assertEquals(decoded.id, data.id);
    assertEquals(decoded.tags, data.tags);
    assertEquals(decoded.scores, data.scores);
    assertEquals(decoded.metadata.created, data.metadata.created);
    assertEquals(decoded.metadata.updated, data.metadata.updated);
    assertEquals(bytesWritten, bytesRead);
  });

  await t.step("handles struct with arrays of structs", () => {
    const playerCoder = struct({
      id: u8be,
      name: arrayOf(u8be, u8be), // array of bytes representing string
      score: u32be,
    });

    const gameCoder = struct({
      gameId: u32be,
      players: arrayOf(playerCoder, u8be),
    });

    const data = {
      gameId: 12345,
      players: [
        { id: 1, name: [65, 66, 67], score: 100 }, // "ABC"
        { id: 2, name: [68, 69, 70], score: 200 }, // "DEF"
      ],
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = gameCoder.encode(data, buffer);
    const [decoded, bytesRead] = gameCoder.decode(buffer);

    assertEquals(decoded.gameId, data.gameId);
    assertEquals(decoded.players.length, data.players.length);
    assertEquals(decoded.players[0].id, data.players[0].id);
    assertEquals(decoded.players[0].name, data.players[0].name);
    assertEquals(decoded.players[0].score, data.players[0].score);
    assertEquals(decoded.players[1].id, data.players[1].id);
    assertEquals(decoded.players[1].name, data.players[1].name);
    assertEquals(decoded.players[1].score, data.players[1].score);
    assertEquals(bytesWritten, bytesRead);
  });
});
