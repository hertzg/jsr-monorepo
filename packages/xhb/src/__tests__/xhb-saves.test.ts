import * as Path from 'node:path'
import * as FS from 'node:fs'
import { dirname, fromFileUrl } from '@std/path'
import { parse, serialize } from '../index.ts'
import { assertEquals } from '@std/assert'

const SAVES_DIR = Path.join(
  dirname(fromFileUrl(import.meta.url)),
  './fixtures/saves',
)
const SAVES = FS.readdirSync(SAVES_DIR)
  .filter((name) => name.endsWith('.xhb'))
  .map((name) => ({
    name,
    path: Path.join(SAVES_DIR, name),
  }))

SAVES.forEach(({ name, path }) => {
  Deno.test(`produces identical output when saving unmodified parsed object for ${name}`, () => {
    const contents = FS.readFileSync(path, { encoding: 'utf8' })
    const serialized = serialize(parse(contents))
    assertEquals(serialized, contents)
  })
})
