import { assertEquals } from "@std/assert";
import {
  IGMP_MESSAGE_SIZE,
  IGMP_TYPE,
  type IgmpMessage,
  igmpMessage,
} from "./mod.ts";

Deno.test("igmpMessage", async (t) => {
  await t.step("round-trips a general membership query", () => {
    const coder = igmpMessage();
    const message: IgmpMessage = {
      type: IGMP_TYPE.MEMBERSHIP_QUERY,
      maxResponseTime: 100,
      checksum: 0xee9b,
      groupAddress: 0,
    };

    const buffer = new Uint8Array(IGMP_MESSAGE_SIZE);
    const written = coder.encode(message, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, IGMP_MESSAGE_SIZE);
    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded, message);
  });

  await t.step("round-trips a group-specific query", () => {
    const coder = igmpMessage();
    const message: IgmpMessage = {
      type: IGMP_TYPE.MEMBERSHIP_QUERY,
      maxResponseTime: 50,
      checksum: 0x1234,
      groupAddress: 0xe0000001,
    };

    const buffer = new Uint8Array(IGMP_MESSAGE_SIZE);
    const written = coder.encode(message, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, IGMP_MESSAGE_SIZE);
    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded, message);
  });

  await t.step("round-trips a v2 membership report", () => {
    const coder = igmpMessage();
    const message: IgmpMessage = {
      type: IGMP_TYPE.V2_MEMBERSHIP_REPORT,
      maxResponseTime: 0,
      checksum: 0xabcd,
      groupAddress: 0xe0000005,
    };

    const buffer = new Uint8Array(IGMP_MESSAGE_SIZE);
    const written = coder.encode(message, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, IGMP_MESSAGE_SIZE);
    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded, message);
  });

  await t.step("round-trips a leave group message", () => {
    const coder = igmpMessage();
    const message: IgmpMessage = {
      type: IGMP_TYPE.LEAVE_GROUP,
      maxResponseTime: 0,
      checksum: 0x5678,
      groupAddress: 0xe000000a,
    };

    const buffer = new Uint8Array(IGMP_MESSAGE_SIZE);
    const written = coder.encode(message, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, IGMP_MESSAGE_SIZE);
    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded, message);
  });

  await t.step("decodes a known general query wire capture", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x11, 0x64, 0xee, 0x9b, // type=Query, maxResp=100, checksum
      0x00, 0x00, 0x00, 0x00, // groupAddress=0.0.0.0
    ]);

    const [decoded, read] = igmpMessage().decode(wire);

    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded.type, IGMP_TYPE.MEMBERSHIP_QUERY);
    assertEquals(decoded.maxResponseTime, 100);
    assertEquals(decoded.checksum, 0xee9b);
    assertEquals(decoded.groupAddress, 0);
  });

  await t.step("decodes a known v2 membership report wire capture", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x16, 0x00, 0x09, 0xfe, // type=V2Report, maxResp=0, checksum
      0xe0, 0x00, 0x00, 0x01, // groupAddress=224.0.0.1
    ]);

    const [decoded, read] = igmpMessage().decode(wire);

    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded.type, IGMP_TYPE.V2_MEMBERSHIP_REPORT);
    assertEquals(decoded.maxResponseTime, 0);
    assertEquals(decoded.checksum, 0x09fe);
    assertEquals(decoded.groupAddress, 0xe0000001);
  });

  await t.step("decodes a known leave group wire capture", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x17, 0x00, 0x08, 0xfa, // type=Leave, maxResp=0, checksum
      0xe0, 0x00, 0x00, 0x05, // groupAddress=224.0.0.5
    ]);

    const [decoded, read] = igmpMessage().decode(wire);

    assertEquals(read, IGMP_MESSAGE_SIZE);
    assertEquals(decoded.type, IGMP_TYPE.LEAVE_GROUP);
    assertEquals(decoded.maxResponseTime, 0);
    assertEquals(decoded.checksum, 0x08fa);
    assertEquals(decoded.groupAddress, 0xe0000005);
  });
});
