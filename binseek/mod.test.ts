// deno-lint-ignore-file no-explicit-any
import { BinaryView } from "./mod.ts";
import { assertEquals, assertThrows } from "@std/assert";

// deno-fmt-ignore
const DATA = [241, 242, 243, 244, 245, 246, 247, 248, 255, 255, 255, 255];

// deno-fmt-ignore
const TRUTH_TABLE = [
  {formatOrLength: 1, value: new Uint8Array([241]), bytes: [241]},
  {formatOrLength: 4, value: new Uint8Array([241, 242, 243, 244]), bytes: [241, 242, 243, 244]},
  {
    formatOrLength: undefined,
    value: new Uint8Array([241, 242, 243, 244, 245, 246, 247, 248, 255, 255, 255, 255]),
    bytes: [241, 242, 243, 244, 245, 246, 247, 248, 255, 255, 255, 255]
  },

  {formatOrLength: 'b8', value: [1, 1, 1, 1, 0, 0, 0, 1], bytes: [241]},

  {formatOrLength: 'u8', value: 241, bytes: [241]},
  {formatOrLength: 's8', value: -15, bytes: [241]},

  {formatOrLength: 'u16be', value: 61938, bytes: [241, 242]},
  {formatOrLength: 'u16le', value: 62193, bytes: [241, 242]},
  {formatOrLength: 's16be', value: -3598, bytes: [241, 242]},
  {formatOrLength: 's16le', value: -3343, bytes: [241, 242]},

  {formatOrLength: 'u32be', value: 4059231220, bytes: [241, 242, 243, 244]},
  {formatOrLength: 'u32le', value: 4109628145, bytes: [241, 242, 243, 244]},
  {formatOrLength: 's32be', value: -235736076, bytes: [241, 242, 243, 244]},
  {formatOrLength: 's32le', value: -185339151, bytes: [241, 242, 243, 244]},

  {formatOrLength: 'u64be', value: 17434265340928784376n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
  {formatOrLength: 'u64le', value: 17940079176890708721n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
  {formatOrLength: 's64be', value: -1012478732780767240n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
  {formatOrLength: 's64le', value: -506664896818842895n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
]

Deno.test("read", async (t) => {
  function generateStepName(formatOrLength: any): string {
    return formatOrLength === undefined
      ? "all bytes"
      : typeof formatOrLength === "number"
      ? `first ${formatOrLength} bytes`
      : formatOrLength;
  }

  async function runTests(
    t: Deno.TestContext,
    buffer: Uint8Array,
  ): Promise<void> {
    const view = new BinaryView(buffer);
    for (const { formatOrLength, value, bytes: expectedBytes } of TRUTH_TABLE) {
      await t.step(`get: ${generateStepName(formatOrLength)}`, () => {
        assertEquals(view.reset().get(formatOrLength as any), value);
      });

      await t.step(`set: ${generateStepName(formatOrLength)}`, () => {
        view.reset();

        if (value instanceof Uint8Array) {
          view.set(value);
        } else {
          view.set(value as any, formatOrLength as any);
        }

        const affectedBytes = buffer.subarray(0, expectedBytes.length);
        assertEquals(
          affectedBytes,
          new Uint8Array(expectedBytes),
          "affected bytes do not match expected",
        );
      });

      await t.step(`chk: ${generateStepName(formatOrLength)}`, () => {
        assertEquals(view.reset().get(formatOrLength as any), value);
      });
    }
  }

  await t.step("full buffer", (t) => runTests(t, new Uint8Array(DATA)));

  await t.step("offset buffer", (t) =>
    runTests(
      t,
      new Uint8Array([
        // deno-fmt-ignore
        0xff,
        0xff,
        0xff,
        0xff,
        ...DATA,
        0xff,
        0xff,
        0xff,
        0xff,
      ]).subarray(4, -4),
    ));
});

Deno.test("properties", () => {
  const buffer = new Uint8Array(DATA);
  const view = new BinaryView(buffer);

  assertEquals(view.buffer, buffer);

  assertEquals(view.cursor, 0);
  assertEquals(view.bytesLeft, 12);

  view.seek(4);
  assertEquals(view.cursor, 4);
  assertEquals(view.bytesLeft, 8);
});

Deno.test("overflows", async (t) => {
  await t.step("seek out of bounds", () => {
    const view = new BinaryView(new Uint8Array(DATA));

    assertThrows(() => view.seek(-1));
    assertThrows(() => view.seek(DATA.length + 1));

    assertThrows(() => new BinaryView(new Uint8Array(0)).get(1));
    assertThrows(() => new BinaryView(new Uint8Array(0)).set(1, "u8"));
  });

  await t.step("invalid format", () => {
    assertThrows(() =>
      new BinaryView(new Uint8Array(10)).get("invalid" as any)
    );
    assertThrows(() =>
      new BinaryView(new Uint8Array(10)).set(0, "invalid" as any)
    );
  });
});
