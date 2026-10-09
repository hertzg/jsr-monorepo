import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { net3g4gModuleInfo } from "./net3g4g-module-info.ts";

Deno.test("net3g4gModuleInfo decodes the reply net_4g_module_info_s2x writes", () => {
  const root = parse(
    '<Net3g4gModuleInfo version="1.1"><iccid>iccid-8944500000000000001</iccid>' +
      "<imei>imei-356938035643809</imei><phoneNumber>phone-15550001111</phoneNumber>" +
      "</Net3g4gModuleInfo>",
  ).root;

  assertEquals(net3g4gModuleInfo.decode(root), {
    iccid: "iccid-8944500000000000001",
    imei: "imei-356938035643809",
    phoneNumber: "phone-15550001111",
  });
});

Deno.test("net3g4gModuleInfo round-trips a full value", () => {
  const value = {
    iccid: "8937204016201234567",
    imei: "352099001761481",
    phoneNumber: "+995555123456",
  };

  assertEquals(
    net3g4gModuleInfo.decode(parse(net3g4gModuleInfo.encode(value)).root),
    value,
  );
});

Deno.test("net3g4gModuleInfo reads empty identifiers as empty strings", () => {
  const root = parse(
    '<Net3g4gModuleInfo version="1.1"><iccid></iccid><imei>352099001761481</imei>' +
      "<phoneNumber></phoneNumber></Net3g4gModuleInfo>",
  ).root;

  assertEquals(net3g4gModuleInfo.decode(root), {
    iccid: "",
    imei: "352099001761481",
    phoneNumber: "",
  });
});
