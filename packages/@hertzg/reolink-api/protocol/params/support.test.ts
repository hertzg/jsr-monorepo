import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { support } from "./support.ts";

Deno.test("support decodes an RLC-823A cmd 199 reply in serializer order", () => {
  const root = parse(
    '<Support version="1.1"><IOInputPortNum>1</IOInputPortNum>' +
      "<IOOutputPortNum>2</IOOutputPortNum><diskNum>3</diskNum>" +
      "<channelNum>4</channelNum><audioNum>5</audioNum><ptzMode>pt</ptzMode>" +
      "<ptzCfg>6</ptzCfg><B485>7</B485><autoUpdate>8</autoUpdate>" +
      "<pushAlarm>9</pushAlarm><ftp>10</ftp><ftpTest>11</ftpTest>" +
      "<email>12</email><wifi>13</wifi><record>14</record>" +
      "<wifiTest>15</wifiTest><rtsp>16</rtsp><onvif>17</onvif>" +
      "<audioTalk>18</audioTalk><rfVersion>19</rfVersion><rtmp>20</rtmp>" +
      "<noExternStream>21</noExternStream><timeFormat>22</timeFormat>" +
      "<ddnsVersion>23</ddnsVersion><emailVersion>24</emailVersion>" +
      "<pushVersion>25</pushVersion><pushType>26</pushType>" +
      "<audioAlarm>27</audioAlarm><apMode>28</apMode>" +
      "<cloudVersion>29</cloudVersion><replayVersion>30</replayVersion>" +
      "<mobComVersion>31</mobComVersion><ExportImport>32</ExportImport>" +
      "<languageVer>33</languageVer><videoStandard>34</videoStandard>" +
      "<syncTime>35</syncTime><netPort>36</netPort><nasVersion>37</nasVersion>" +
      "<needReboot>38</needReboot><reboot>39</reboot><audioCfg>40</audioCfg>" +
      "<networkDiagnosis>41</networkDiagnosis><loginLocked>42</loginLocked>" +
      "<wifiVersion>43</wifiVersion><previewVersion>44</previewVersion>" +
      "<netSecurity>45</netSecurity><IOTLink>46</IOTLink>" +
      "<IOTLinkActionMax>47</IOTLinkActionMax><autoTest>48</autoTest>" +
      "<recordCfg>49</recordCfg>" +
      "<smartHome><version>1</version>" +
      "<item><name>googleHome</name><ver>50</ver></item>" +
      "<item><name>amazonAlexa</name><ver>51</ver></item></smartHome>" +
      "<item><chnID>0</chnID><ptzType>101</ptzType><rfCfg>102</rfCfg>" +
      "<noAudio>103</noAudio><autoFocus>104</autoFocus><videoClip>105</videoClip>" +
      "<battery>106</battery><ispCfg>107</ispCfg><osdCfg>108</osdCfg>" +
      "<batAnalysis>109</batAnalysis><dynamicReso>110</dynamicReso>" +
      "<audioVersion>111</audioVersion><ledCtrl>112</ledCtrl>" +
      "<ptzControl>113</ptzControl><newIspCfg>114</newIspCfg>" +
      "<ptzPreset>115</ptzPreset><ptzPatrol>116</ptzPatrol>" +
      "<ptzTattern>117</ptzTattern><autoPt>118</autoPt>" +
      "<h264Profile>119</h264Profile><motion>120</motion><aitype>121</aitype>" +
      "<aiAnimalType>122</aiAnimalType><timelapse>123</timelapse>" +
      "<snap>124</snap><encCtrl>125</encCtrl><zfBacklash>126</zfBacklash>" +
      "<IOTLinkAbility>127</IOTLinkAbility><ipcAudioTalk>128</ipcAudioTalk>" +
      "<shelter>0</shelter><thumbnail>129</thumbnail></item>" +
      "</Support>",
  ).root;

  assertEquals(support.decode(root), {
    IOInputPortNum: 1,
    IOOutputPortNum: 2,
    diskNum: 3,
    channelNum: 4,
    audioNum: 5,
    ptzMode: "pt",
    ptzCfg: 6,
    B485: 7,
    autoUpdate: 8,
    pushAlarm: 9,
    ftp: 10,
    ftpTest: 11,
    email: 12,
    wifi: 13,
    record: 14,
    wifiTest: 15,
    rtsp: 16,
    onvif: 17,
    audioTalk: 18,
    rfVersion: 19,
    rtmp: 20,
    noExternStream: 21,
    timeFormat: 22,
    ddnsVersion: 23,
    emailVersion: 24,
    pushVersion: 25,
    pushType: 26,
    audioAlarm: 27,
    apMode: 28,
    cloudVersion: 29,
    replayVersion: 30,
    mobComVersion: 31,
    ExportImport: 32,
    languageVer: 33,
    videoStandard: 34,
    syncTime: 35,
    netPort: 36,
    nasVersion: 37,
    needReboot: 38,
    reboot: 39,
    audioCfg: 40,
    networkDiagnosis: 41,
    loginLocked: 42,
    wifiVersion: 43,
    previewVersion: 44,
    netSecurity: 45,
    IOTLink: 46,
    IOTLinkActionMax: 47,
    autoTest: 48,
    recordCfg: 49,
    smartHome: {
      version: 1,
      item: [
        { name: "googleHome", ver: 50 },
        { name: "amazonAlexa", ver: 51 },
      ],
    },
    item: [{
      chnID: 0,
      ptzType: 101,
      rfCfg: 102,
      noAudio: 103,
      autoFocus: 104,
      videoClip: 105,
      battery: 106,
      ispCfg: 107,
      osdCfg: 108,
      batAnalysis: 109,
      dynamicReso: 110,
      audioVersion: 111,
      ledCtrl: 112,
      ptzControl: 113,
      newIspCfg: 114,
      ptzPreset: 115,
      ptzPatrol: 116,
      ptzTattern: 117,
      autoPt: 118,
      h264Profile: 119,
      motion: 120,
      aitype: 121,
      aiAnimalType: 122,
      timelapse: 123,
      snap: 124,
      encCtrl: 125,
      zfBacklash: 126,
      IOTLinkAbility: 127,
      ipcAudioTalk: 128,
      shelter: 0,
      thumbnail: 129,
    }],
  });
});

