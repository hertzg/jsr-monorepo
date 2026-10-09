import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftp } from "./ftp.ts";

Deno.test("ftp decodes every field the firmware writes", () => {
  const root = parse(
    '<Ftp version="1.1"><server>ftp.example.com</server><port>21</port>' +
      "<nonymous>0</nonymous><remoteDir>dir-abc123</remoteDir>" +
      "<userName>user-abc123</userName><password>pass-abc123</password>" +
      "<pwdMaxLen>127</pwdMaxLen><fileLen>30</fileLen><supportTest>1</supportTest>" +
      "<streamType>1</streamType><ftpVersion>2</ftpVersion><intervals>15</intervals>" +
      "<mode>3</mode><autoDir>1</autoDir><picPolicy>4</picPolicy>" +
      "<picName>pic-abc123</picName><picType>5</picType><picHeight>1080</picHeight>" +
      "<picWidth>1920</picWidth><picIntervals>60</picIntervals>" +
      "<videoPolicy>6</videoPolicy><videoName>video-abc123</videoName>" +
      "<onlyFtps>0</onlyFtps></Ftp>",
  ).root;

  assertEquals(ftp.decode(root), {
    server: "ftp.example.com",
    port: 21,
    nonymous: 0,
    remoteDir: "dir-abc123",
    userName: "user-abc123",
    password: "pass-abc123",
    pwdMaxLen: 127,
    fileLen: 30,
    supportTest: 1,
    streamType: 1,
    ftpVersion: 2,
    intervals: 15,
    mode: 3,
    autoDir: 1,
    picPolicy: 4,
    picName: "pic-abc123",
    picType: 5,
    picHeight: 1080,
    picWidth: 1920,
    picIntervals: 60,
    videoPolicy: 6,
    videoName: "video-abc123",
    onlyFtps: 0,
  });
});

Deno.test("ftp round-trips through encode and decode", () => {
  const value = {
    server: "server-rt",
    port: 990,
    nonymous: 1,
    remoteDir: "dir-rt",
    userName: "user-rt",
    password: "p&ss<rt>",
    fileLen: 10,
    supportTest: 0,
    streamType: 0,
    ftpVersion: 1,
    intervals: 20,
    mode: 1,
    bnameEncrypt: 1,
    autoDir: 0,
    picPolicy: 2,
    picName: "pic-rt",
    picType: 1,
    picHeight: 720,
    picWidth: 1280,
    picIntervals: 30,
    videoPolicy: 3,
    videoName: "video-rt",
    onlyFtps: 1,
  };

  assertEquals(ftp.decode(parse(ftp.encode(value)).root), value);
});

Deno.test("ftp writes bnameEncrypt between mode and autoDir", () => {
  assertEquals(
    ftp.encode({ mode: 1, bnameEncrypt: 0, autoDir: 1 }),
    '<Ftp version="1.1"><mode>1</mode><bnameEncrypt>0</bnameEncrypt>' +
      "<autoDir>1</autoDir></Ftp>",
  );
});
