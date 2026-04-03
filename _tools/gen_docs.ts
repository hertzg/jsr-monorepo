#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
import { join } from "@std/path";
import { getPackages, type PackageInfo } from "./utils.ts";

const ROOT_DIR = new URL("..", import.meta.url).pathname;

function getEntryPoints(pkg: PackageInfo): string[] {
  const exports = typeof pkg.exports === "string"
    ? { ".": pkg.exports }
    : pkg.exports;
  return Object.values(exports).map((ep) => join(pkg.workspacePath, ep));
}

function slugify(name: string): string {
  return name.replace(/^@/, "").replace(/\//g, "-");
}

async function generatePackageDocs(
  pkg: PackageInfo,
  outputDir: string,
): Promise<void> {
  const slug = slugify(pkg.name);
  const pkgOutputDir = join(outputDir, slug);
  const entryPoints = getEntryPoints(pkg);

  await Deno.mkdir(pkgOutputDir, { recursive: true });

  const cmd = new Deno.Command("deno", {
    args: [
      "doc",
      "--html",
      `--name=${pkg.name}`,
      `--output=${pkgOutputDir}`,
      ...entryPoints,
    ],
    cwd: ROOT_DIR,
    stdout: "piped",
    stderr: "piped",
  });

  const result = await cmd.output();
  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`Failed to generate docs for ${pkg.name}: ${stderr}`);
  }
  console.log(`Generated docs for ${pkg.name} -> ${slug}/`);
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
  const outputDir = Deno.args[0] || join(ROOT_DIR, "docs");

  const packages = await getPackages();
  console.log(`Generating docs for ${packages.length} packages...`);

  const results = await Promise.allSettled(
    packages.map((pkg) => generatePackageDocs(pkg, outputDir)),
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    for (const f of failures) {
      console.error((f as PromiseRejectedResult).reason);
    }
    Deno.exit(1);
  }

  const indexHtml = generateIndexHtml(packages);
  await Deno.writeTextFile(join(outputDir, "index.html"), indexHtml);
  await Deno.writeTextFile(join(outputDir, ".nojekyll"), "");
  console.log("Generated index.html");
}

main();
