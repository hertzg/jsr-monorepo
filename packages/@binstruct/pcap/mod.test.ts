import { assertEquals, assertThrows } from "@std/assert";
import {
  detectPcapMagic,
  LINKTYPE,
  PCAP_DEFAULT_ENDIANNESS,
  PCAP_MAGIC_MICROS,
  PCAP_MAGIC_NANOS,
  pcapFile,
  pcapFileBe,
  pcapFileLe,
  pcapFileWith,
  pcapGlobalHeader,
  pcapRecord,
} from "./mod.ts";
import type { PcapGlobalHeader, PcapRecord } from "./mod.ts";
import { refine } from "@hertzg/binstruct/refine";
import { createContext } from "@hertzg/binstruct";

const GLOBAL_HEADER_SIZE = 24;
const RECORD_HEADER_SIZE = 16;

function sampleHeader(): PcapGlobalHeader {
  return {
    magic: PCAP_MAGIC_MICROS,
    versionMajor: 2,
    versionMinor: 4,
    thisZone: 0,
    sigFigs: 0,
    snapLen: 65535,
    network: LINKTYPE.ETHERNET,
  };
}

function sampleRecord(
  payload: Uint8Array,
  origLen = payload.length,
): PcapRecord {
  return {
    tsSec: 1_700_000_000,
    tsUsec: 123_456,
    inclLen: payload.length,
    origLen,
    data: payload,
  };
}

Deno.test("pcapGlobalHeader: little-endian round trip", () => {
  const coder = pcapGlobalHeader("le");
  const value = sampleHeader();

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  const written = coder.encode(value, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, GLOBAL_HEADER_SIZE);
  assertEquals(read, GLOBAL_HEADER_SIZE);
  assertEquals(decoded, value);
});

Deno.test("pcapGlobalHeader: big-endian round trip", () => {
  const coder = pcapGlobalHeader("be");
  const value = sampleHeader();

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  const written = coder.encode(value, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, GLOBAL_HEADER_SIZE);
  assertEquals(read, GLOBAL_HEADER_SIZE);
  assertEquals(decoded, value);
});

Deno.test("pcapGlobalHeader: byte order is reflected on the wire", () => {
  const value = sampleHeader();

  const leBuffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  pcapGlobalHeader("le").encode(value, leBuffer);
  assertEquals(
    leBuffer.subarray(0, 4),
    new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]),
  );

  const beBuffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  pcapGlobalHeader("be").encode(value, beBuffer);
  assertEquals(
    beBuffer.subarray(0, 4),
    new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]),
  );
});

Deno.test("pcapGlobalHeader: thisZone preserves negative values", () => {
  const coder = pcapGlobalHeader("le");
  const value = { ...sampleHeader(), thisZone: -3600 };

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  coder.encode(value, buffer);
  const [decoded] = coder.decode(buffer);

  assertEquals(decoded.thisZone, -3600);
});

Deno.test("pcapGlobalHeader: nanosecond magic round-trips", () => {
  const coder = pcapGlobalHeader("le");
  const value = { ...sampleHeader(), magic: PCAP_MAGIC_NANOS };

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  coder.encode(value, buffer);
  const [decoded] = coder.decode(buffer);

  assertEquals(decoded.magic, PCAP_MAGIC_NANOS);
});

Deno.test("pcapRecord: round trip preserves payload and lengths", () => {
  const coder = pcapRecord("le");
  const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x42]);
  const value = sampleRecord(payload, 1500);

  const buffer = new Uint8Array(64);
  const written = coder.encode(value, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, RECORD_HEADER_SIZE + payload.length);
  assertEquals(read, written);
  assertEquals(decoded.tsSec, value.tsSec);
  assertEquals(decoded.tsUsec, value.tsUsec);
  assertEquals(decoded.inclLen, payload.length);
  assertEquals(decoded.origLen, 1500);
  assertEquals(decoded.data, payload);
});