Deno.test("support reads an empty smartHome as no assistants", () => {
  const parent = parse("<p><smartHome></smartHome></p>").root;

  assertEquals(support.fields.smartHome.decode("smartHome", parent), {
    item: [],
  });
});

Deno.test("support keeps channel items apart from smartHome items", () => {
  const xml = support.encode({
    IOInputPortNum: 0,
    IOOutputPortNum: 0,
    diskNum: 0,
    channelNum: 1,
    audioNum: 0,
    ptzMode: "none",
    ptzCfg: 0,
    B485: 0,
    autoUpdate: 0,
    pushAlarm: 0,
    ftp: 0,
    ftpTest: 0,
    email: 0,
    wifi: 0,
    record: 0,
    wifiTest: 0,
    rtsp: 0,
    onvif: 0,
    audioTalk: 0,
    rfVersion: 0,
    rtmp: 0,
    noExternStream: 0,
    timeFormat: 0,
    ddnsVersion: 0,
    emailVersion: 0,
    pushVersion: 0,
    pushType: 0,
    audioAlarm: 0,
    apMode: 0,
    cloudVersion: 0,
    replayVersion: 0,
    mobComVersion: 0,
    ExportImport: 0,
    languageVer: 0,
    videoStandard: 0,
    syncTime: 0,
    netPort: 0,
    nasVersion: 0,
    needReboot: 0,
    reboot: 0,
    audioCfg: 0,
    networkDiagnosis: 0,
    loginLocked: 0,
    wifiVersion: 0,
    previewVersion: 0,
    netSecurity: 0,
    IOTLink: 0,
    IOTLinkActionMax: 0,
    autoTest: 0,
    smartHome: { item: [{ name: "amazonAlexa", ver: 3 }] },
    item: [{
      chnID: 7,
      ptzType: 0,
      rfCfg: 0,
      noAudio: 0,
      autoFocus: 0,
      videoClip: 0,
      battery: 0,
      ispCfg: 0,
      osdCfg: 0,
      batAnalysis: 0,
      dynamicReso: 0,
      audioVersion: 0,
      ledCtrl: 0,
      ptzControl: 0,
      newIspCfg: 0,
      ptzPreset: 0,
      ptzPatrol: 0,
      ptzTattern: 0,
      autoPt: 0,
      h264Profile: 0,
      motion: 0,
      aitype: 0,
      aiAnimalType: 0,
      timelapse: 0,
      snap: 0,
      encCtrl: 0,
      zfBacklash: 0,
      IOTLinkAbility: 0,
      thumbnail: 0,
    }],
  });

  assertEquals(support.decode(parse(xml).root).item.map((i) => i.chnID), [7]);
});

