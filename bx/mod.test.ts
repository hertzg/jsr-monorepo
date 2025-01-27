import { bx, bxx } from "./mod.ts";
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Buffer } from "node:buffer";

describe("bx", () => {
  it("should produce 0 length ArrayBuffer on empty string", () => {
    expect(bx("")).toStrictEqual(new ArrayBuffer(0));
  });
  it("should convert hex strings to ArrayBuffer", () => {
    expect(bx("fe")).toEqual(new Uint8Array([0xfe]).buffer);
    expect(bx("feef")).toEqual(new Uint8Array([0xfe, 0xef]).buffer);
    expect(bx("feeffaaf")).toEqual(
      new Uint8Array([0xfe, 0xef, 0xfa, 0xaf]).buffer,
    );
  });
  it("should convert hex strings with separators to ArrayBuffer", () => {
    expect(bx("fe_ef af be b0 xba-ab")).toStrictEqual(
      new Uint8Array([0xfe, 0xef, 0xaf, 0xbe, 0xb0, 0xba, 0xab]).buffer,
    );
  });
  it("should throw on invalid strings", () => {
    expect(() => bx(" ")).toThrow(TypeError);
    expect(() => bx("zz")).toThrow(TypeError);
    expect(() => bx("0")).toThrow(TypeError);
    expect(() => bx("1")).toThrow(TypeError);
    expect(() => bx("deadbea")).toThrow(TypeError);
  });
});

describe("bxx", () => {
  it("should convert hex strings with separators to Buffer", () => {
    expect(bxx("fe_ef af be b0 xba-ab")).toEqual(
      Buffer.from([0xfe, 0xef, 0xaf, 0xbe, 0xb0, 0xba, 0xab]),
    );
  });
});
