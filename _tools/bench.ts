/**
 * Runs benchmark files with mitata.
 *
 * Usage: `bun _tools/bench.ts [--json] [path ...]` - paths are files or
 * directories, default `packages`.
 *
 * A benchmark file registers its cases with `bench()` from `mitata` and does
 * not call `run()` itself: this script imports one file at a time and runs
 * what it registered, which is how every result gets tagged with its file.
 *
 * `_bench/` directories hold comparisons against third-party packages. A
 * directory scan skips them, because `_tools/bench_diff.ts` compares base
 * against head and the competitor numbers are the same on both sides. Name
 * one explicitly to run it: `bun _tools/bench.ts packages/@hertzg/ip/_bench`.
 *
 * `--json` prints one `BenchReport` on stdout, the input of `bench_diff.ts`.
 */
import { Glob } from "bun";
import { run } from "mitata";
import { stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT_DIR } from "./utils.ts";

/** One benchmark case. Durations are nanoseconds per iteration. */
export interface BenchResult {
  /** Benchmark file, relative to the repository root. */
  origin: string;
  name: string;
  avg: number;
  min: number;
  max: number;
  p75: number;
  p99: number;
  iterations: number;
}

export interface BenchReport {
  benches: BenchResult[];
}

async function listBenchFiles(path: string): Promise<string[]> {
  if ((await stat(path)).isFile()) return [path];
  const files: string[] = [];
  for await (const file of new Glob("**/*{.,_}bench.ts").scan(path)) {
    if (/(^|\/)(node_modules|dist|_bench)\//.test(file)) continue;
    files.push(join(path, file));
  }
  return files.sort();
}

async function runBenchFile(
  file: string,
  format: "quiet" | "mitata",
): Promise<BenchResult[]> {
  const origin = relative(ROOT_DIR, resolve(file));
  if (format === "mitata") console.log(`\n${origin}`);
  await import(pathToFileURL(resolve(file)).href);
  const { benchmarks } = await run({ format, throw: true });
  return benchmarks.flatMap((trial) =>
    trial.runs.flatMap((trialRun) =>
      trialRun.stats
        ? [{
          origin,
          name: trialRun.name,
          avg: trialRun.stats.avg,
          min: trialRun.stats.min,
          max: trialRun.stats.max,
          p75: trialRun.stats.p75,
          p99: trialRun.stats.p99,
          iterations: trialRun.stats.samples.length,
        }]
        : []
    )
  );
}

async function main(args: string[]): Promise<void> {
  const isJson = args.includes("--json");
  const paths = args.filter((arg) => arg !== "--json");

  const benches: BenchResult[] = [];
  for (const path of paths.length ? paths : [join(ROOT_DIR, "packages")]) {
    for (const file of await listBenchFiles(path)) {
      benches.push(...await runBenchFile(file, isJson ? "quiet" : "mitata"));
    }
  }

  if (isJson) {
    const report: BenchReport = { benches };
    console.log(JSON.stringify(report, null, 2));
  }
}

await main(process.argv.slice(2));
