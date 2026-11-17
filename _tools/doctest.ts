/**
 * Runs every JSDoc `@example` code block as a program, so an example that
 * throws or no longer compiles fails the build.
 *
 * Usage: `bun _tools/doctest.ts [path ...]` - paths are files or directories,
 * default `packages`. A block fenced as `ts ignore` is skipped.
 *
 * Each block is written to `node_modules/.cache/doctest/` with its relative
 * imports rewritten to absolute paths, then run in its own process.
 */
import { Glob } from "bun";
import { mkdir, rm, stat } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ROOT_DIR } from "./utils.ts";

interface Example {
  sourceFile: string;
  sourceLine: number;
  code: string;
}

interface Failure {
  example: Example;
  output: string;
}

const RUNNABLE_LANGUAGES = ["ts", "typescript", "js", "javascript"];

function isDocumentedSource(file: string): boolean {
  return !/(\.test\.ts|_test\.ts|\.bench\.ts|\.d\.ts)$/.test(file) &&
    !/(^|\/)(node_modules|dist|adr|_bench)\//.test(file);
}

async function listSourceFiles(path: string): Promise<string[]> {
  if ((await stat(path)).isFile()) return [path];
  const files: string[] = [];
  for await (const file of new Glob("**/*.ts").scan(path)) {
    if (isDocumentedSource(file)) files.push(join(path, file));
  }
  return files.sort();
}

function countLinesBefore(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function extractExamples(sourceFile: string, source: string): Example[] {
  const examples: Example[] = [];
  for (const comment of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    const body = comment[0]
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, ""))
      .join("\n");
    const fence = /^(`{3,})(\w*)([^\n]*)\n([\s\S]*?)^\1\s*$/gm;
    for (const block of body.matchAll(fence)) {
      const [, , language, attributes, code] = block;
      if (!RUNNABLE_LANGUAGES.includes(language)) continue;
      if (/\bignore\b/.test(attributes)) continue;
      examples.push({
        sourceFile,
        sourceLine: countLinesBefore(source, comment.index) +
          countLinesBefore(body, block.index),
        code,
      });
    }
  }
  return examples;
}

function absolutizeRelativeImports(code: string, fromDir: string): string {
  return code.replace(
    /(\bfrom\s+|\bimport\s*\(?\s*)"(\.{1,2}\/[^"]+)"/g,
    (_match, keyword: string, specifier: string) =>
      `${keyword}"${resolve(fromDir, specifier)}"`,
  );
}

async function runExample(
  example: Example,
  scriptFile: string,
): Promise<Failure | undefined> {
  await Bun.write(
    scriptFile,
    absolutizeRelativeImports(
      example.code,
      dirname(resolve(example.sourceFile)),
    ),
  );
  const child = Bun.spawn([process.execPath, scriptFile], {
    stdout: "ignore",
    stderr: "pipe",
  });
  const [exitCode, output] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);
  return exitCode === 0 ? undefined : { example, output };
}

async function main(paths: string[]): Promise<void> {
  // Always under the root, whatever the cwd: that is where an example's bare
  // imports resolve from.
  const cacheDir = join(ROOT_DIR, "node_modules/.cache/doctest");
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });

  const examples: Example[] = [];
  for (const path of paths.length ? paths : ["packages"]) {
    for (const file of await listSourceFiles(path)) {
      examples.push(...extractExamples(file, await Bun.file(file).text()));
    }
  }

  const failures: Failure[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < examples.length) {
      const index = nextIndex++;
      const failure = await runExample(
        examples[index],
        join(cacheDir, `${index}.ts`),
      );
      if (failure) failures.push(failure);
    }
  };
  await Promise.all(
    Array.from({ length: availableParallelism() }, () => worker()),
  );

  for (const { example, output } of failures) {
    console.error(`\nFAIL ${example.sourceFile}:${example.sourceLine}`);
    console.error(output.trimEnd());
  }
  console.log(
    `\n${examples.length - failures.length} pass, ${failures.length} fail, ` +
      `${examples.length} examples`,
  );
  if (failures.length) process.exit(1);
}

await main(process.argv.slice(2));
