import { assertEquals } from "@std/assert";
import { isElement, parse } from "@std/xml";
import { videoInput } from "./video-input.ts";

Deno.test("videoInput decodes the captured cmd 78 push without sharpen", () => {
  const root = parse(
    '<?xml version="1.0" encoding="UTF-8" ?>\n<body>\n' +
      '<VideoInput version="1.1">\n<channelId>0</channelId>\n' +
      "<bright>128</bright>\n<contrast>128</contrast>\n" +
      "<saturation>128</saturation>\n<hue>128</hue>\n</VideoInput>\n</body>\n",
  ).root;
  const [element] = root.children.filter(isElement);

  assertEquals(videoInput.decode(element), {
    channelId: 0,
    bright: 128,
    contrast: 128,
    saturation: 128,
    hue: 128,
  });
});

Deno.test("videoInput decodes every field nets_isp_base_s2x writes", () => {
  const root = parse(
    '<VideoInput version="1.1"><channelId>2</channelId><bright>101</bright>' +
      "<contrast>102</contrast><saturation>103</saturation><hue>104</hue>" +
      "<sharpen>105</sharpen></VideoInput>",
  ).root;

  assertEquals(videoInput.decode(root), {
    channelId: 2,
    bright: 101,
    contrast: 102,
    saturation: 103,
    hue: 104,
    sharpen: 105,
  });
});

Deno.test("videoInput round-trips a partial update", () => {
  const value = { channelId: 0, contrast: 90, sharpen: 140 };

  assertEquals(videoInput.decode(parse(videoInput.encode(value)).root), value);
});