Deno.test("pcapRecord: zero-length payload is supported", () => {
  const coder = pcapRecord("be");
  const value = sampleRecord(new Uint8Array(0));

  const buffer = new Uint8Array(RECORD_HEADER_SIZE);
  const written = coder.encode(value, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, RECORD_HEADER_SIZE);
  assertEquals(read, RECORD_HEADER_SIZE);
  assertEquals(decoded.inclLen, 0);
  assertEquals(decoded.data.length, 0);
});

Deno.test("pcapFile: empty capture round trip", () => {
  const coder = pcapFile("le");
  const value = {
    header: sampleHeader(),
    records: [] as PcapRecord[],
  };

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  const written = coder.encode(value, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, GLOBAL_HEADER_SIZE);
  assertEquals(read, GLOBAL_HEADER_SIZE);
  assertEquals(decoded.records.length, 0);
});

Deno.test("pcapFile: multi-record little-endian round trip", () => {
  const coder = pcapFile("le");
  const records: PcapRecord[] = [
    sampleRecord(new Uint8Array([0x01])),
    sampleRecord(new Uint8Array([0x02, 0x03])),
    sampleRecord(new Uint8Array([0x04, 0x05, 0x06])),
  ];
  const value = { header: sampleHeader(), records };

  const buffer = new Uint8Array(256);
  const written = coder.encode(value, buffer);
  const trimmed = buffer.subarray(0, written);
  const [decoded, read] = coder.decode(trimmed);

  const expected = GLOBAL_HEADER_SIZE +
    records.reduce((sum, r) => sum + RECORD_HEADER_SIZE + r.data.length, 0);
  assertEquals(written, expected);
  assertEquals(read, expected);
  assertEquals(decoded.records.length, records.length);
  for (let i = 0; i < records.length; i++) {
    assertEquals(decoded.records[i].data, records[i].data);
  }
});

Deno.test("pcapFile: multi-record big-endian round trip", () => {
  const coder = pcapFile("be");
  const records: PcapRecord[] = [
    sampleRecord(new Uint8Array([0xaa, 0xbb])),
    sampleRecord(new Uint8Array([0xcc, 0xdd, 0xee, 0xff])),
  ];
  const value = { header: sampleHeader(), records };

  const buffer = new Uint8Array(128);
  const written = coder.encode(value, buffer);
  const [decoded] = coder.decode(buffer.subarray(0, written));

  assertEquals(decoded.records.length, 2);
  assertEquals(decoded.records[0].data, records[0].data);
  assertEquals(decoded.records[1].data, records[1].data);
});

Deno.test("pcapFile: encoded byte order matches endianness argument", () => {
  const value = {
    header: sampleHeader(),
    records: [] as PcapRecord[],
  };

  const leBuffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  pcapFile("le").encode(value, leBuffer);

  const beBuffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  pcapFile("be").encode(value, beBuffer);

  assertEquals(
    leBuffer.subarray(0, 4),
    new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]),
  );
  assertEquals(
    beBuffer.subarray(0, 4),
    new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]),
  );
});

Deno.test("detectPcapMagic: identifies all four on-disk magic encodings", () => {
  assertEquals(
    detectPcapMagic(new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4])),
    { endianness: "be", nanos: false },
  );
  assertEquals(
    detectPcapMagic(new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1])),
    { endianness: "le", nanos: false },
  );
  assertEquals(
    detectPcapMagic(new Uint8Array([0xa1, 0xb2, 0x3c, 0x4d])),
    { endianness: "be", nanos: true },
  );
  assertEquals(
    detectPcapMagic(new Uint8Array([0x4d, 0x3c, 0xb2, 0xa1])),
    { endianness: "le", nanos: true },
  );
});

Deno.test("detectPcapMagic: returns null for unknown bytes", () => {
  assertEquals(detectPcapMagic(new Uint8Array([0, 0, 0, 0])), null);
  assertEquals(
    detectPcapMagic(new Uint8Array([0xff, 0xff, 0xff, 0xff])),
    null,
  );
});

Deno.test("detectPcapMagic: respects buffer offset", () => {
  const backing = new Uint8Array([0xaa, 0xa1, 0xb2, 0xc3, 0xd4]);
  const view = backing.subarray(1);
  assertEquals(detectPcapMagic(view), { endianness: "be", nanos: false });
});

