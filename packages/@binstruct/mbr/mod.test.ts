import { assertEquals } from "@std/assert";
import {
  MBR_BOOT_SIGNATURE,
  MBR_PARTITION_COUNT,
  MBR_PARTITION_TYPE,
  MBR_SIZE,
  type MbrSector,
  mbrSector,
  PARTITION_ENTRY_SIZE,
} from "./mod.ts";

const emptyEntry = {
  status: 0,
  chsFirst: new Uint8Array(3),
  partitionType: MBR_PARTITION_TYPE.EMPTY,
  chsLast: new Uint8Array(3),
  lbaFirstSector: 0,
  sectorCount: 0,
};

Deno.test("mbrSector", async (t) => {
  await t.step("round-trips a sector with all partitions empty", () => {
    const coder = mbrSector();
    const sector: MbrSector = {
      bootstrapCode: new Uint8Array(446),
      partitions: [emptyEntry, emptyEntry, emptyEntry, emptyEntry],
      bootSignature: MBR_BOOT_SIGNATURE,
    };

    const buffer = new Uint8Array(MBR_SIZE);
    const written = coder.encode(sector, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, MBR_SIZE);
    assertEquals(read, MBR_SIZE);
    assertEquals(decoded, sector);
  });

  await t.step("round-trips a sector with a bootable Linux partition", () => {
    const coder = mbrSector();
    const bootstrapCode = new Uint8Array(446);
    bootstrapCode[0] = 0xeb;
    bootstrapCode[1] = 0x63;
    bootstrapCode[2] = 0x90;

    const sector: MbrSector = {
      bootstrapCode,
      partitions: [
        {
          status: 0x80,
          chsFirst: new Uint8Array([0x00, 0x20, 0x21]),
          partitionType: MBR_PARTITION_TYPE.LINUX,
          chsLast: new Uint8Array([0xff, 0xfe, 0xff]),
          lbaFirstSector: 2048,
          sectorCount: 1048576,
        },
        {
          status: 0x00,
          chsFirst: new Uint8Array([0x00, 0x21, 0x22]),
          partitionType: MBR_PARTITION_TYPE.LINUX_SWAP,
          chsLast: new Uint8Array([0xff, 0xfe, 0xff]),
          lbaFirstSector: 1050624,
          sectorCount: 262144,
        },
        emptyEntry,
        emptyEntry,
      ],
      bootSignature: MBR_BOOT_SIGNATURE,
    };

    const buffer = new Uint8Array(MBR_SIZE);
    const written = coder.encode(sector, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, MBR_SIZE);
    assertEquals(read, MBR_SIZE);
    assertEquals(decoded, sector);
    assertEquals(decoded.partitions.length, MBR_PARTITION_COUNT);
    assertEquals(decoded.partitions[0].status, 0x80);
    assertEquals(decoded.partitions[0].sectorCount, 1048576);
  });

  await t.step(
    "decodes a known-bytes sector with an EFI protective partition",
    () => {
      const wire = new Uint8Array(MBR_SIZE);
      const entryOffset = 446;

      wire[entryOffset] = 0x00;
      wire[entryOffset + 4] = MBR_PARTITION_TYPE.EFI_PROTECTIVE;
      new DataView(wire.buffer).setUint32(entryOffset + 8, 1, true);
      new DataView(wire.buffer).setUint32(
        entryOffset + 12,
        0xffffffff,
        true,
      );
      new DataView(wire.buffer).setUint16(510, MBR_BOOT_SIGNATURE, true);

      const [decoded, read] = mbrSector().decode(wire);

      assertEquals(read, MBR_SIZE);
      assertEquals(
        decoded.partitions[0].partitionType,
        MBR_PARTITION_TYPE.EFI_PROTECTIVE,
      );
      assertEquals(decoded.partitions[0].lbaFirstSector, 1);
      assertEquals(decoded.partitions[0].sectorCount, 0xffffffff);
      assertEquals(decoded.partitions[1].partitionType, 0);
      assertEquals(decoded.partitions[2].partitionType, 0);
      assertEquals(decoded.partitions[3].partitionType, 0);
      assertEquals(decoded.bootSignature, MBR_BOOT_SIGNATURE);
    },
  );

  await t.step("decodes a known-bytes empty sector", () => {
    const wire = new Uint8Array(MBR_SIZE);
    wire[510] = 0x55;
    wire[511] = 0xaa;

    const [decoded, read] = mbrSector().decode(wire);

    assertEquals(read, MBR_SIZE);
    assertEquals(decoded.bootstrapCode.length, 446);
    assertEquals(decoded.partitions.length, MBR_PARTITION_COUNT);
    assertEquals(
      decoded.partitions.every((p) => p.partitionType === 0),
      true,
    );
    assertEquals(decoded.bootSignature, MBR_BOOT_SIGNATURE);
  });

  await t.step(
    "each partition entry occupies PARTITION_ENTRY_SIZE bytes",
    () => {
      const coder = mbrSector();
      const sector: MbrSector = {
        bootstrapCode: new Uint8Array(446),
        partitions: [emptyEntry, emptyEntry, emptyEntry, emptyEntry],
        bootSignature: MBR_BOOT_SIGNATURE,
      };

      const buffer = new Uint8Array(MBR_SIZE);
      coder.encode(sector, buffer);

      assertEquals(
        446 + PARTITION_ENTRY_SIZE * MBR_PARTITION_COUNT + 2,
        MBR_SIZE,
      );
    },
  );
});
