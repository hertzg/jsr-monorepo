import { assertEquals } from "@std/assert";
import {
  TAR_BLOCK_SIZE,
  TAR_TYPEFLAG,
  USTAR_MAGIC,
  USTAR_VERSION,
  type UstarHeader,
  ustarHeader,
} from "./mod.ts";

/**
 * Builds a 512-byte ustar header wire block by hand, independent of
 * {@linkcode ustarHeader}, so decode tests exercise the coder against the
 * format spec rather than against itself.
 */
function buildWireHeader(
  fields: {
    name: string;
    mode: string;
    uid: string;
    gid: string;
    size: string;
    mtime: string;
    checksum: string;
    typeflag: string;
    linkname: string;
    magic: string;
    version: string;
    uname: string;
    gname: string;
    devmajor: string;
    devminor: string;
    prefix: string;
  },
): Uint8Array {
  const block = new Uint8Array(TAR_BLOCK_SIZE);
  const encoder = new TextEncoder();
  const offsets: [keyof typeof fields, number][] = [
    ["name", 0],
    ["mode", 100],
    ["uid", 108],
    ["gid", 116],
    ["size", 124],
    ["mtime", 136],
    ["checksum", 148],
    ["typeflag", 156],
    ["linkname", 157],
    ["magic", 257],
    ["version", 263],
    ["uname", 265],
    ["gname", 297],
    ["devmajor", 329],
    ["devminor", 337],
    ["prefix", 345],
  ];

  for (const [key, offset] of offsets) {
    block.set(encoder.encode(fields[key]), offset);
  }

  return block;
}

Deno.test("ustarHeader", async (t) => {
  await t.step("round-trips a regular-file header", () => {
    const coder = ustarHeader();
    const header: UstarHeader = {
      name: "hello.txt",
      mode: 0o644,
      uid: 1000,
      gid: 1000,
      size: 5,
      mtime: 1_700_000_000,
      checksum: 0,
      typeflag: TAR_TYPEFLAG.regularFile,
      linkname: "",
      magic: USTAR_MAGIC,
      version: USTAR_VERSION,
      uname: "user",
      gname: "user",
      devmajor: "",
      devminor: "",
      prefix: "",
      padding: new Uint8Array(12),
    };

    const buffer = new Uint8Array(TAR_BLOCK_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, TAR_BLOCK_SIZE);
    assertEquals(read, TAR_BLOCK_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("round-trips a directory header with a long prefix", () => {
    const coder = ustarHeader();
    const header: UstarHeader = {
      name: "deeply/nested/directory",
      mode: 0o755,
      uid: 0,
      gid: 0,
      size: 0,
      mtime: 0,
      checksum: 0,
      typeflag: TAR_TYPEFLAG.directory,
      linkname: "",
      magic: USTAR_MAGIC,
      version: USTAR_VERSION,
      uname: "root",
      gname: "root",
      devmajor: "",
      devminor: "",
      prefix: "a/very/long/path/that/does/not/fit/in/the/name/field/alone",
      padding: new Uint8Array(12),
    };

    const buffer = new Uint8Array(TAR_BLOCK_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, TAR_BLOCK_SIZE);
    assertEquals(read, TAR_BLOCK_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("round-trips a symlink header", () => {
    const coder = ustarHeader();
    const header: UstarHeader = {
      name: "current",
      mode: 0o777,
      uid: 501,
      gid: 20,
      size: 0,
      mtime: 1_234_567,
      checksum: 0,
      typeflag: TAR_TYPEFLAG.symlink,
      linkname: "releases/42",
      magic: USTAR_MAGIC,
      version: USTAR_VERSION,
      uname: "deploy",
      gname: "deploy",
      devmajor: "",
      devminor: "",
      prefix: "",
      padding: new Uint8Array(12),
    };

    const buffer = new Uint8Array(TAR_BLOCK_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, TAR_BLOCK_SIZE);
    assertEquals(read, TAR_BLOCK_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("decodes a known regular-file header block", () => {
    const wire = buildWireHeader({
      name: "test.txt",
      mode: "0000644\0",
      uid: "0000000\0",
      gid: "0000000\0",
      size: "00000000003\0",
      mtime: "14524770400\0",
      checksum: "        ",
      typeflag: "0",
      linkname: "",
      magic: "ustar\0",
      version: "00",
      uname: "root",
      gname: "root",
      devmajor: "",
      devminor: "",
      prefix: "",
    });

    const [decoded, read] = ustarHeader().decode(wire);

    assertEquals(read, TAR_BLOCK_SIZE);
    assertEquals(decoded.name, "test.txt");
    assertEquals(decoded.mode, 0o644);
    assertEquals(decoded.uid, 0);
    assertEquals(decoded.gid, 0);
    assertEquals(decoded.size, 3);
    assertEquals(decoded.mtime, 1_700_000_000);
    assertEquals(decoded.checksum, 0);
    assertEquals(decoded.typeflag, TAR_TYPEFLAG.regularFile);
    assertEquals(decoded.linkname, "");
    assertEquals(decoded.magic, "ustar");
    assertEquals(decoded.version, "00");
    assertEquals(decoded.uname, "root");
    assertEquals(decoded.gname, "root");
    assertEquals(decoded.prefix, "");
  });

  await t.step("decodes a known hard-link header block", () => {
    const wire = buildWireHeader({
      name: "backup/report.pdf",
      mode: "0000440\0",
      uid: "0001000\0",
      gid: "0001000\0",
      size: "00000000000\0",
      mtime: "00000000000\0",
      checksum: "        ",
      typeflag: "1",
      linkname: "originals/report.pdf",
      magic: "ustar\0",
      version: "00",
      uname: "alice",
      gname: "staff",
      devmajor: "",
      devminor: "",
      prefix: "",
    });

    const [decoded, read] = ustarHeader().decode(wire);

    assertEquals(read, TAR_BLOCK_SIZE);
    assertEquals(decoded.name, "backup/report.pdf");
    assertEquals(decoded.mode, 0o440);
    assertEquals(decoded.uid, 512);
    assertEquals(decoded.gid, 512);
    assertEquals(decoded.size, 0);
    assertEquals(decoded.typeflag, TAR_TYPEFLAG.hardLink);
    assertEquals(decoded.linkname, "originals/report.pdf");
    assertEquals(decoded.uname, "alice");
    assertEquals(decoded.gname, "staff");
  });

  await t.step("magic and version match the ustar constants", () => {
    const buffer = new Uint8Array(TAR_BLOCK_SIZE);
    ustarHeader().encode({
      name: "f",
      mode: 0,
      uid: 0,
      gid: 0,
      size: 0,
      mtime: 0,
      checksum: 0,
      typeflag: TAR_TYPEFLAG.regularFile,
      linkname: "",
      magic: USTAR_MAGIC,
      version: USTAR_VERSION,
      uname: "",
      gname: "",
      devmajor: "",
      devminor: "",
      prefix: "",
      padding: new Uint8Array(12),
    }, buffer);

    assertEquals(
      new TextDecoder().decode(buffer.subarray(257, 263)),
      "ustar\0",
    );
    assertEquals(
      new TextDecoder().decode(buffer.subarray(263, 265)),
      "00",
    );
  });
});
