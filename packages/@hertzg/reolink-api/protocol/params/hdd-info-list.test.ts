import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { hddInfoList } from "./hdd-info-list.ts";

Deno.test("hddInfoList decodes two devices in order", () => {
  const root = parse(
    '<HddInfoList version="1.1">' +
      "<HddInfo><number>0</number><capacity>119</capacity><capacityM>256</capacityM>" +
      "<format>1</format><mount>1</mount><remainSize>80</remainSize>" +
      "<remainSizeM>512</remainSizeM></HddInfo>" +
      "<HddInfo><number>101</number><capacity>931</capacity><capacityM>7</capacityM>" +
      "<format>0</format><mount>0</mount><remainSize>930</remainSize>" +
      "<remainSizeM>9</remainSizeM></HddInfo>" +
      "</HddInfoList>",
  ).root;

  assertEquals(hddInfoList.decode(root), {
    HddInfo: [
      {
        number: 0,
        capacity: 119,
        capacityM: 256,
        format: 1,
        mount: 1,
        remainSize: 80,
        remainSizeM: 512,
      },
      {
        number: 101,
        capacity: 931,
        capacityM: 7,
        format: 0,
        mount: 0,
        remainSize: 930,
        remainSizeM: 9,
      },
    ],
  });
});

Deno.test("hddInfoList round-trips through encode and decode", () => {
  const value = {
    HddInfo: [{
      number: 1,
      capacity: 2,
      capacityM: 3,
      format: 4,
      mount: 5,
      remainSize: 6,
      remainSizeM: 7,
    }],
  };

  assertEquals(
    hddInfoList.decode(parse(hddInfoList.encode(value)).root),
    value,
  );
});

Deno.test("hddInfoList decodes a list without devices as empty", () => {
  const root = parse('<HddInfoList version="1.1"></HddInfoList>').root;

  assertEquals(hddInfoList.decode(root), { HddInfo: [] });
});
