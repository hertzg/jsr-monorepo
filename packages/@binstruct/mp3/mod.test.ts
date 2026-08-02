import { assertEquals } from "@std/assert";
import {
  MP3_CHANNEL_MODE,
  MP3_FRAME_HEADER_SIZE,
  MP3_FRAME_SYNC,
  MP3_LAYER,
  MP3_MPEG_VERSION,
  type Mp3FrameHeader,
  mp3FrameHeader,
} from "./mod.ts";

Deno.test("mp3FrameHeader", async (t) => {
  await t.step("round-trips an MPEG-1 Layer III stereo header", () => {
    const coder = mp3FrameHeader();
    const header: Mp3FrameHeader = {
      frameSync: MP3_FRAME_SYNC,
      mpegVersion: MP3_MPEG_VERSION.MPEG_1,
      layer: MP3_LAYER.LAYER_3,
      protectionAbsent: 1,
      bitrateIndex: 9,
      samplingRateIndex: 0,
      padding: 0,
      privateBit: 0,
      channelMode: MP3_CHANNEL_MODE.STEREO,
      modeExtension: 0,
      copyright: 0,
      original: 0,
      emphasis: 0,
    };

    const buffer = new Uint8Array(MP3_FRAME_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, MP3_FRAME_HEADER_SIZE);
    assertEquals(read, MP3_FRAME_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step(
    "round-trips an MPEG-2 Layer II mono header with padding",
    () => {
      const coder = mp3FrameHeader();
      const header: Mp3FrameHeader = {
        frameSync: MP3_FRAME_SYNC,
        mpegVersion: MP3_MPEG_VERSION.MPEG_2,
        layer: MP3_LAYER.LAYER_2,
        protectionAbsent: 0,
        bitrateIndex: 5,
        samplingRateIndex: 2,
        padding: 1,
        privateBit: 1,
        channelMode: MP3_CHANNEL_MODE.MONO,
        modeExtension: 0,
        copyright: 1,
        original: 1,
        emphasis: 1,
      };

      const buffer = new Uint8Array(MP3_FRAME_HEADER_SIZE);
      const written = coder.encode(header, buffer);
      const [decoded, read] = coder.decode(buffer);

      assertEquals(written, MP3_FRAME_HEADER_SIZE);
      assertEquals(read, MP3_FRAME_HEADER_SIZE);
      assertEquals(decoded, header);
    },
  );

  await t.step("decodes a known MPEG-1 Layer III header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0xff, 0xfb, // frameSync + mpegVersion + layer + protectionAbsent
      0x90, // bitrateIndex + samplingRateIndex + padding + privateBit
      0x00, // channelMode + modeExtension + copyright + original + emphasis
    ]);

    const [decoded, read] = mp3FrameHeader().decode(wire);

    assertEquals(read, MP3_FRAME_HEADER_SIZE);
    assertEquals(decoded.frameSync, MP3_FRAME_SYNC);
    assertEquals(decoded.mpegVersion, MP3_MPEG_VERSION.MPEG_1);
    assertEquals(decoded.layer, MP3_LAYER.LAYER_3);
    assertEquals(decoded.protectionAbsent, 1);
    assertEquals(decoded.bitrateIndex, 9);
    assertEquals(decoded.samplingRateIndex, 0);
    assertEquals(decoded.padding, 0);
    assertEquals(decoded.privateBit, 0);
    assertEquals(decoded.channelMode, MP3_CHANNEL_MODE.STEREO);
    assertEquals(decoded.modeExtension, 0);
    assertEquals(decoded.copyright, 0);
    assertEquals(decoded.original, 0);
    assertEquals(decoded.emphasis, 0);
  });

  await t.step(
    "decodes a known MPEG-2.5 Layer I header with CRC present",
    () => {
      // deno-fmt-ignore
      const wire = new Uint8Array([
      0xff, 0xe0, // frameSync=0x7ff, mpegVersion=MPEG_2_5, layer=RESERVED, protectionAbsent=0
      0x00,
      0x00,
    ]);

      const [decoded, read] = mp3FrameHeader().decode(wire);

      assertEquals(read, MP3_FRAME_HEADER_SIZE);
      assertEquals(decoded.frameSync, MP3_FRAME_SYNC);
      assertEquals(decoded.mpegVersion, MP3_MPEG_VERSION.MPEG_2_5);
      assertEquals(decoded.layer, MP3_LAYER.RESERVED);
      assertEquals(decoded.protectionAbsent, 0);
    },
  );

  await t.step("frame sync is 11 bits of all ones", () => {
    assertEquals(MP3_FRAME_SYNC, 0b111_1111_1111);
    assertEquals(MP3_FRAME_SYNC, 0x7ff);
  });
});
