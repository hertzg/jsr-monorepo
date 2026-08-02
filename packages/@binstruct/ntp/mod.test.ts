import { assertEquals } from "@std/assert";
import {
  NTP_LEAP_INDICATOR,
  NTP_MODE,
  NTP_PACKET_SIZE,
  NTP_PORT,
  type NtpPacket,
  ntpPacket,
} from "./mod.ts";

Deno.test("ntpPacket", async (t) => {
  await t.step("constants", () => {
    assertEquals(NTP_PACKET_SIZE, 48);
    assertEquals(NTP_PORT, 123);
  });

  await t.step("round-trips a client request packet", () => {
    const coder = ntpPacket();
    const packet: NtpPacket = {
      leapVersionMode: {
        leapIndicator: NTP_LEAP_INDICATOR.NO_WARNING,
        version: 4,
        mode: NTP_MODE.CLIENT,
      },
      stratum: 0,
      poll: 4,
      precision: -20,
      rootDelay: 0,
      rootDispersion: 0,
      referenceId: 0,
      referenceTimestamp: 0n,
      originTimestamp: 0n,
      receiveTimestamp: 0n,
      transmitTimestamp: 0xe4c5c46700000000n,
    };

    const buffer = new Uint8Array(NTP_PACKET_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, NTP_PACKET_SIZE);
    assertEquals(read, NTP_PACKET_SIZE);
    assertEquals(decoded, packet);
  });

  await t.step("round-trips negative poll and precision exponents", () => {
    const coder = ntpPacket();
    const packet: NtpPacket = {
      leapVersionMode: {
        leapIndicator: NTP_LEAP_INDICATOR.UNSYNCHRONIZED,
        version: 4,
        mode: NTP_MODE.BROADCAST,
      },
      stratum: 16,
      poll: -6,
      precision: -32,
      rootDelay: 0xffffffff,
      rootDispersion: 0x7fffffff,
      referenceId: 0x7f000001,
      referenceTimestamp: 0x00000000ffffffffn,
      originTimestamp: 0xffffffffffffffffn,
      receiveTimestamp: 0x8000000000000000n,
      transmitTimestamp: 0x0102030405060708n,
    };

    const buffer = new Uint8Array(NTP_PACKET_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, NTP_PACKET_SIZE);
    assertEquals(read, NTP_PACKET_SIZE);
    assertEquals(decoded, packet);
  });

  await t.step("decodes a known 48-byte server response", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x24,                   // LI=0 VN=4 Mode=4 (server)
      0x01,                   // stratum = 1 (primary reference)
      0x04,                   // poll = 4
      0xec,                   // precision = -20
      0x00, 0x00, 0x00, 0x00, // rootDelay = 0
      0x00, 0x00, 0x00, 0x0a, // rootDispersion = 10
      0x47, 0x50, 0x53, 0x00, // referenceId = "GPS\0"
      0xe4, 0xc5, 0xc4, 0x60, 0x00, 0x00, 0x00, 0x00, // referenceTimestamp
      0xe4, 0xc5, 0xc4, 0x67, 0x00, 0x00, 0x00, 0x00, // originTimestamp
      0xe4, 0xc5, 0xc4, 0x67, 0x00, 0x00, 0x00, 0x00, // receiveTimestamp
      0xe4, 0xc5, 0xc4, 0x67, 0x80, 0x00, 0x00, 0x00, // transmitTimestamp
    ]);

    const [decoded, read] = ntpPacket().decode(wire);

    assertEquals(read, NTP_PACKET_SIZE);
    assertEquals(decoded.leapVersionMode, {
      leapIndicator: NTP_LEAP_INDICATOR.NO_WARNING,
      version: 4,
      mode: NTP_MODE.SERVER,
    });
    assertEquals(decoded.stratum, 1);
    assertEquals(decoded.poll, 4);
    assertEquals(decoded.precision, -20);
    assertEquals(decoded.rootDelay, 0);
    assertEquals(decoded.rootDispersion, 10);
    assertEquals(decoded.referenceId, 0x47505300);
    assertEquals(decoded.referenceTimestamp, 0xe4c5c46000000000n);
    assertEquals(decoded.originTimestamp, 0xe4c5c46700000000n);
    assertEquals(decoded.receiveTimestamp, 0xe4c5c46700000000n);
    assertEquals(decoded.transmitTimestamp, 0xe4c5c46780000000n);
  });

  await t.step("decodes a known 48-byte client request", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x1b,                   // LI=0 VN=3 Mode=3 (client)
      0x00,                   // stratum = 0 (unspecified)
      0x06,                   // poll = 6
      0xfa,                   // precision = -6
      0x00, 0x00, 0x00, 0x00, // rootDelay = 0
      0x00, 0x00, 0x00, 0x00, // rootDispersion = 0
      0x00, 0x00, 0x00, 0x00, // referenceId = 0
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // referenceTimestamp
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // originTimestamp
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // receiveTimestamp
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // transmitTimestamp
    ]);

    const [decoded, read] = ntpPacket().decode(wire);

    assertEquals(read, NTP_PACKET_SIZE);
    assertEquals(
      decoded.leapVersionMode.leapIndicator,
      NTP_LEAP_INDICATOR.NO_WARNING,
    );
    assertEquals(decoded.leapVersionMode.version, 3);
    assertEquals(decoded.leapVersionMode.mode, NTP_MODE.CLIENT);
    assertEquals(decoded.stratum, 0);
    assertEquals(decoded.poll, 6);
    assertEquals(decoded.precision, -6);
  });

  await t.step("mode constants match RFC 5905 §7.3", () => {
    assertEquals(NTP_MODE.CLIENT, 3);
    assertEquals(NTP_MODE.SERVER, 4);
    assertEquals(NTP_MODE.BROADCAST, 5);
  });
});
