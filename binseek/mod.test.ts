// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertThrows } from "@std/assert";
import { BinaryView } from "./mod.ts";

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

  //{formatOrLength: 'b8', value: [1, 1, 1, 1, 0, 0, 0, 1], bytes: [241]},

  {formatOrLength: 'u8' as const, value: 241, bytes: [241]},
  {formatOrLength: 's8' as const, value: -15, bytes: [241]},

  {formatOrLength: 'u16be' as const, value: 61938, bytes: [241, 242]},
  {formatOrLength: 'u16le' as const, value: 62193, bytes: [241, 242]},
  {formatOrLength: 's16be' as const, value: -3598, bytes: [241, 242]},
  {formatOrLength: 's16le' as const, value: -3343, bytes: [241, 242]},

  {formatOrLength: 'u32be' as const, value: 4059231220, bytes: [241, 242, 243, 244]},
  {formatOrLength: 'u32le' as const, value: 4109628145, bytes: [241, 242, 243, 244]},
  {formatOrLength: 's32be' as const, value: -235736076, bytes: [241, 242, 243, 244]},
  {formatOrLength: 's32le' as const, value: -185339151, bytes: [241, 242, 243, 244]},

  {formatOrLength: 'u64be' as const, value: 17434265340928784376n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
  {formatOrLength: 'u64le' as const, value: 17940079176890708721n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
  {formatOrLength: 's64be' as const, value: -1012478732780767240n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
  {formatOrLength: 's64le' as const, value: -506664896818842895n, bytes: [241, 242, 243, 244, 245, 246, 247, 248]},
]

function generateStepName(formatOrLength: any): string {
  return formatOrLength === undefined
    ? "bytes: all"
    : typeof formatOrLength === "number"
    ? `bytes: first ${formatOrLength}`
    : formatOrLength;
}

for (const { formatOrLength, value, bytes: expectedBytes } of TRUTH_TABLE) {
  Deno.test(`${generateStepName(formatOrLength)}`, async (t) => {
    const buffer = new Uint8Array(DATA);
    const view = new BinaryView(buffer);

    await t.step(`get`, () => {
      assertEquals(view.reset().get(formatOrLength), value);
    });

    await t.step(`set`, () => {
      view.reset();

      if (value instanceof Uint8Array) {
        view.set(value);
      } else {
        view.set(
          value,
          formatOrLength as Exclude<typeof formatOrLength, number>,
        );
      }

      const affectedBytes = buffer.subarray(0, expectedBytes.length);
      assertEquals(
        affectedBytes,
        new Uint8Array(expectedBytes),
        "affected bytes do not match expected",
      );
    });

    await t.step(`chk`, () => {
      assertEquals(view.reset().get(formatOrLength), value);
    });
  });
}

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
