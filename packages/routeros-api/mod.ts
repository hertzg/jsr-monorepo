/**
 * MikroTik Router API Stream Library
 *
 * A zero-dependency, environment-agnostic TypeScript library for working with
 * MikroTik Router API using WebStreams.
 *
 * @example
 * ```ts ignore
 * import { createClient } from '@hertzg/routeros-api';
 *
 * // Connect to router (example uses Deno, but works with any streams)
 * const conn = await Deno.connect({ hostname: '192.168.88.1', port: 8728 });
 *
 * // Create client
 * const client = createClient({
 *   readable: conn.readable,
 *   writable: conn.writable
 * });
 *
 * // Authenticate first
 * const login = await client.send({ command: '/login', attributes: { name: 'admin', password: '' } });
 *
 * const loginTrap = login.find(r => r.type === 'trap');
 * if(loginTrap) {
 *  throw new Error(loginTrap.message || 'Login failed');
 * }
 *
 * // check if login was successful
 *
 * // Execute commands (they can be sent concurrently as well)
 * const interfaces = await client.send({ command: '/interface/print' });
 * const addresses = await client.send({ command: '/ip/address/print' });
 *
 * // Close session
 * await client.quit();
 *
 * // Close connection
 * await conn.close();
 * ```
 *
 * @module
 */

// High-level client API (recommended)
export { createClient } from "./client.ts";
export type { Client, ClientOptions } from "./client.ts";
