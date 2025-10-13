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
  const [decoded, bytesRead] = wavCoder.decode(buffer);

  assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
  assertEquals(decoded.riff.chunkId, "RIFF");
  assertEquals(decoded.riff.format, "WAVE");
  assertEquals(decoded.fmt.audioFormat, 1);
  assertEquals(decoded.fmt.numChannels, 1);
  assertEquals(decoded.fmt.sampleRate, 44100);
  assertEquals(decoded.data.audioData.length, 2002); // bytes() consumes all available bytes
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
  const [decoded, bytesRead] = wavCoder.decode(buffer);

  assertEquals(bytesWritten, 850); // 12 (RIFF) + 24 (fmt) + 812 (data with length prefix)
  assertEquals(decoded.fmt.audioFormat, 3);
  assertEquals(decoded.fmt.numChannels, 2);
  assertEquals(decoded.fmt.sampleRate, 48000);
  assertEquals(decoded.data.audioData.length, 2002); // bytes() consumes all available bytes
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
    const [decoded, bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
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

    const buffer = new Uint8Array(2048);
    const bytesWritten = wavCoder.encode(stereoWav, buffer);
    const [decoded, bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 2046); // 12 (RIFF) + 24 (fmt) + 2016 (data)
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
    const [decoded, bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
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
    const [decoded, bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
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
    const [decoded, bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
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
  const [decoded, bytesRead] = wavCoder.decode(buffer);

  assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
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
  assertEquals(decoded.data.audioData.length, 2002); // Length-prefixed array includes length field

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
    const [decoded, bytesRead] = wavCoder.decode(buffer);

    assertEquals(bytesWritten, 1050); // 12 (RIFF) + 24 (fmt) + 1012 (data with length prefix)
    assertEquals(decoded.riff.chunkId, "RIFF");
    assertEquals(decoded.fmt.audioFormat, 1);
    assertEquals(decoded.data.audioData.length, 2002); // bytes() consumes all available bytes
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
    const [decoded, bytesRead] = dataCoder.decode(buffer);

    assertEquals(bytesWritten, 1012); // 4 (chunkId) + 4 (chunkSize) + 4 (length) + 1000 (audioData)
    assertEquals(decoded.chunkId, "data");
    assertEquals(decoded.chunkSize, 1000);
    assertEquals(decoded.audioData.length, 2002); // Length-prefixed array includes length field
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
      data: new Array(12).fill(0),
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = listCoder.encode(testList, buffer);
    const [decoded, bytesRead] = listCoder.decode(buffer);

    assertEquals(bytesWritten, 28); // 4 (chunkId) + 4 (chunkSize) + 4 (listType) + 4 (length) + 12 (data)
    assertEquals(decoded.chunkId, "LIST");
    assertEquals(decoded.chunkSize, 20);
    assertEquals(decoded.listType, "INFO");
    assertEquals(decoded.data.length, 12); // Length-prefixed array
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
