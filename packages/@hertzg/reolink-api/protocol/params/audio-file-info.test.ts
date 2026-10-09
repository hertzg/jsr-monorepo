import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { audioFileInfo } from "./audio-file-info.ts";

Deno.test("audioFileInfo decodes the element nets_audio_file_info_s2x writes", () => {
  const root = parse(
    '<audioFileInfo version="1.1"><channelId>1</channelId>' +
      "<fileSize>64000</fileSize></audioFileInfo>",
  ).root;

  assertEquals(audioFileInfo.decode(root), { channelId: 1, fileSize: 64000 });
});

Deno.test("audioFileInfo decodes every field nets_param_audio_file_info_x2s reads", () => {
  const root = parse(
    '<audioFileInfo version="1.1"><channelId>0</channelId>' +
      "<fileSize>16000</fileSize><audioLen>5</audioLen>" +
      "<customName>doorbell chime</customName><id>3</id><timeout>30</timeout>" +
      "</audioFileInfo>",
  ).root;

  assertEquals(audioFileInfo.decode(root), {
    channelId: 0,
    fileSize: 16000,
    audioLen: 5,
    customName: "doorbell chime",
    id: 3,
    timeout: 30,
  });
});

Deno.test("audioFileInfo round-trips a full value", () => {
  const value = {
    channelId: 2,
    fileSize: 8000,
    audioLen: 4,
    customName: "Tom & Jerry",
    id: 7,
    timeout: 60,
  };

  assertEquals(
    audioFileInfo.decode(parse(audioFileInfo.encode(value)).root),
    value,
  );
});
