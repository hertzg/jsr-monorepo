import { assertEquals } from "@std/assert";
import {
  VXLAN_FLAG_VALID_VNI,
  VXLAN_HEADER_SIZE,
  VXLAN_PORT,
  type VxlanHeader,
  vxlanHeader,
} from "./mod.ts";

Deno.test("vxlanHeader", async (t) => {
  await t.step("round-trips a header with an inner frame", () => {
    const coder = vxlanHeader();
    const innerFrame = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const header: VxlanHeader = {
      flagsReserved1: { flags: VXLAN_FLAG_VALID_VNI, reserved1: 0 },
      vniReserved2: { vni: 42, reserved2: 0 },
      innerFrame,
    };

    const buffer = new Uint8Array(VXLAN_HEADER_SIZE + innerFrame.length);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, VXLAN_HEADER_SIZE + innerFrame.length);
    assertEquals(read, written);
    assertEquals(decoded, header);
  });

  await t.step("round-trips a header with an empty inner frame", () => {
    const coder = vxlanHeader();
    const header: VxlanHeader = {
      flagsReserved1: { flags: VXLAN_FLAG_VALID_VNI, reserved1: 0 },
      vniReserved2: { vni: 0, reserved2: 0 },
      innerFrame: new Uint8Array(0),
    };

    const buffer = new Uint8Array(VXLAN_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, VXLAN_HEADER_SIZE);
    assertEquals(read, VXLAN_HEADER_SIZE);
    assertEquals(decoded.innerFrame.length, 0);
  });

  await t.step("decodes a known wire-format header (VNI 42)", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x08, 0x00, 0x00, 0x00, // flags = I-bit set, reserved1 = 0
      0x00, 0x00, 0x2a, 0x00, // vni = 42, reserved2 = 0
      0xaa, 0xbb, 0xcc, 0xdd, // inner frame
    ]);

    const [decoded, read] = vxlanHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.flagsReserved1.flags, VXLAN_FLAG_VALID_VNI);
    assertEquals(decoded.flagsReserved1.reserved1, 0);
    assertEquals(decoded.vniReserved2.vni, 42);
    assertEquals(decoded.vniReserved2.reserved2, 0);
    assertEquals(decoded.innerFrame, new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));
  });

  await t.step("decodes a known wire-format header (VNI 0x123456)", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x08, 0x00, 0x00, 0x00, // flags = I-bit set, reserved1 = 0
      0x12, 0x34, 0x56, 0x00, // vni = 0x123456, reserved2 = 0
    ]);

    const [decoded, read] = vxlanHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.vniReserved2.vni, 0x123456);
    assertEquals(decoded.innerFrame.length, 0);
  });

  await t.step("VXLAN_FLAG_VALID_VNI marks the I-bit", () => {
    assertEquals(VXLAN_FLAG_VALID_VNI, 0x08);
  });

  await t.step("VXLAN_PORT is the IANA-assigned UDP port", () => {
    assertEquals(VXLAN_PORT, 4789);
  });

  await t.step("VXLAN_HEADER_SIZE is 8 bytes", () => {
    assertEquals(VXLAN_HEADER_SIZE, 8);
  });
});
