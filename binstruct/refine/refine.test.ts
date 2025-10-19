import { assertEquals } from "@std/assert";
import { u8 } from "../numeric/numeric.ts";
import { refine } from "./refine.ts";

Deno.test("refine - bitfield", () => {
  const bitfield = refine(u8(), {
    refine: (decoded: number) =>
      decoded.toString(2)
        .padStart(8, "0")
        .split("")
        .map(Number),
    unrefine: (refined) => parseInt(refined.join(""), 2),
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
    refine: (
      decoded: number,
      _buffer,
      _context,
      min: number,
      max: number,
    ): number => (min + (max - min) * decoded / 0xff) >>> 0,
    unrefine: (
      refined,
      _buffer,
      _context,
      min: number,
      max: number,
    ): number => ((refined - min) / (max - min) * 0xff) >>> 0,
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
