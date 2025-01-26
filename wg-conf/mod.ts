import { parseArray, stringifyArray } from "@hertzg/wg-ini";

export interface WGQuickInterface {
  ListenPort?: number;
  PrivateKey?: string;
  Address?: string[];
  MTU?: number;
  DNS?: string[];
  Table?: string;
  PreUp?: string[];
  PreDown?: string[];
  PostUp?: string[];
  PostDown?: string[];
  SaveConfig?: boolean;
}

export interface WGQuickPeer {
  PublicKey?: string;
  PresharedKey?: string;
  AllowedIPs?: string[];
  Endpoint?: string;
  PersistentKeepalive?: number;
}

export interface WGQuickConf {
  Interface: WGQuickInterface;
  Peers: WGQuickPeer[];
}

/**
 * Parse a wg-quick(8) configuration file into a JavaScript object.
 *
 * @example
 * ```ts
 * import { parse } from "@hertzg/wg-conf";
 * import { assertEquals } from "@std/assert";
 *
 * const text = [
 *  '[Interface]',
 *  'ListenPort = 51820',
 *  'PrivateKey = PRIV',
 *  '',
 *  '[Peer]',
 *  'PublicKey = PUB',
 *  ''
 * ].join("\n");
 *
 * assertEquals(await parse(text), {
 *  Interface: {
 *    ListenPort: 51820,
 *    PrivateKey: "PRIV",
 *  },
 *  Peers: [
 *    {PublicKey: "PUB"},
 *  ],
 * });
 * ```
 */
export async function parse(text: string): Promise<WGQuickConf> {
  const conf: WGQuickConf = { Interface: {}, Peers: [] };
  const sections = await parseArray(text);
  for (const section of sections) {
    const sectionName = section[0]?.trim();
    const entries = section[1];
    if (sectionName === null) {
      continue;
    }

    switch (sectionName) {
      case "Interface":
        conf.Interface = entries.reduce((acc, entry) => {
          const key = entry[0].trim();
          const value = entry[1].trim();
          switch (key) {
            case "Table":
            case "PrivateKey":
              acc[key] = String(value);
              break;
            case "SaveConfig":
              acc[key] = value === "true";
              break;
            case "MTU":
            case "ListenPort":
              acc[key] = Number(value);
              break;
            case "DNS":
            case "Address":
              acc[key] ??= [];
              acc[key].push(...value.split(",").map((v) => v.trim()));
              break;
            case "PreUp":
            case "PreDown":
            case "PostUp":
            case "PostDown":
              acc[key] ??= [];
              acc[key].push(value);
              break;
          }
          return acc;
        }, conf.Interface);
        break;
      case "Peer":
        conf.Peers.push(
          entries.reduce((acc, entry) => {
            const key = entry[0].trim();
            const value = entry[1].trim();

            switch (key) {
              case "PublicKey":
              case "PresharedKey":
              case "Endpoint":
                acc[key] = value;
                break;
              case "AllowedIPs":
                acc[key] ??= [];
                acc[key].push(...value.split(",").map((v) => v.trim()));
                break;
              case "PersistentKeepalive":
                acc[key] = Number(value);
                break;
            }
            return acc;
          }, {} as WGQuickPeer),
        );
        break;
    }
  }
  return conf;
}

/**
 * Parse a wg-quick(8) configuration file into a JavaScript object.
 *
 * @example
 * ```ts
 * import { stringify } from "@hertzg/wg-conf";
 * import { assertEquals } from "@std/assert";
 *
 * const obj = {
 *  Interface: {
 *    ListenPort: 51820,
 *    PrivateKey: "PRIV",
 *  },
 *  Peers: [
 *    {PublicKey: "PUB"},
 *  ],
 * };
 *
 * assertEquals(await stringify(obj), [
 *  '[Interface]',
 *  'ListenPort = 51820',
 *  'PrivateKey = PRIV',
 *  '',
 *  '[Peer]',
 *  'PublicKey = PUB',
 *  ''
 * ].join("\n"));
 * ```
 */

export async function stringify(conf: WGQuickConf): Promise<string> {
  const array: [string | null, string[][]][] = [];
  if (conf.Interface != null) {
    const entries = [];
    let key: keyof WGQuickInterface;
    for (key in conf.Interface) {
      if (conf.Interface[key] == null) {
        continue;
      }

      switch (key) {
        case "Table":
        case "PrivateKey":
          entries.push([key, String(conf.Interface[key]!)]);
          break;
        case "SaveConfig":
          entries.push([key, conf.Interface[key]! ? "true" : "false"]);
          break;
        case "DNS":
        case "Address":
          entries.push([key, conf.Interface[key]!.join(",")]);
          break;
        case "PreUp":
        case "PreDown":
        case "PostUp":
        case "PostDown":
          entries.push([key, conf.Interface[key]!.join(",")]);
          break;
        default:
          entries.push([key, String(conf.Interface[key]!)]);
          break;
      }
    }
    array.push(["Interface", entries]);
  }

  if (conf.Peers.length > 0) {
    for (const peer of conf.Peers) {
      const entries = [];
      let key: keyof WGQuickPeer;
      for (key in peer) {
        if (peer[key] == null) {
          continue;
        }

        switch (key) {
          case "AllowedIPs":
            entries.push([key, peer[key]!.join(",")]);
            break;
          default:
            entries.push([key, String(peer[key]!)]);
            break;
        }
      }
      array.push(["Peer", entries]);
    }
  }

  return await stringifyArray(
    array.map(
      ([section, entries]) =>
        [section, entries.map(([key, value]) => [`${key} `, ` ${value}`])] as [
          string | null,
          string[][],
        ],
    ),
  );
}