Deno.test("support rejects an unknown ptz mode", () => {
  const parent = parse("<p><ptzMode>zoom</ptzMode></p>").root;

  assertThrows(
    () => support.fields.ptzMode.decode("ptzMode", parent),
    Error,
    "expected one of none, af, ptz, pt, p",
  );
});

Deno.test("support round-trips through encode and decode", () => {
  const value = {
    IOInputPortNum: 2,
    IOOutputPortNum: 1,
    diskNum: 1,
    channelNum: 1,
    audioNum: 1,
    ptzMode: "af" as const,
    ptzCfg: 1,
    B485: 1,
    autoUpdate: 1,
    pushAlarm: 1,
    ftp: 1,
    ftpTest: 1,
    email: 1,
    wifi: 1,
    record: 1,
    wifiTest: 1,
    rtsp: 1,
    onvif: 1,
    audioTalk: 1,
    rfVersion: 2,
    rtmp: 1,
    noExternStream: 0,
    timeFormat: 1,
    ddnsVersion: 3,
    emailVersion: 4,
    pushVersion: 5,
    pushType: 6,
    audioAlarm: 1,
    apMode: 1,
    cloudVersion: 8,
    replayVersion: 9,
    mobComVersion: 10,
    ExportImport: 1,
    languageVer: 11,
    videoStandard: 12,
    syncTime: 1,
    netPort: 1,
    nasVersion: 13,
    needReboot: 0,
    reboot: 1,
    audioCfg: 1,
    networkDiagnosis: 1,
    loginLocked: 1,
    wifiVersion: 14,
    previewVersion: 15,
    netSecurity: 1,
    IOTLink: 1,
    IOTLinkActionMax: 16,
    autoTest: 0,
    recordCfg: 1,
    smartHome: { version: 1, item: [{ name: "googleHome", ver: 17 }] },
    item: [{
      chnID: 0,
      ptzType: 18,
      rfCfg: 1,
      noAudio: 0,
      autoFocus: 1,
      videoClip: 1,
      battery: 0,
      ispCfg: 19,
      osdCfg: 20,
      batAnalysis: 0,
      dynamicReso: 1,
      audioVersion: 21,
      ledCtrl: 1,
      ptzControl: 1,
      newIspCfg: 22,
      ptzPreset: 1,
      ptzPatrol: 1,
      ptzTattern: 1,
      autoPt: 1,
      h264Profile: 23,
      motion: 24,
      aitype: 25,
      aiAnimalType: 26,
      timelapse: 1,
      snap: 1,
      encCtrl: 1,
      zfBacklash: 1,
      IOTLinkAbility: 27,
      ipcAudioTalk: 1,
      shelter: 0,
      thumbnail: 1,
    }],
  };

  const xml = support.encode(value);

  assertEquals(support.decode(parse(xml).root), value);
});

