/**
 * Compares two Deno benchmark JSON outputs and generates a markdown diff report.
 *
 * Usage: deno run --allow-read bench_diff.ts <base.json> <pr.json>
 */

interface BenchmarkEntry {
  origin: string;
  group: string | null;
  name: string;
  baseline: boolean;
  results: Array<{
    ok: {
      n: number;
      min: number;
      max: number;
      avg: number;
      p75: number;
      p99: number;
      p995: number;
      p999: number;
      highPrecision: boolean;
      usedExplicitTimers: boolean;
    };
  }>;
}

interface BenchmarkOutput {
  version: number;
  runtime: string;
  cpu: string;
  benches: BenchmarkEntry[];
}

interface ParsedBenchmark {
  name: string;
  origin: string;
  avg: number;
  min: number;
  max: number;
  p75: number;
  p99: number;
  iterations: number;
}

function parseBenchmarkFile(content: string): Map<string, ParsedBenchmark> {
  const benchmarks = new Map<string, ParsedBenchmark>();

  if (!content.trim()) {
    return benchmarks;
  }

  // Find the JSON object in the content (skip any non-JSON lines like task output)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return benchmarks;
  }

  try {
    const output = JSON.parse(jsonMatch[0]) as BenchmarkOutput;

    if (!output.benches || !Array.isArray(output.benches)) {
      return benchmarks;
    }

    for (const bench of output.benches) {
      if (bench.results && bench.results.length > 0) {
        const ok = bench.results[0].ok;
        if (ok) {
          const key = `${bench.origin}::${bench.name}`;
          benchmarks.set(key, {
            name: bench.name,
            origin: bench.origin,
            avg: ok.avg,
            min: ok.min,
            max: ok.max,
            p75: ok.p75,
            p99: ok.p99,
            iterations: ok.n,
          });
        }
      }
    }
  } catch {
    // Unable to parse JSON
  }

  return benchmarks;
}

function formatDuration(ns: number): string {
  if (ns < 1000) {
    return `${ns.toFixed(2)} ns`;
  } else if (ns < 1_000_000) {
    return `${(ns / 1000).toFixed(2)} µs`;
  } else if (ns < 1_000_000_000) {
    return `${(ns / 1_000_000).toFixed(2)} ms`;
  } else {
    return `${(ns / 1_000_000_000).toFixed(2)} s`;
  }
}

function formatChange(baseAvg: number, prAvg: number): string {
  const diff = ((prAvg - baseAvg) / baseAvg) * 100;
  const sign = diff > 0 ? "+" : "";
  const emoji = diff > 5 ? "🔴" : diff < -5 ? "🟢" : "⚪";
  return `${emoji} ${sign}${diff.toFixed(2)}%`;
}

function formatSpeedChange(baseAvg: number, prAvg: number): string {
  const ratio = baseAvg / prAvg;
  if (ratio >= 1) {
    return `${ratio.toFixed(2)}x faster`;
  } else {
    return `${(1 / ratio).toFixed(2)}x slower`;
  }
}

