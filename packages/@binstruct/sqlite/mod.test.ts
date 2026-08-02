import { assertEquals } from "@std/assert";
import {
  SQLITE_HEADER_SIZE,
  SQLITE_MAGIC,
  SQLITE_TEXT_ENCODING,
  type SqliteHeader,
  sqliteHeader,
} from "./mod.ts";

Deno.test("sqliteHeader", async (t) => {
  await t.step("round-trips a freshly-created database header", () => {
    const coder = sqliteHeader();
    const header: SqliteHeader = {
      magic: SQLITE_MAGIC,
      pageSize: 4096,
      fileFormatWriteVersion: 1,
      fileFormatReadVersion: 1,
      reservedSpacePerPage: 0,
      maxEmbeddedPayloadFraction: 64,
      minEmbeddedPayloadFraction: 32,
      leafPayloadFraction: 32,
      fileChangeCounter: 1,
      databaseSizeInPages: 2,
      firstFreelistTrunkPage: 0,
      freelistPageCount: 0,
      schemaCookie: 1,
      schemaFormatNumber: 4,
      defaultPageCacheSize: 0,
      largestRootBtreePage: 0,
      textEncoding: SQLITE_TEXT_ENCODING.UTF8,
      userVersion: 0,
      incrementalVacuumMode: 0,
      applicationId: 0,
      reservedForExpansion: new Uint8Array(20),
      versionValidForNumber: 3045000,
      sqliteVersionNumber: 3045000,
    };

    const buffer = new Uint8Array(SQLITE_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, SQLITE_HEADER_SIZE);
    assertEquals(read, SQLITE_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("round-trips a WAL-mode header with vacuum enabled", () => {
    const coder = sqliteHeader();
    const header: SqliteHeader = {
      magic: SQLITE_MAGIC,
      pageSize: 8192,
      fileFormatWriteVersion: 2,
      fileFormatReadVersion: 2,
      reservedSpacePerPage: 0,
      maxEmbeddedPayloadFraction: 64,
      minEmbeddedPayloadFraction: 32,
      leafPayloadFraction: 32,
      fileChangeCounter: 42,
      databaseSizeInPages: 100,
      firstFreelistTrunkPage: 0,
      freelistPageCount: 0,
      schemaCookie: 7,
      schemaFormatNumber: 4,
      defaultPageCacheSize: 0,
      largestRootBtreePage: 5,
      textEncoding: SQLITE_TEXT_ENCODING.UTF16LE,
      userVersion: 3,
      incrementalVacuumMode: 1,
      applicationId: 0x4a534f4e,
      reservedForExpansion: new Uint8Array(20),
      versionValidForNumber: 3045000,
      sqliteVersionNumber: 3045001,
    };

    const buffer = new Uint8Array(SQLITE_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, SQLITE_HEADER_SIZE);
    assertEquals(read, SQLITE_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("decodes a known wire-format header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00, // magic
      0x10, 0x00, // pageSize = 4096
      0x01, // fileFormatWriteVersion
      0x01, // fileFormatReadVersion
      0x00, // reservedSpacePerPage
      0x40, // maxEmbeddedPayloadFraction = 64
      0x20, // minEmbeddedPayloadFraction = 32
      0x20, // leafPayloadFraction = 32
      0x00, 0x00, 0x00, 0x01, // fileChangeCounter = 1
      0x00, 0x00, 0x00, 0x02, // databaseSizeInPages = 2
      0x00, 0x00, 0x00, 0x00, // firstFreelistTrunkPage = 0
      0x00, 0x00, 0x00, 0x00, // freelistPageCount = 0
      0x00, 0x00, 0x00, 0x01, // schemaCookie = 1
      0x00, 0x00, 0x00, 0x04, // schemaFormatNumber = 4
      0x00, 0x00, 0x00, 0x00, // defaultPageCacheSize = 0
      0x00, 0x00, 0x00, 0x00, // largestRootBtreePage = 0
      0x00, 0x00, 0x00, 0x01, // textEncoding = UTF8
      0x00, 0x00, 0x00, 0x00, // userVersion = 0
      0x00, 0x00, 0x00, 0x00, // incrementalVacuumMode = 0
      0x00, 0x00, 0x00, 0x00, // applicationId = 0
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reservedForExpansion
      0x00, 0x2e, 0x76, 0x88, // versionValidForNumber = 3045000
      0x00, 0x2e, 0x76, 0x88, // sqliteVersionNumber = 3045000
    ]);

    const [decoded, read] = sqliteHeader().decode(wire);

    assertEquals(read, SQLITE_HEADER_SIZE);
    assertEquals(decoded.magic, SQLITE_MAGIC);
    assertEquals(decoded.pageSize, 4096);
    assertEquals(decoded.fileFormatWriteVersion, 1);
    assertEquals(decoded.fileFormatReadVersion, 1);
    assertEquals(decoded.maxEmbeddedPayloadFraction, 64);
    assertEquals(decoded.minEmbeddedPayloadFraction, 32);
    assertEquals(decoded.leafPayloadFraction, 32);
    assertEquals(decoded.fileChangeCounter, 1);
    assertEquals(decoded.databaseSizeInPages, 2);
    assertEquals(decoded.schemaCookie, 1);
    assertEquals(decoded.schemaFormatNumber, 4);
    assertEquals(decoded.textEncoding, SQLITE_TEXT_ENCODING.UTF8);
    assertEquals(decoded.versionValidForNumber, 3045000);
    assertEquals(decoded.sqliteVersionNumber, 3045000);
    assertEquals(decoded.reservedForExpansion, new Uint8Array(20));
  });

  await t.step("magic matches the ASCII bytes SQLite format 3\\0", () => {
    const buffer = new Uint8Array(SQLITE_HEADER_SIZE);
    sqliteHeader().encode({
      magic: SQLITE_MAGIC,
      pageSize: 4096,
      fileFormatWriteVersion: 1,
      fileFormatReadVersion: 1,
      reservedSpacePerPage: 0,
      maxEmbeddedPayloadFraction: 64,
      minEmbeddedPayloadFraction: 32,
      leafPayloadFraction: 32,
      fileChangeCounter: 0,
      databaseSizeInPages: 1,
      firstFreelistTrunkPage: 0,
      freelistPageCount: 0,
      schemaCookie: 0,
      schemaFormatNumber: 4,
      defaultPageCacheSize: 0,
      largestRootBtreePage: 0,
      textEncoding: SQLITE_TEXT_ENCODING.UTF8,
      userVersion: 0,
      incrementalVacuumMode: 0,
      applicationId: 0,
      reservedForExpansion: new Uint8Array(20),
      versionValidForNumber: 0,
      sqliteVersionNumber: 0,
    }, buffer);

    assertEquals(
      new TextDecoder().decode(buffer.subarray(0, 16)),
      "SQLite format 3\0",
    );
  });
});
