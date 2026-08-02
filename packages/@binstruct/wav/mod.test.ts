import { assertEquals, assertThrows } from "@std/assert";
import {
  dataChunk,
  factChunk,
  fmtChunk,
  listChunk,
  riffChunk,
  wavFile,
} from "./mod.ts";

Deno.test("WAV package - basic PCM encoding/decoding", () => {
  const wavCoder = wavFile();
  const testWav = {
    riff: {
      chunkId: "RIFF",
      chunkSize: 44,
      format: "WAVE",
    },
    fmt: {
      chunkId: "fmt ",
      chunkSize: 16,
      audioFormat: 1, // PCM
      numChannels: 1, // Mono
      sampleRate: 44100,
      byteRate: 88200,
      blockAlign: 2,
      bitsPerSample: 16,
      cbSize: 0,
    },
    data: {
      chunkId: "data",
      chunkSize: 1000,
      audioData: new Array(1000).fill(0),
    },
  };

  const buffer = new Uint8Array(2048);
  const bytesWritten = wavCoder.encode(testWav, buffer);
  const [decoded, _bytesRead] = wavCoder.decode(buffer);

  assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
  assertEquals(decoded.riff.chunkId, "RIFF");
  assertEquals(decoded.riff.format, "WAVE");
  assertEquals(decoded.fmt.audioFormat, 1);
  assertEquals(decoded.fmt.numChannels, 1);
  assertEquals(decoded.fmt.sampleRate, 44100);
  assertEquals(decoded.data.audioData.length, 1000); // Exactly chunkSize bytes
});

Deno.test("WAV package - IEEE float format", () => {
  const wavCoder = wavFile();
  const floatWav = {
    riff: {
      chunkId: "RIFF" as const,
      chunkSize: 58,
      format: "WAVE" as const,
    },
    fmt: {
      chunkId: "fmt " as const,
      chunkSize: 18,
      audioFormat: 3, // IEEE Float
      numChannels: 2, // Stereo
      sampleRate: 48000,
      byteRate: 384000,
      blockAlign: 8,
      bitsPerSample: 32,
      cbSize: 0,
    },
    data: {
      chunkId: "data" as const,
      chunkSize: 800,
      audioData: new Array(800).fill(0),
    },
  };

  const buffer = new Uint8Array(2048);
  const bytesWritten = wavCoder.encode(floatWav, buffer);
  const [decoded, _bytesRead] = wavCoder.decode(buffer);

  assertEquals(bytesWritten, 846); // 12 (RIFF) + 26 (fmt) + 808 (data)
  assertEquals(decoded.fmt.audioFormat, 3);
  assertEquals(decoded.fmt.numChannels, 2);
  assertEquals(decoded.fmt.sampleRate, 48000);
  assertEquals(decoded.data.audioData.length, 800); // Exactly chunkSize bytes
});

Deno.test("WAV package - multiple channel configurations", async (t) => {
  await t.step("mono configuration", () => {
    const wavCoder = wavFile();
    const monoWav = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1,
        numChannels: 1,
        sampleRate: 44100,
        byteRate: 44100,
        blockAlign: 1,
        bitsPerSample: 8,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 1000,
        audioData: new Array(1000).fill(0),
      },
    };

    const buffer = new Uint8Array(2048);
    const bytesWritten = wavCoder.encode(monoWav, buffer);
    const [decoded, _bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
    assertEquals(decoded.fmt.numChannels, 1);
    assertEquals(decoded.fmt.bitsPerSample, 8);
  });

  await t.step("stereo configuration", () => {
    const wavCoder = wavFile();
    const stereoWav = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1,
        numChannels: 2,
        sampleRate: 44100,
        byteRate: 176400,
        blockAlign: 4,
        bitsPerSample: 16,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 2000,
        audioData: new Array(2000).fill(0),
      },
    };

    const buffer = new Uint8Array(3000);
    const bytesWritten = wavCoder.encode(stereoWav, buffer);
    const [decoded, _bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 2046); // 12 (RIFF) + 26 (fmt) + 2008 (data)
    assertEquals(decoded.fmt.numChannels, 2);
    assertEquals(decoded.fmt.bitsPerSample, 16);
  });
});

