import { assertEquals } from "@std/assert";
import {
  TPID_8021Q,
  VLAN_ID_PRIORITY_TAGGED,
  VLAN_ID_RESERVED,
  VLAN_TAG_SIZE,
  type VlanTag,
  vlanTag,
} from "./mod.ts";

Deno.test("vlanTag", async (t) => {
  await t.step("round-trips a tag with an IPv4 payload", () => {
    const coder = vlanTag();
    const tag: VlanTag = {
      tci: { pcp: 5, dei: 0, vlanId: 100 },
      etherType: 0x0800,
      payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
    };

    const buffer = new Uint8Array(VLAN_TAG_SIZE + tag.payload.length);
    const written = coder.encode(tag, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, VLAN_TAG_SIZE + tag.payload.length);
    assertEquals(read, written);
    assertEquals(decoded, tag);
  });

  await t.step("round-trips the drop-eligible bit and an empty payload", () => {
    const coder = vlanTag();
    const tag: VlanTag = {
      tci: { pcp: 0, dei: 1, vlanId: 4000 },
      etherType: 0x86dd,
      payload: new Uint8Array(0),
    };

    const buffer = new Uint8Array(VLAN_TAG_SIZE);
    const written = coder.encode(tag, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, VLAN_TAG_SIZE);
    assertEquals(read, VLAN_TAG_SIZE);
    assertEquals(decoded, tag);
  });

  await t.step("decodes known wire bytes for VID 100, priority 5", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0xa0, 0x64, // pcp=5, dei=0, vlanId=100
      0x08, 0x00, // etherType = IPv4
      0x45, 0x00, 0x00, 0x14,
    ]);

    const [decoded, read] = vlanTag().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.tci, { pcp: 5, dei: 0, vlanId: 100 });
    assertEquals(decoded.etherType, 0x0800);
    assertEquals(decoded.payload, new Uint8Array([0x45, 0x00, 0x00, 0x14]));
  });

  await t.step("decodes known wire bytes for a priority-tagged frame", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0xe0, 0x00, // pcp=7, dei=0, vlanId=0 (priority-tagged)
      0x08, 0x06, // etherType = ARP
    ]);

    const [decoded, read] = vlanTag().decode(wire);

    assertEquals(read, VLAN_TAG_SIZE);
    assertEquals(decoded.tci.pcp, 7);
    assertEquals(decoded.tci.dei, 0);
    assertEquals(decoded.tci.vlanId, VLAN_ID_PRIORITY_TAGGED);
    assertEquals(decoded.etherType, 0x0806);
    assertEquals(decoded.payload.length, 0);
  });

  await t.step("round-trips the reserved vlanId", () => {
    const coder = vlanTag();
    const tag: VlanTag = {
      tci: { pcp: 0, dei: 0, vlanId: VLAN_ID_RESERVED },
      etherType: 0x0800,
      payload: new Uint8Array(0),
    };

    const buffer = new Uint8Array(VLAN_TAG_SIZE);
    coder.encode(tag, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.tci.vlanId, VLAN_ID_RESERVED);
  });

  await t.step("TPID_8021Q matches the IEEE 802.1Q EtherType", () => {
    assertEquals(TPID_8021Q, 0x8100);
  });
});