Deno.test("detectPcapMagic: agrees with what the file coder writes", () => {
  const value = {
    header: { ...sampleHeader(), magic: PCAP_MAGIC_NANOS },
    records: [] as PcapRecord[],
  };

  const leBuffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  pcapFile("le").encode(value, leBuffer);
  assertEquals(detectPcapMagic(leBuffer), { endianness: "le", nanos: true });

  const beBuffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  pcapFile("be").encode(value, beBuffer);
  assertEquals(detectPcapMagic(beBuffer), { endianness: "be", nanos: true });
});

Deno.test("pcapFileWith: composes with a refined record coder", () => {
  type RefinedRecord = Omit<PcapRecord, "data"> & { data: number[] };

  const refinedRecord = refine(pcapRecord("le"), {
    refine: (r: PcapRecord): RefinedRecord => ({
      ...r,
      data: Array.from(r.data),
    }),
    unrefine: (r: RefinedRecord): PcapRecord => ({
      ...r,
      data: new Uint8Array(r.data),
    }),
  });

  const coder = pcapFileWith(pcapGlobalHeader("le"), refinedRecord());
  const value = {
    header: sampleHeader(),
    records: [{
      tsSec: 1,
      tsUsec: 2,
      inclLen: 3,
      origLen: 3,
      data: [1, 2, 3],
    }] satisfies RefinedRecord[],
  };

  const buffer = new Uint8Array(64);
  const written = coder.encode(value, buffer);
  const [decoded] = coder.decode(buffer.subarray(0, written));

  assertEquals(decoded.records.length, 1);
  assertEquals(decoded.records[0].data, [1, 2, 3]);
});

Deno.test("pcapRecord: encoding without enough buffer throws", () => {
  const coder = pcapRecord("le");
  const value = sampleRecord(new Uint8Array(8));
  assertThrows(() => coder.encode(value, new Uint8Array(4)));
});

Deno.test("real-world fixture: Wireshark dns.cap", async () => {
  // Public sample capture from https://wiki.wireshark.org/SampleCaptures —
  // 38 Ethernet-framed DNS query/response packets, microsecond timestamps,
  // little-endian. Used here as a parity check against an untouched
  // third-party file, not for re-encode (we'd just be rewriting the file).
  const fixture = await Deno.readFile(
    new URL("./_fixtures/dns.cap", import.meta.url),
  );

  const magic = detectPcapMagic(fixture);
  assertEquals(magic, { endianness: "le", nanos: false });

  const [file, bytesRead] = pcapFile("le").decode(fixture);

  assertEquals(bytesRead, fixture.byteLength);

  assertEquals(file.header.magic, PCAP_MAGIC_MICROS);
  assertEquals(file.header.versionMajor, 2);
  assertEquals(file.header.versionMinor, 4);
  assertEquals(file.header.snapLen, 65535);
  assertEquals(file.header.network, LINKTYPE.ETHERNET);

  assertEquals(file.records.length, 38);
  assertEquals(file.records[0].inclLen, 70);
  assertEquals(file.records[0].origLen, 70);
  assertEquals(file.records[0].data.byteLength, 70);
  assertEquals(file.records[37].inclLen, 83);
  assertEquals(file.records[37].origLen, 83);
  assertEquals(file.records[37].data.byteLength, 83);

  // None of the packets in this capture were truncated by the snapshot length.
  for (const record of file.records) {
    assertEquals(record.inclLen, record.origLen);
    assertEquals(record.data.byteLength, record.inclLen);
  }
});

Deno.test("PCAP_DEFAULT_ENDIANNESS: is little-endian", () => {
  assertEquals(PCAP_DEFAULT_ENDIANNESS, "le");
});