Deno.test("WAV package - different sample rates", async (t) => {
  await t.step("8kHz sample rate", () => {
    const wavCoder = wavFile();
    const wav8k = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1,
        numChannels: 1,
        sampleRate: 8000,
        byteRate: 16000,
        blockAlign: 2,
        bitsPerSample: 16,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 1000,
        audioData: new Array(1000).fill(0),
      },
    };

    const buffer = new Uint8Array(2048);
    const bytesWritten = wavCoder.encode(wav8k, buffer);
    const [decoded, _bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
    assertEquals(decoded.fmt.sampleRate, 8000);
  });

  await t.step("44.1kHz sample rate", () => {
    const wavCoder = wavFile();
    const wav44k = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1,
        numChannels: 1,
        sampleRate: 44100,
        byteRate: 88200,
        blockAlign: 2,
        bitsPerSample: 16,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 1000,
        audioData: new Array(1000).fill(0),
      },
    };

    const buffer = new Uint8Array(2048);
    const bytesWritten = wavCoder.encode(wav44k, buffer);
    const [decoded, _bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
    assertEquals(decoded.fmt.sampleRate, 44100);
  });

  await t.step("48kHz sample rate", () => {
    const wavCoder = wavFile();
    const wav48k = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1,
        numChannels: 1,
        sampleRate: 48000,
        byteRate: 96000,
        blockAlign: 2,
        bitsPerSample: 16,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 1000,
        audioData: new Array(1000).fill(0),
      },
    };

    const buffer = new Uint8Array(2048);
    const bytesWritten = wavCoder.encode(wav48k, buffer);
    const [decoded, _bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
    assertEquals(decoded.fmt.sampleRate, 48000);
  });
});

Deno.test("WAV package - round-trip integrity", () => {
  const wavCoder = wavFile();

  // Create test audio data with a simple pattern
  const audioData = new Array(1000).fill(0);
  for (let i = 0; i < audioData.length; i++) {
    audioData[i] = i % 256;
  }

  const originalWav = {
    riff: {
      chunkId: "RIFF",
      chunkSize: 44,
      format: "WAVE",
    },
    fmt: {
      chunkId: "fmt ",
      chunkSize: 16,
      audioFormat: 1,
      numChannels: 1,
      sampleRate: 44100,
      byteRate: 88200,
      blockAlign: 2,
      bitsPerSample: 16,
      cbSize: 0,
    },
    data: {
      chunkId: "data",
      chunkSize: 1000,
      audioData: audioData,
    },
  };

  const buffer = new Uint8Array(2048);
  const bytesWritten = wavCoder.encode(originalWav, buffer);
  const [decoded, _bytesRead] = wavCoder.decode(buffer);

  assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
  assertEquals(decoded.riff.chunkId, originalWav.riff.chunkId);
  assertEquals(decoded.riff.chunkSize, originalWav.riff.chunkSize);
  assertEquals(decoded.riff.format, originalWav.riff.format);
  assertEquals(decoded.fmt.chunkId, originalWav.fmt.chunkId);
  assertEquals(decoded.fmt.audioFormat, originalWav.fmt.audioFormat);
  assertEquals(decoded.fmt.numChannels, originalWav.fmt.numChannels);
  assertEquals(decoded.fmt.sampleRate, originalWav.fmt.sampleRate);
  assertEquals(decoded.fmt.bitsPerSample, originalWav.fmt.bitsPerSample);
  assertEquals(decoded.data.chunkId, originalWav.data.chunkId);
  assertEquals(decoded.data.chunkSize, originalWav.data.chunkSize);
  assertEquals(decoded.data.audioData.length, 1000); // Exactly chunkSize bytes

  // Verify audio data integrity
  for (let i = 0; i < Math.min(100, audioData.length); i++) {
    assertEquals(
      decoded.data.audioData[i],
      originalWav.data.audioData[i],
      `Audio sample at index ${i} should match`,
    );
  }
});

Deno.test("WAV package - optional chunks", async (t) => {
  await t.step("basic WAV without optional chunks", () => {
    const wavCoder = wavFile();
    const basicWav = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1, // PCM
        numChannels: 1,
        sampleRate: 44100,
        byteRate: 88200,
        blockAlign: 2,
        bitsPerSample: 16,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 1000,
        audioData: new Array(1000).fill(0),
      },
    };

    const buffer = new Uint8Array(2048);
    const bytesWritten = wavCoder.encode(basicWav, buffer);
    const [decoded, _bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1046); // 12 (RIFF) + 26 (fmt) + 1008 (data)
    assertEquals(decoded.riff.chunkId, "RIFF");
    assertEquals(decoded.fmt.audioFormat, 1);
    assertEquals(decoded.data.audioData.length, 1000); // Exactly chunkSize bytes
  });
});