function generateReport(
  baseBenchmarks: Map<string, ParsedBenchmark>,
  prBenchmarks: Map<string, ParsedBenchmark>,
): string {
  const lines: string[] = [];

  lines.push("## Benchmark Results\n");

  // Group benchmarks by origin file
  const groupedBase = new Map<string, ParsedBenchmark[]>();
  const groupedPr = new Map<string, ParsedBenchmark[]>();

  for (const [, bench] of baseBenchmarks) {
    const group = groupedBase.get(bench.origin) || [];
    group.push(bench);
    groupedBase.set(bench.origin, group);
  }

  for (const [, bench] of prBenchmarks) {
    const group = groupedPr.get(bench.origin) || [];
    group.push(bench);
    groupedPr.set(bench.origin, group);
  }

  // Get all unique origins
  const allOrigins = new Set([...groupedBase.keys(), ...groupedPr.keys()]);

  if (allOrigins.size === 0) {
    lines.push("No benchmarks found.\n");
    return lines.join("\n");
  }

  // Summary statistics
  let totalImproved = 0;
  let totalRegressed = 0;
  let totalUnchanged = 0;
  let totalNew = 0;
  let totalRemoved = 0;

  const significantResults: Array<{
    key: string;
    name: string;
    origin: string;
    baseAvg?: number;
    prAvg?: number;
    change?: number;
    type: "improved" | "regressed" | "new" | "removed";
  }> = [];

  for (const origin of allOrigins) {
    const baseBenches = groupedBase.get(origin) || [];
    const prBenches = groupedPr.get(origin) || [];

    const baseByName = new Map(baseBenches.map((b) => [b.name, b]));
    const prByName = new Map(prBenches.map((b) => [b.name, b]));

    const allNames = new Set([...baseByName.keys(), ...prByName.keys()]);

    for (const name of allNames) {
      const base = baseByName.get(name);
      const pr = prByName.get(name);
      const key = `${origin}::${name}`;

      if (base && pr) {
        const change = ((pr.avg - base.avg) / base.avg) * 100;
        if (change > 5) {
          totalRegressed++;
          significantResults.push({
            key,
            name,
            origin,
            baseAvg: base.avg,
            prAvg: pr.avg,
            change,
            type: "regressed",
          });
        } else if (change < -5) {
          totalImproved++;
          significantResults.push({
            key,
            name,
            origin,
            baseAvg: base.avg,
            prAvg: pr.avg,
            change,
            type: "improved",
          });
        } else {
          totalUnchanged++;
        }
      } else if (pr && !base) {
        significantResults.push({
          key,
          name,
          origin,
          prAvg: pr.avg,
          type: "new",
        });
        totalNew++;
      } else if (base && !pr) {
        significantResults.push({
          key,
          name,
          origin,
          baseAvg: base.avg,
          type: "removed",
        });
        totalRemoved++;
      }
    }
  }

  const hasSignificantChanges = significantResults.length > 0;

  if (!hasSignificantChanges) {
    lines.push(
      `No significant changes detected. ${totalUnchanged} benchmark(s) within ±5% threshold.\n`,
    );
    return lines.join("\n");
  }

  // Summary
  lines.push("| Category | Count |");
  lines.push("|----------|-------|");
  if (totalImproved > 0) {
    lines.push(`| 🟢 Improved (>5% faster) | ${totalImproved} |`);
  }
  if (totalRegressed > 0) {
    lines.push(`| 🔴 Regressed (>5% slower) | ${totalRegressed} |`);
  }
  if (totalNew > 0) lines.push(`| 🆕 New | ${totalNew} |`);
  if (totalRemoved > 0) lines.push(`| 🗑️ Removed | ${totalRemoved} |`);
  if (totalUnchanged > 0) {
    lines.push(`| ⚪ Unchanged | ${totalUnchanged} |`);
  }
  lines.push("");

  // Detailed results by origin (only significant changes)
  const originsWithChanges = [
    ...new Set(significantResults.map((r) => r.origin)),
  ].sort();

  for (const origin of originsWithChanges) {
    const originResults = significantResults.filter((r) => r.origin === origin);
    if (originResults.length === 0) continue;

    const shortOrigin = origin.replace(/^file:\/\//, "").replace(
      /.*\/packages\//,
      "packages/",
    );
    lines.push(`### \`${shortOrigin}\`\n`);

    lines.push("| Benchmark | Base | PR | Change |");
    lines.push("|-----------|------|-------|--------|");

    for (
      const result of originResults.sort((a, b) => a.name.localeCompare(b.name))
    ) {
      if (result.baseAvg !== undefined && result.prAvg !== undefined) {
        const change = formatChange(result.baseAvg, result.prAvg);
        const speed = formatSpeedChange(result.baseAvg, result.prAvg);
        lines.push(
          `| ${result.name} | ${formatDuration(result.baseAvg)} | ${
            formatDuration(result.prAvg)
          } | ${change} (${speed}) |`,
        );
      } else if (result.prAvg !== undefined) {
        lines.push(
          `| ${result.name} | - | ${formatDuration(result.prAvg)} | 🆕 New |`,
        );
      } else if (result.baseAvg !== undefined) {
        lines.push(
          `| ${result.name} | ${
            formatDuration(result.baseAvg)
          } | - | 🗑️ Removed |`,
        );
      }
    }

    lines.push("");
  }

  lines.push(
    "<sub>Benchmark comparison generated automatically. Results may vary between runs.</sub>",
  );

  return lines.join("\n");
}

async function main() {
  const args = Deno.args;

  if (args.length !== 2) {
    console.error("Usage: bench_diff.ts <base.json> <pr.json>");
    Deno.exit(1);
  }

  const [baseFile, prFile] = args;

  let baseContent = "";
  let prContent = "";

  try {
    baseContent = await Deno.readTextFile(baseFile);
  } catch {
    // Base file might not exist if benchmarks are new
  }

  try {
    prContent = await Deno.readTextFile(prFile);
  } catch {
    console.error(`Error: Cannot read PR benchmark file: ${prFile}`);
    Deno.exit(1);
  }

  const baseBenchmarks = parseBenchmarkFile(baseContent);
  const prBenchmarks = parseBenchmarkFile(prContent);

  const report = generateReport(baseBenchmarks, prBenchmarks);
  console.log(report);
}

main();
