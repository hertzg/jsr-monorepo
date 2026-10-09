import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { aiCfg } from "./ai-cfg.ts";

Deno.test("aiCfg decodes what the cmd 299 handler writes", () => {
  const root = parse(
    '<AiCfg version="1.1"><channelId>0</channelId><smartTrack>1</smartTrack>' +
      "<smartTrackMode>2</smartTrackMode>" +
      "<smartTrackModeAbility>3</smartTrackModeAbility>" +
      "<detectType>people,vehicle</detectType>" +
      "<smartTrackType>dog_cat</smartTrackType><smartTrackPt>4</smartTrackPt>" +
      "<smartTrackObjectStopDelay>5</smartTrackObjectStopDelay>" +
      "<smartTrackObjectDisappearDelay>6</smartTrackObjectDisappearDelay>" +
      "</AiCfg>",
  ).root;

  assertEquals(aiCfg.decode(root), {
    channelId: 0,
    smartTrack: 1,
    smartTrackMode: 2,
    smartTrackModeAbility: 3,
    detectType: "people,vehicle",
    smartTrackType: "dog_cat",
    smartTrackPt: 4,
    smartTrackObjectStopDelay: 5,
    smartTrackObjectDisappearDelay: 6,
  });
});

Deno.test("aiCfg decodes a reply without the delay fields", () => {
  const root = parse(
    '<AiCfg version="1.1"><channelId>0</channelId><smartTrack>0</smartTrack>' +
      "<smartTrackMode>0</smartTrackMode>" +
      "<smartTrackModeAbility>1</smartTrackModeAbility>" +
      "<detectType>none</detectType><smartTrackType>none</smartTrackType>" +
      "<smartTrackPt>0</smartTrackPt></AiCfg>",
  ).root;

  assertEquals(aiCfg.decode(root).smartTrackObjectStopDelay, undefined);
});

Deno.test("aiCfg round-trips every field", () => {
  const value = {
    channelId: 1,
    smartTrack: 1,
    smartTrackMode: 1,
    smartTrackModeAbility: 7,
    detectType: "face",
    smartTrackType: "people",
    smartTrackPt: 2,
    smartTrackObjectStopDelay: 10,
    smartTrackObjectDisappearDelay: 20,
  };

  assertEquals(aiCfg.decode(parse(aiCfg.encode(value)).root), value);
});
