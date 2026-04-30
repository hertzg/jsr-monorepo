import { assertEquals, assertThrows } from "@std/assert";
import {
  detectPcapMagic,
  LINKTYPE,
  PCAP_MAGIC_MICROS,
  PCAP_MAGIC_NANOS,
  pcapFile,
  pcapFileWith,
  pcapGlobalHeader,
  pcapRecord,
} from "./mod.ts";
import type { PcapGlobalHeader, PcapRecord } from "./mod.ts";
import { refine } from "@hertzg/binstruct/refine";

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
