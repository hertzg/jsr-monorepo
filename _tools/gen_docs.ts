/**
 * Generates HTML API documentation: one TypeDoc site per package plus an index
 * page that links them.
 *
 * Usage: `bun _tools/gen_docs.ts [outputDir]` - default `docs`.
 */
import { availableParallelism } from "node:os";
import { join, resolve } from "node:path";
import {
  getEntryPoints,
  getPackages,
  type PackageInfo,
  ROOT_DIR,
} from "./utils.ts";

function slugify(name: string): string {
  return name.replace(/^@/, "").replace(/\//g, "-");
}

async function generatePackageDocs(
  pkg: PackageInfo,
  outputDir: string,
): Promise<void> {
  const slug = slugify(pkg.name);

  // `--skipErrorChecking`: `bun run typecheck` owns type errors. Without it
  // TypeDoc typechecks the whole repo once per package.
  const child = Bun.spawn(
    [
      process.execPath,
      "x",
      "typedoc",
      "--skipErrorChecking",
      "--logLevel",
      "Error",
      "--name",
      pkg.name,
      "--out",
      join(outputDir, slug),
      ...getEntryPoints(pkg),
    ],
    { cwd: ROOT_DIR, stdout: "ignore", stderr: "pipe" },
  );
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`Failed to generate docs for ${pkg.name}: ${stderr}`);
  }
  console.log(`Generated docs for ${pkg.name} -> ${slug}/`);
}

/** Runs `generatePackageDocs` for every package, a few TypeDoc processes at a time. */
async function generateAllDocs(
  packages: PackageInfo[],
  outputDir: string,
): Promise<PromiseSettledResult<void>[]> {
  const results = new Array<PromiseSettledResult<void>>(packages.length);
  let nextIndex = 0;
  const work = async () => {
    while (nextIndex < packages.length) {
      const index = nextIndex++;
      [results[index]] = await Promise.allSettled([
        generatePackageDocs(packages[index], outputDir),
      ]);
    }
  };
  await Promise.all(
    Array.from({ length: availableParallelism() }, () => work()),
  );
  return results;
}

function generateIndexHtml(packages: PackageInfo[]): string {
  const rows = packages
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((pkg) => {
      const slug = slugify(pkg.name);
      return `        <tr>
          <td><a href="./${slug}/">${pkg.name}</a></td>
          <td>${pkg.version}</td>
        </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JSR Monorepo - API Documentation</title>
  <style>
    :root {
      --bg: #fff;
      --fg: #1a1a2e;
      --muted: #6c6c8a;
      --border: #e0e0e8;
      --link: #056cf2;
      --hover: #0550b3;
      --row-alt: #f8f8fc;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #16161d;
        --fg: #e0e0e8;
        --muted: #9999aa;
        --border: #2e2e3e;
        --link: #58a6ff;
        --hover: #79b8ff;
        --row-alt: #1e1e28;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ui-monospace, "Cascadia Code", Menlo, monospace;
      background: var(--bg);
      color: var(--fg);
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: var(--muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.6rem 1rem; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:nth-child(even) { background: var(--row-alt); }
    a { color: var(--link); text-decoration: none; }
    a:hover { color: var(--hover); text-decoration: underline; }
    td:last-child { color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>JSR Monorepo</h1>
  <p>API documentation for all packages</p>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th>Version</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

async function main() {
  const outputDir = resolve(process.argv[2] || join(ROOT_DIR, "docs"));

  const packages = await getPackages();
  console.log(`Generating docs for ${packages.length} packages...`);

  const results = await generateAllDocs(packages, outputDir);

  const succeeded: PackageInfo[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      console.warn(`Warning: skipping ${packages[i].name}: ${result.reason}`);
    } else {
      succeeded.push(packages[i]);
    }
  }

  if (succeeded.length === 0) {
    console.error("All packages failed doc generation");
    process.exit(1);
  }

  const indexHtml = generateIndexHtml(succeeded);
  await Bun.write(join(outputDir, "index.html"), indexHtml);
  await Bun.write(join(outputDir, ".nojekyll"), "");
  console.log(
    `Generated index.html (${succeeded.length}/${packages.length} packages)`,
  );
}

await main();