Deno.test("pcapGlobalHeader: omitted endianness matches the default", () => {
  const value = sampleHeader();

  const implicit = new Uint8Array(GLOBAL_HEADER_SIZE);
  const explicit = new Uint8Array(GLOBAL_HEADER_SIZE);
  const written = pcapGlobalHeader().encode(value, implicit);
  pcapGlobalHeader(PCAP_DEFAULT_ENDIANNESS).encode(value, explicit);

  const [decoded, read] = pcapGlobalHeader().decode(implicit);

  assertEquals(implicit, explicit);
  assertEquals(written, GLOBAL_HEADER_SIZE);
  assertEquals(read, GLOBAL_HEADER_SIZE);
  assertEquals(decoded, value);
});

Deno.test("pcapRecord: omitted endianness matches the default", () => {
  const value = sampleRecord(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

  const implicit = new Uint8Array(64);
  const explicit = new Uint8Array(64);
  const written = pcapRecord().encode(value, implicit);
  pcapRecord(PCAP_DEFAULT_ENDIANNESS).encode(value, explicit);

  const [decoded, read] = pcapRecord().decode(implicit);

  assertEquals(implicit, explicit);
  assertEquals(written, RECORD_HEADER_SIZE + 4);
  assertEquals(read, RECORD_HEADER_SIZE + 4);
  assertEquals(decoded, value);
});

Deno.test("pcapFile: zero-argument encode uses the default endianness", () => {
  const value = {
    header: sampleHeader(),
    records: [sampleRecord(new Uint8Array([0x01, 0x02, 0x03]))],
  };

  const implicit = new Uint8Array(128);
  const explicit = new Uint8Array(128);
  const written = pcapFile().encode(value, implicit);
  const expected = pcapFile(PCAP_DEFAULT_ENDIANNESS).encode(value, explicit);

  assertEquals(written, expected);
  assertEquals(implicit, explicit);
  assertEquals(detectPcapMagic(implicit), {
    endianness: PCAP_DEFAULT_ENDIANNESS,
    nanos: false,
  });
});

Deno.test("pcapFile: zero-argument decode detects endianness from the magic", () => {
  const value = {
    header: sampleHeader(),
    records: [
      sampleRecord(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
      sampleRecord(new Uint8Array([0x11, 0x22]), 1500),
    ],
  };

  const auto = pcapFile();

  for (const endianness of ["le", "be"] as const) {
    const buffer = new Uint8Array(128);
    const written = pcapFile(endianness).encode(value, buffer);
    const encoded = buffer.subarray(0, written);

    assertEquals(detectPcapMagic(encoded)?.endianness, endianness);

    const [decoded, read] = auto.decode(encoded);

    assertEquals(read, written);
    assertEquals(decoded, value);
  }
});

Deno.test("pcapFile: zero-argument decode reads a nanosecond big-endian capture", () => {
  const value = {
    header: { ...sampleHeader(), magic: PCAP_MAGIC_NANOS },
    records: [sampleRecord(new Uint8Array([0xff]))],
  };

  const buffer = new Uint8Array(128);
  const written = pcapFile("be").encode(value, buffer);

  const [decoded] = pcapFile().decode(buffer.subarray(0, written));

  assertEquals(decoded, value);
  assertEquals(detectPcapMagic(buffer), { endianness: "be", nanos: true });
});

Deno.test("pcapFile: zero-argument decode falls back to the default on unknown magic", () => {
  const value = { header: { ...sampleHeader(), magic: 0 }, records: [] };

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  const written = pcapFile(PCAP_DEFAULT_ENDIANNESS).encode(value, buffer);

  assertEquals(detectPcapMagic(buffer), null);

  const [decoded] = pcapFile().decode(buffer.subarray(0, written));

  assertEquals(decoded, value);
});

Deno.test("pcapFile: zero-argument coder reads the dns.cap fixture", async () => {
  const fixture = await Deno.readFile(
    new URL("./_fixtures/dns.cap", import.meta.url),
  );

  const [auto, autoRead] = pcapFile().decode(fixture);
  const [explicit, explicitRead] = pcapFile("le").decode(fixture);

  assertEquals(autoRead, explicitRead);
  assertEquals(auto, explicit);
  assertEquals(auto.records.length, 38);
});

Deno.test("coder factories report an arity of zero", () => {
  // Zero-argument tooling gates on Function.length, and a `?` parameter counts
  // as 1 there even though `deno doc` calls it optional. See ADR 0002.
  assertEquals(pcapGlobalHeader.length, 0);
  assertEquals(pcapRecord.length, 0);
  assertEquals(pcapFile.length, 0);
  assertEquals(pcapFileLe.length, 0);
  assertEquals(pcapFileBe.length, 0);
});

Deno.test('pcapFileLe: encodes what pcapFile("le") encodes', () => {
  const value = {
    header: sampleHeader(),
    records: [sampleRecord(new Uint8Array([0x01, 0x02, 0x03]))],
  };

  const variant = new Uint8Array(128);
  const explicit = new Uint8Array(128);
  const written = pcapFileLe().encode(value, variant);
  const expected = pcapFile("le").encode(value, explicit);

  assertEquals(written, expected);
  assertEquals(variant, explicit);
  assertEquals(detectPcapMagic(variant), { endianness: "le", nanos: false });
});

Deno.test('pcapFileBe: encodes what pcapFile("be") encodes', () => {
  const value = {
    header: sampleHeader(),
    records: [sampleRecord(new Uint8Array([0x01, 0x02, 0x03]))],
  };

  const variant = new Uint8Array(128);
  const explicit = new Uint8Array(128);
  const written = pcapFileBe().encode(value, variant);
  const expected = pcapFile("be").encode(value, explicit);

  assertEquals(written, expected);
  assertEquals(variant, explicit);
  assertEquals(detectPcapMagic(variant), { endianness: "be", nanos: false });
});

Deno.test("pcapFileBe: multi-record round trip writes the big-endian magic", () => {
  const coder = pcapFileBe();
  const records = [
    sampleRecord(new Uint8Array([0xaa, 0xbb])),
    sampleRecord(new Uint8Array([0xcc, 0xdd, 0xee, 0xff]), 1500),
    sampleRecord(new Uint8Array(0)),
  ];
  const value = { header: sampleHeader(), records };

  const buffer = new Uint8Array(256);
  const written = coder.encode(value, buffer);
  const [decoded, read] = coder.decode(buffer.subarray(0, written));

  const expected = GLOBAL_HEADER_SIZE +
    records.reduce((sum, r) => sum + RECORD_HEADER_SIZE + r.data.length, 0);
  assertEquals(written, expected);
  assertEquals(read, expected);
  assertEquals(decoded, value);
  assertEquals(
    buffer.subarray(0, 4),
    new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]),
  );
});