Deno.test("support decodes a Video Doorbell PoE cmd 199 reply in serializer order", () => {
  const root = parse(
    '<Support version="1.1"><IOInputPortNum>1</IOInputPortNum>' +
      "<IOOutputPortNum>2</IOOutputPortNum><diskNum>3</diskNum>" +
      "<channelNum>4</channelNum><audioNum>5</audioNum>" +
      "<ptzMode>none</ptzMode><ptzCfg>6</ptzCfg><B485>7</B485>" +
      "<autoUpdate>8</autoUpdate><pushAlarm>9</pushAlarm><ftp>10</ftp>" +
      "<ftpTest>11</ftpTest><email>12</email><wifi>13</wifi>" +
      "<record>14</record><wifiTest>15</wifiTest><rtsp>16</rtsp>" +
      "<onvif>17</onvif><audioTalk>18</audioTalk><rfVersion>19</rfVersion>" +
      "<rtmp>20</rtmp><noExternStream>21</noExternStream>" +
      "<timeFormat>22</timeFormat><ddnsVersion>23</ddnsVersion>" +
      "<emailVersion>24</emailVersion><pushVersion>25</pushVersion>" +
      "<pushType>26</pushType><audioAlarm>27</audioAlarm><apMode>28</apMode>" +
      "<cloudVersion>29</cloudVersion><replayVersion>30</replayVersion>" +
      "<mobComVersion>31</mobComVersion><ExportImport>32</ExportImport>" +
      "<languageVer>33</languageVer><videoStandard>34</videoStandard>" +
      "<syncTime>35</syncTime><netPort>36</netPort><nasVersion>37</nasVersion>" +
      "<needReboot>38</needReboot><reboot>39</reboot><audioCfg>40</audioCfg>" +
      "<networkDiagnosis>41</networkDiagnosis>" +
      "<heightDiffAdjust>42</heightDiffAdjust><wifiVersion>43</wifiVersion>" +
      "<previewVersion>44</previewVersion><netSecurity>45</netSecurity>" +
      "<user>46</user><IOTLink>47</IOTLink>" +
      "<IOTLinkActionMax>48</IOTLinkActionMax><smartHome></smartHome>" +
      "<item><chnID>0</chnID><ptzType>101</ptzType><rfCfg>102</rfCfg>" +
      "<noAudio>103</noAudio><autoFocus>104</autoFocus><videoClip>105</videoClip>" +
      "<battery>106</battery><ispCfg>107</ispCfg><osdCfg>108</osdCfg>" +
      "<batAnalysis>109</batAnalysis><dynamicReso>110</dynamicReso>" +
      "<audioVersion>111</audioVersion><ledCtrl>112</ledCtrl>" +
      "<ptzControl>113</ptzControl><newIspCfg>114</newIspCfg>" +
      "<ptzPreset>115</ptzPreset><ptzPatrol>116</ptzPatrol>" +
      "<ptzTattern>117</ptzTattern><autoPt>118</autoPt>" +
      "<h264Profile>119</h264Profile><motion>120</motion><aitype>121</aitype>" +
      "<eventTypeVersion>122</eventTypeVersion><timelapse>123</timelapse>" +
      "<snap>124</snap><encCtrl>125</encCtrl><zfBacklash>126</zfBacklash>" +
      "<IOTLinkAbility>127</IOTLinkAbility><shelter>0</shelter>" +
      "<doorbellVersion>128</doorbellVersion>" +
      "<aiUpdateAbility>129</aiUpdateAbility>" +
      "<remoteAbility>130</remoteAbility></item>" +
      "</Support>",
  ).root;

  assertEquals(support.decode(root), {
    IOInputPortNum: 1,
    IOOutputPortNum: 2,
    diskNum: 3,
    channelNum: 4,
    audioNum: 5,
    ptzMode: "none",
    ptzCfg: 6,
    B485: 7,
    autoUpdate: 8,
    pushAlarm: 9,
    ftp: 10,
    ftpTest: 11,
    email: 12,
    wifi: 13,
    record: 14,
    wifiTest: 15,
    rtsp: 16,
    onvif: 17,
    audioTalk: 18,
    rfVersion: 19,
    rtmp: 20,
    noExternStream: 21,
    timeFormat: 22,
    ddnsVersion: 23,
    emailVersion: 24,
    pushVersion: 25,
    pushType: 26,
    audioAlarm: 27,
    apMode: 28,
    cloudVersion: 29,
    replayVersion: 30,
    mobComVersion: 31,
    ExportImport: 32,
    languageVer: 33,
    videoStandard: 34,
    syncTime: 35,
    netPort: 36,
    nasVersion: 37,
    needReboot: 38,
    reboot: 39,
    audioCfg: 40,
    networkDiagnosis: 41,
    heightDiffAdjust: 42,
    wifiVersion: 43,
    previewVersion: 44,
    netSecurity: 45,
    user: 46,
    IOTLink: 47,
    IOTLinkActionMax: 48,
    smartHome: { item: [] },
    item: [{
      chnID: 0,
      ptzType: 101,
      rfCfg: 102,
      noAudio: 103,
      autoFocus: 104,
      videoClip: 105,
      battery: 106,
      ispCfg: 107,
      osdCfg: 108,
      batAnalysis: 109,
      dynamicReso: 110,
      audioVersion: 111,
      ledCtrl: 112,
      ptzControl: 113,
      newIspCfg: 114,
      ptzPreset: 115,
      ptzPatrol: 116,
      ptzTattern: 117,
      autoPt: 118,
      h264Profile: 119,
      motion: 120,
      aitype: 121,
      eventTypeVersion: 122,
      timelapse: 123,
      snap: 124,
      encCtrl: 125,
      zfBacklash: 126,
      IOTLinkAbility: 127,
      shelter: 0,
      doorbellVersion: 128,
      aiUpdateAbility: 129,
      remoteAbility: 130,
    }],
  });
});
