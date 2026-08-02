import { assertEquals } from "@std/assert";
import {
  BFD_CONTROL_SIZE,
  BFD_PORT,
  BFD_STATE,
  type BfdControlPacket,
  bfdControlPacket,
} from "./mod.ts";

Deno.test("bfdControlPacket", async (t) => {
  await t.step("round-trips an Up packet with no flags set", () => {
    const coder = bfdControlPacket();
    const packet: BfdControlPacket = {
      versionDiagnostic: { version: 1, diagnostic: 0 },
      flags: {
        state: BFD_STATE.UP,
        poll: 0,
        final: 0,
        controlPlaneIndependent: 0,
        authenticationPresent: 0,
        demand: 0,
        multipoint: 0,
      },
      detectMultiplier: 3,
      length: BFD_CONTROL_SIZE,
      myDiscriminator: 0x11111111,
      yourDiscriminator: 0x22222222,
      desiredMinTxInterval: 1_000_000,
      requiredMinRxInterval: 1_000_000,
      requiredMinEchoRxInterval: 0,
    };

    const buffer = new Uint8Array(BFD_CONTROL_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, BFD_CONTROL_SIZE);
    assertEquals(read, BFD_CONTROL_SIZE);
    assertEquals(decoded, packet);
  });

  await t.step("round-trips an Init packet with poll and CPI set", () => {
    const coder = bfdControlPacket();
    const packet: BfdControlPacket = {
      versionDiagnostic: { version: 1, diagnostic: 3 },
      flags: {
        state: BFD_STATE.INIT,
        poll: 1,
        final: 0,
        controlPlaneIndependent: 1,
        authenticationPresent: 0,
        demand: 0,
        multipoint: 0,
      },
      detectMultiplier: 5,
      length: BFD_CONTROL_SIZE,
      myDiscriminator: 0xcafebabe,
      yourDiscriminator: 0xdeadbeef,
      desiredMinTxInterval: 200_000,
      requiredMinRxInterval: 200_000,
      requiredMinEchoRxInterval: 100_000,
    };

    const buffer = new Uint8Array(BFD_CONTROL_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, BFD_CONTROL_SIZE);
    assertEquals(read, BFD_CONTROL_SIZE);
    assertEquals(decoded, packet);
  });

  await t.step("decodes a known Down packet with final bit set", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x20, 0x50, 0x03, 0x18,
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x0f, 0x42, 0x40,
      0x00, 0x0f, 0x42, 0x40,
      0x00, 0x00, 0x00, 0x00,
    ]);

    const [decoded, read] = bfdControlPacket().decode(wire);

    assertEquals(read, BFD_CONTROL_SIZE);
    assertEquals(decoded.versionDiagnostic.version, 1);
    assertEquals(decoded.versionDiagnostic.diagnostic, 0);
    assertEquals(decoded.flags.state, BFD_STATE.DOWN);
    assertEquals(decoded.flags.final, 1);
    assertEquals(decoded.flags.poll, 0);
    assertEquals(decoded.detectMultiplier, 3);
    assertEquals(decoded.length, BFD_CONTROL_SIZE);
    assertEquals(decoded.myDiscriminator, 1);
    assertEquals(decoded.yourDiscriminator, 0);
    assertEquals(decoded.desiredMinTxInterval, 1_000_000);
    assertEquals(decoded.requiredMinRxInterval, 1_000_000);
    assertEquals(decoded.requiredMinEchoRxInterval, 0);
  });

  await t.step(
    "decodes a known Init packet with poll, CPI and diagnostic set",
    () => {
      // deno-fmt-ignore
      const wire = new Uint8Array([
        0x23, 0xa8, 0x05, 0x18,
        0xca, 0xfe, 0xba, 0xbe,
        0xde, 0xad, 0xbe, 0xef,
        0x00, 0x03, 0x0d, 0x40,
        0x00, 0x03, 0x0d, 0x40,
        0x00, 0x01, 0x86, 0xa0,
      ]);

      const [decoded, read] = bfdControlPacket().decode(wire);

      assertEquals(read, BFD_CONTROL_SIZE);
      assertEquals(decoded.versionDiagnostic.diagnostic, 3);
      assertEquals(decoded.flags.state, BFD_STATE.INIT);
      assertEquals(decoded.flags.poll, 1);
      assertEquals(decoded.flags.controlPlaneIndependent, 1);
      assertEquals(decoded.flags.authenticationPresent, 0);
      assertEquals(decoded.myDiscriminator, 0xcafebabe);
      assertEquals(decoded.yourDiscriminator, 0xdeadbeef);
      assertEquals(decoded.desiredMinTxInterval, 200_000);
      assertEquals(decoded.requiredMinEchoRxInterval, 100_000);
    },
  );

  await t.step("exports well-known constants", () => {
    assertEquals(BFD_CONTROL_SIZE, 24);
    assertEquals(BFD_PORT, 3784);
    assertEquals(BFD_STATE.ADMIN_DOWN, 0);
    assertEquals(BFD_STATE.DOWN, 1);
    assertEquals(BFD_STATE.INIT, 2);
    assertEquals(BFD_STATE.UP, 3);
  });
});