Deno.test("WAV package - individual chunk coders", async (t) => {
  await t.step("RIFF chunk coder", () => {
    const riffCoder = riffChunk();
    const testRiff = {
      chunkId: "RIFF" as const,
      chunkSize: 44,
      format: "WAVE" as const,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = riffCoder.encode(testRiff, buffer);
    const [decoded, bytesRead] = riffCoder.decode(buffer);

    assertEquals(bytesRead, 12);
    assertEquals(bytesWritten, 12);
    assertEquals(decoded.chunkId, "RIFF");
    assertEquals(decoded.chunkSize, 44);
    assertEquals(decoded.format, "WAVE");
  });

  await t.step("format chunk coder", () => {
    const fmtCoder = fmtChunk();
    const testFmt = {
      chunkId: "fmt " as const,
      chunkSize: 16,
      audioFormat: 1,
      numChannels: 2,
      sampleRate: 44100,
      byteRate: 176400,
      blockAlign: 4,
      bitsPerSample: 16,
      cbSize: 0,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = fmtCoder.encode(testFmt, buffer);
    const [decoded, bytesRead] = fmtCoder.decode(buffer);

    assertEquals(bytesRead, 26);
    assertEquals(bytesWritten, 26);
    assertEquals(decoded.chunkId, "fmt ");
    assertEquals(decoded.audioFormat, 1);
    assertEquals(decoded.numChannels, 2);
    assertEquals(decoded.sampleRate, 44100);
    assertEquals(decoded.bitsPerSample, 16);
  });

  await t.step("data chunk coder", () => {
    const dataCoder = dataChunk();
    const testData = {
      chunkId: "data",
      chunkSize: 1000,
      audioData: new Array(1000).fill(0),
    };

    const buffer = new Uint8Array(2048);
    const bytesWritten = dataCoder.encode(testData, buffer);
    const [decoded, _bytesRead] = dataCoder.decode(buffer);

    assertEquals(bytesWritten, 1008); // 4 (chunkId) + 4 (chunkSize) + 1000 (audioData)
    assertEquals(decoded.chunkId, "data");
    assertEquals(decoded.chunkSize, 1000);
    assertEquals(decoded.audioData.length, 1000); // Exactly chunkSize bytes
  });

  await t.step("fact chunk coder", () => {
    const factCoder = factChunk();
    const testFact = {
      chunkId: "fact",
      chunkSize: 4,
      sampleLength: 44100,
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = factCoder.encode(testFact, buffer);
    const [decoded, bytesRead] = factCoder.decode(buffer);

    assertEquals(bytesRead, 12);
    assertEquals(bytesWritten, 12);
    assertEquals(decoded.chunkId, "fact");
    assertEquals(decoded.chunkSize, 4);
    assertEquals(decoded.sampleLength, 44100);
  });

  await t.step("LIST chunk coder", () => {
    const listCoder = listChunk();
    const testList = {
      chunkId: "LIST",
      chunkSize: 20,
      listType: "INFO",
      data: new Array(16).fill(0),
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = listCoder.encode(testList, buffer);
    const [decoded, _bytesRead] = listCoder.decode(buffer);

    assertEquals(bytesWritten, 28); // 4 (chunkId) + 4 (chunkSize) + 4 (listType) + 16 (data)
    assertEquals(decoded.chunkId, "LIST");
    assertEquals(decoded.chunkSize, 20);
    assertEquals(decoded.listType, "INFO");
    assertEquals(decoded.data.length, 16); // chunkSize - 4 (listType)
  });
});

Deno.test("WAV package - error cases", async (t) => {
  await t.step("invalid buffer size", () => {
    const wavCoder = wavFile();
    const testWav = {
      riff: {
        chunkId: "RIFF",
        chunkSize: 44,
        format: "WAVE",
      },
      fmt: {
        chunkId: "fmt ",
        chunkSize: 16,
        audioFormat: 1,
        numChannels: 1,
        sampleRate: 44100,
        byteRate: 88200,
        blockAlign: 2,
        bitsPerSample: 16,
        cbSize: 0,
      },
      data: {
        chunkId: "data",
        chunkSize: 1000,
        audioData: new Array(1000).fill(0),
      },
    };

    const buffer = new Uint8Array(10); // Too small
    assertThrows(() => {
      wavCoder.encode(testWav, buffer);
    }, Error);
  });

  await t.step("malformed data", () => {
    const wavCoder = wavFile();
    const buffer = new Uint8Array(100);

    // Fill with invalid data
    buffer.fill(0xFF);

    assertThrows(() => {
      wavCoder.decode(buffer);
    }, Error);
  });
});

/**
 * A spec-correct 62-byte RIFF/WAVE file: 8 mono 16-bit PCM samples at 8 kHz.
 *
 * The `fmt ` chunk uses the 18-byte extended form (`cbSize` present) because
 * `fmtChunk()` always codes `cbSize`; see the note on that function.
 */
// deno-fmt-ignore
const wavFixture = (): Uint8Array => Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x36, 0x00, 0x00, 0x00, // chunkSize 54 (file size - 8)
  0x57, 0x41, 0x56, 0x45, // "WAVE"

  0x66, 0x6d, 0x74, 0x20, // "fmt "
  0x12, 0x00, 0x00, 0x00, // chunkSize 18
  0x01, 0x00,             // audioFormat 1 (PCM)
  0x01, 0x00,             // numChannels 1
  0x40, 0x1f, 0x00, 0x00, // sampleRate 8000
  0x80, 0x3e, 0x00, 0x00, // byteRate 16000
  0x02, 0x00,             // blockAlign 2
  0x10, 0x00,             // bitsPerSample 16
  0x00, 0x00,             // cbSize 0

  0x64, 0x61, 0x74, 0x61, // "data"
  0x10, 0x00, 0x00, 0x00, // chunkSize 16
  0x00, 0x00,             // sample 0
  0xe8, 0x03,             // sample 1000
  0x18, 0xfc,             // sample -1000
  0xff, 0x7f,             // sample 32767
  0x00, 0x80,             // sample -32768
  0x00, 0x01,             // sample 256
  0xff, 0xff,             // sample -1
  0x34, 0x12,             // sample 4660
]);

Deno.test("WAV package - decodes a real RIFF/WAVE byte fixture", () => {
  const fixture = wavFixture();
  const wavCoder = wavFile();
  const [decoded, bytesRead] = wavCoder.decode(fixture);

  assertEquals(bytesRead, fixture.length);

  assertEquals(decoded.riff, {
    chunkId: "RIFF",
    chunkSize: 54,
    format: "WAVE",
  });
  assertEquals(decoded.fmt, {
    chunkId: "fmt ",
    chunkSize: 18,
    audioFormat: 1,
    numChannels: 1,
    sampleRate: 8000,
    byteRate: 16000,
    blockAlign: 2,
    bitsPerSample: 16,
    cbSize: 0,
  });
  assertEquals(decoded.data.chunkId, "data");
  assertEquals(decoded.data.chunkSize, 16);
  // deno-fmt-ignore
  assertEquals(decoded.data.audioData, [
    0x00, 0x00, 0xe8, 0x03, 0x18, 0xfc, 0xff, 0x7f,
    0x00, 0x80, 0x00, 0x01, 0xff, 0xff, 0x34, 0x12,
  ]);
});

Deno.test("WAV package - re-encodes a real RIFF/WAVE byte fixture", () => {
  const fixture = wavFixture();
  const wavCoder = wavFile();
  const [decoded] = wavCoder.decode(fixture);

  const buffer = new Uint8Array(fixture.length);
  const bytesWritten = wavCoder.encode(decoded, buffer);

  assertEquals(bytesWritten, fixture.length);
  assertEquals(buffer, fixture);
});

Deno.test("WAV package - data chunk stops at chunkSize", () => {
  // deno-fmt-ignore
  const fixture = Uint8Array.from([
    0x64, 0x61, 0x74, 0x61, // "data"
    0x04, 0x00, 0x00, 0x00, // chunkSize 4
    0x01, 0x02, 0x03, 0x04, // audio samples
    0xde, 0xad, 0xbe, 0xef, // trailing bytes that belong to the next chunk
  ]);

  const dataCoder = dataChunk();
  const [decoded, bytesRead] = dataCoder.decode(fixture);

  assertEquals(bytesRead, 12);
  assertEquals(decoded.chunkId, "data");
  assertEquals(decoded.chunkSize, 4);
  assertEquals(decoded.audioData, [0x01, 0x02, 0x03, 0x04]);

  const buffer = new Uint8Array(12);
  const bytesWritten = dataCoder.encode(decoded, buffer);

  assertEquals(bytesWritten, 12);
  assertEquals(buffer, fixture.subarray(0, 12));
});

Deno.test("WAV package - LIST chunk payload excludes the list type", () => {
  // deno-fmt-ignore
  const fixture = Uint8Array.from([
    0x4c, 0x49, 0x53, 0x54, // "LIST"
    0x12, 0x00, 0x00, 0x00, // chunkSize 18 (listType + data)
    0x49, 0x4e, 0x46, 0x4f, // "INFO"
    0x49, 0x4e, 0x41, 0x4d, // "INAM"
    0x06, 0x00, 0x00, 0x00, // sub-chunk size 6
    0x54, 0x69, 0x74, 0x6c, // "Titl"
    0x65, 0x00,             // "e\0"
  ]);

  const listCoder = listChunk();
  const [decoded, bytesRead] = listCoder.decode(fixture);

  assertEquals(bytesRead, fixture.length);
  assertEquals(decoded.chunkId, "LIST");
  assertEquals(decoded.chunkSize, 18);
  assertEquals(decoded.listType, "INFO");
  assertEquals(decoded.data.length, 14); // chunkSize - 4 (listType)
  assertEquals(
    new TextDecoder().decode(Uint8Array.from(decoded.data.slice(8))),
    "Title\0",
  );

  const buffer = new Uint8Array(fixture.length);
  const bytesWritten = listCoder.encode(decoded, buffer);

  assertEquals(bytesWritten, fixture.length);
  assertEquals(buffer, fixture);
});