Deno.test("pcapFileBe: re-encodes the dns.cap fixture big-endian and reads it back", async () => {
  const fixture = await Deno.readFile(
    new URL("./_fixtures/dns.cap", import.meta.url),
  );

  const [capture] = pcapFile().decode(fixture);

  const buffer = new Uint8Array(fixture.byteLength);
  const written = pcapFileBe().encode(capture, buffer);
  const encoded = buffer.subarray(0, written);

  assertEquals(written, fixture.byteLength);
  assertEquals(
    encoded.subarray(0, 4),
    new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]),
  );
  assertEquals(detectPcapMagic(encoded), { endianness: "be", nanos: false });

  const [reread, read] = pcapFileBe().decode(encoded);

  assertEquals(read, written);
  assertEquals(reread, capture);
});

Deno.test("pcapFileWith: keeps both coder arguments required", () => {
  assertEquals(pcapFileWith.length, 2);
});

Deno.test("pcapFile: zero-argument coder is usable as a struct field", () => {
  const value = { header: sampleHeader(), records: [] };

  const buffer = new Uint8Array(GLOBAL_HEADER_SIZE);
  const written = pcapFile().encode(value, buffer, createContext("encode"));
  const [decoded, read] = pcapFile().decode(
    buffer.subarray(0, written),
    createContext("decode"),
  );

  assertEquals(written, GLOBAL_HEADER_SIZE);
  assertEquals(read, GLOBAL_HEADER_SIZE);
  assertEquals(decoded, value);
});
