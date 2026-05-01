/**
 * High-level helpers to parse and stringify WireGuard wg-quick configuration files.
 *
 * This module uses the lower-level `@hertzg/wg-ini` streams to provide convenient
 * functions for working with wg-quick(8) configuration files.
 *
 * @example Parse a WireGuard configuration
 * ```ts
 * import { parse } from "@hertzg/wg-conf";
 * import { assertEquals } from "@std/assert";
 *
 * const text = [
 *   '[Interface]',
 *   'ListenPort = 51820',
 *   'PrivateKey = PRIV',
 *   '',
 *   '[Peer]',
 *   'PublicKey = PUB',
 *   ''
 * ].join("\n");
 *
 * const conf = await parse(text);
 * assertEquals(conf.Interface.ListenPort, 51820);
 * assertEquals(conf.Interface.PrivateKey, "PRIV");
 * assertEquals(conf.Peers[0].PublicKey, "PUB");
 * ```
 *
 * @example Stringify a WireGuard configuration
 * ```ts
 * import { stringify } from "@hertzg/wg-conf";
 * import { assert } from "@std/assert";
 *
 * const conf = {
 *   Interface: { ListenPort: 51820, PrivateKey: "PRIV" },
 *   Peers: [{ PublicKey: "PUB" }],
 * };
 *
 * const text = await stringify(conf);
 * assert(text.includes('[Interface]'));
 * assert(text.includes('ListenPort = 51820'));
 * assert(text.includes('[Peer]'));
 * assert(text.includes('PublicKey = PUB'));
 * ```
 *
 * @module
 */

import { parseArray, stringifyArray } from "@hertzg/wg-ini";

/**
 * Interface configuration for WireGuard wg-quick.
 */
export interface WGQuickInterface {
  /** The port to listen on for incoming connections */
  ListenPort?: number;
  /** The private key for this interface */
  PrivateKey?: string;
  /** Array of IP addresses to assign to this interface */
  Address?: string[];
  /** Maximum Transmission Unit size */
  MTU?: number;
  /** Array of DNS server addresses */
  DNS?: string[];
  /** Routing table to use */
  Table?: string;
  /** Commands to run before bringing up the interface */
  PreUp?: string[];
  /** Commands to run before bringing down the interface */
  PreDown?: string[];
  /** Commands to run after bringing up the interface */
  PostUp?: string[];
  /** Commands to run after bringing down the interface */
  PostDown?: string[];
  /** Whether to save the configuration */
  SaveConfig?: boolean;
}

/**
 * Peer configuration for WireGuard wg-quick.
 */
export interface WGQuickPeer {
  /** The public key of the peer */
  PublicKey?: string;
  /** Pre-shared key for additional security */
  PresharedKey?: string;
  /** Array of allowed IP addresses for this peer */
  AllowedIPs?: string[];
  /** Endpoint address and port for this peer */
  Endpoint?: string;
  /** Keepalive interval in seconds */
  PersistentKeepalive?: number;
}

/**
 * Complete WireGuard wg-quick configuration.
 */
export interface WGQuickConf {
  /** Interface configuration */
  Interface: WGQuickInterface;
  /** Array of peer configurations */
  Peers: WGQuickPeer[];
}

/**
 * Parse a wg-quick(8) configuration file into a JavaScript object.
 *
 * @param text The wg-quick configuration file content as a string.
 * @returns A promise that resolves to a {@link WGQuickConf} object.
 *
 * @example Parse a configuration with multiple peers
 * ```ts
 * import { parse } from "@hertzg/wg-conf";
 * import { assertEquals } from "@std/assert";
 *
 * const text = [
 *   '[Interface]',
 *   'ListenPort = 51820',
 *   'PrivateKey = PRIV',
 *   '',
 *   '[Peer]',
 *   'PublicKey = PUB',
 *   '',
 *   '[Peer]',
 *   'PublicKey = PUB2',
 *   ''
 * ].join("\n");
 *
 * assertEquals(await parse(text), {
 *   Interface: {
 *     ListenPort: 51820,
 *     PrivateKey: "PRIV",
 *   },
 *   Peers: [
 *     { PublicKey: "PUB" },
 *     { PublicKey: "PUB2" },
 *   ],
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
 * Stringify a WireGuard configuration object to wg-quick(8) format.
 *
 * @param conf The {@link WGQuickConf} object to stringify.
 * @returns A promise that resolves to the configuration as a string.
 *
 * @example Stringify a configuration with multiple peers
 * ```ts
 * import { stringify } from "@hertzg/wg-conf";
 * import { assertEquals } from "@std/assert";
 *
 * const obj = {
 *   Interface: {
 *     ListenPort: 51820,
 *     PrivateKey: "PRIV",
 *   },
 *   Peers: [
 *     { PublicKey: "PUB" },
 *     { PublicKey: "PUB2" },
 *   ],
 * };
 *
 * assertEquals(await stringify(obj), [
 *   '[Interface]',
 *   'ListenPort = 51820',
 *   'PrivateKey = PRIV',
 *   '',
 *   '[Peer]',
 *   'PublicKey = PUB',
 *   '',
 *   '[Peer]',
 *   'PublicKey = PUB2',
 *   ''
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
