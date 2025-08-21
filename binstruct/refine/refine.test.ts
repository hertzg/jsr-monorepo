import { assertEquals } from "@std/assert";
import { u8 } from "../numeric/numeric.ts";
import { refine } from "./refine.ts";

Deno.test("refine - bitfield", () => {
  const bitfield = refine(u8(), {
    decode: (decoded: number) =>
      decoded.toString(2)
        .padStart(8, "0")
        .split("")
        .map(Number),
    encode: (refined) => parseInt(refined.join(""), 2),
  });

  const coder = bitfield();
  const buffer = new Uint8Array(10);

  const bytesWritten = coder.encode([1, 0, 1, 0, 1, 0, 1, 0], buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 1);
  assertEquals(bytesRead, bytesWritten);
  assertEquals(buffer[0], 0b10101010);
  assertEquals(decoded, [1, 0, 1, 0, 1, 0, 1, 0]);
});

Deno.test("refine with args", () => {
  const u8Mapped = refine(u8(), {
    decode: (decoded: number, min: number, max: number) =>
      (min + (max - min) * decoded / 0xff) >>> 0,
    encode: (refined, min, max) => ((refined - min) / (max - min) * 0xff) >>> 0,
  });

  const coder = u8Mapped(-100, 100);
  const buffer = new Uint8Array(10);

  const bytesWritten = coder.encode(0, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 1);
  assertEquals(bytesRead, bytesWritten);
  assertEquals(buffer[0], 0x7f);
  assertEquals(decoded, 0);
});
