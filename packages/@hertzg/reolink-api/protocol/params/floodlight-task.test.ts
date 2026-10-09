import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { floodlightTask } from "./floodlight-task.ts";

Deno.test("floodlightTask decodes what the cmd 289 handler writes", () => {
  const root = parse(
    '<FloodlightTask version="1.1"><channel>0</channel><alarmMode>1</alarmMode>' +
      "<enable>1</enable><preview_auto>0</preview_auto><duration>60</duration>" +
      "<brightness_cur>80</brightness_cur><brightness_max>100</brightness_max>" +
      "<brightness_min>2</brightness_min>" +
      "<schedule><startHour>18</startHour><startMin>15</startMin>" +
      "<endHour>6</endHour><endMin>45</endMin></schedule>" +
      "<lightAlarmSchedule><startHour>21</startHour><startMin>10</startMin>" +
      "<endHour>5</endHour><endMin>50</endMin></lightAlarmSchedule>" +
      "<detectType>people,vehicle</detectType></FloodlightTask>",
  ).root;

  assertEquals(floodlightTask.decode(root), {
    channel: 0,
    alarmMode: 1,
    enable: 1,
    preview_auto: 0,
    duration: 60,
    brightness_cur: 80,
    brightness_max: 100,
    brightness_min: 2,
    schedule: { startHour: 18, startMin: 15, endHour: 6, endMin: 45 },
    lightAlarmSchedule: { startHour: 21, startMin: 10, endHour: 5, endMin: 50 },
    detectType: "people,vehicle",
  });
});

Deno.test("floodlightTask round-trips every field", () => {
  const value = {
    channel: 1,
    alarmMode: 0,
    enable: 0,
    preview_auto: 1,
    duration: 30,
    brightness_cur: 55,
    brightness_max: 90,
    brightness_min: 5,
    schedule: { startHour: 19, startMin: 1, endHour: 7, endMin: 2 },
    lightAlarmSchedule: { startHour: 22, startMin: 3, endHour: 4, endMin: 4 },
    detectType: "dog_cat",
  };

  assertEquals(
    floodlightTask.decode(parse(floodlightTask.encode(value)).root),
    value,
  );
});

Deno.test("floodlightTask writes only the fields that are set", () => {
  assertEquals(
    floodlightTask.encode({ channel: 0, schedule: { startHour: 20 } }),
    '<FloodlightTask version="1.1"><channel>0</channel>' +
      "<schedule><startHour>20</startHour></schedule></FloodlightTask>",
  );
});
