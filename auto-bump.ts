#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run=git

import { format, increment, parse } from "@std/semver";

interface Options {
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

interface PackageInfo {
  name: string;
  path: string;
  version: string;
}

interface CommitInfo {
  hash: string;
  message: string;
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
  files: string[];
}

interface VersionBump {
  package: PackageInfo;
  currentVersion: string;
  newVersion: string;
  bumpType: "patch" | "minor" | "major";
  commits: CommitInfo[];
}

type BumpType = "patch" | "minor" | "major";

// Parse command line arguments
function parseArgs(): Options {
  const args = Deno.args;
  const options: Options = {
    dryRun: false,
    force: false,
    verbose: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    }
  }

  return options;
}

// Safety checks
async function performSafetyChecks(options: Options): Promise<boolean> {
  if (options.force) {
    console.log("⚠️  Force flag detected, skipping safety checks");
    return true;
  }

  console.log("🔒 Performing safety checks...");

  // Check if we're in a git repository
  const gitCheckCmd = new Deno.Command("git", {
    args: ["rev-parse", "--git-dir"],
  });
  const { success: gitSuccess } = await gitCheckCmd.output();

  if (!gitSuccess) {
    console.error("❌ Not in a git repository");
    return false;
  }

  // Check for uncommitted changes
  const statusCmd = new Deno.Command("git", {
    args: ["status", "--porcelain"],
  });
  const { stdout: statusOutput } = await statusCmd.output();
  const status = new TextDecoder().decode(statusOutput);

  if (status.trim()) {
    console.error("❌ Uncommitted changes detected:");
    console.error(status);
    console.error(
      "💡 Please commit or stash your changes before running auto-bump",
    );
    return false;
  }

  console.log("✅ Safety checks passed");
  return true;
}

const WORKSPACE_PACKAGES = [
  "binstruct",
  "wg-keys",
  "wg-ini",
  "wg-conf",
  "mymagti-api",
  "bx",
];

// Parse conventional commit message
function parseCommitMessage(message: string): {
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
} {
  // Match conventional commit format: type(scope): description
  const conventionalCommitRegex = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i;
  const match = message.match(conventionalCommitRegex);

  if (!match) {
    return {
      type: "unknown",
      description: message,
      breaking: false,
    };
  }

  const [, type, scope, breaking, description] = match;

  return {
    type: type.toLowerCase(),
    scope,
    description: description.trim(),
    breaking: !!breaking,
  };
}

// Get bump type from commit type
function getBumpType(commitType: string, breaking: boolean): BumpType | null {
  if (breaking) return "major";

  switch (commitType) {
    case "fix":
      return "patch";
    case "feat":
      return "minor";
    case "chore":
    case "docs":
    case "style":
    case "refactor":
    case "test":
    case "ci":
    case "build":
    default:
      return null; // No version bump
  }
}

// Get package info for a given package name
async function getPackageInfo(
  packageName: string,
): Promise<PackageInfo | null> {
  for (const pkg of WORKSPACE_PACKAGES) {
    try {
      const denoJsonPath = `./${pkg}/deno.json`;
      const denoJsonContent = await Deno.readTextFile(denoJsonPath);
      const denoJson = JSON.parse(denoJsonContent);

      if (denoJson.name === packageName) {
        return {
          name: denoJson.name,
          path: pkg,
          version: denoJson.version,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.warn(`Warning: Could not read ${pkg}/deno.json: ${errorMessage}`);
    }
  }

  return null;
}

// Get all packages that were affected by changes in a file
function getAffectedPackages(filePath: string): string[] {
  const affectedPackages: string[] = [];

  // Check if file is in a package directory
  for (const pkg of WORKSPACE_PACKAGES) {
    if (filePath.startsWith(pkg + "/")) {
      affectedPackages.push(`@hertzg/${pkg}`);
      break;
    }
  }

  // Check for root-level files that might affect all packages
  if (filePath === "deno.json" || filePath === "deno.lock") {
    affectedPackages.push(...WORKSPACE_PACKAGES.map((pkg) => `@hertzg/${pkg}`));
  }

  return affectedPackages;
}

// Get the last release tag
async function getLastReleaseTag(): Promise<string | null> {
  const cmd = new Deno.Command("git", {
    args: ["tag", "--sort=-version:refname"],
  });

  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);
  const tags = output.trim().split("\n").filter((tag) =>
    tag.startsWith("release-")
  );

  return tags.length > 0 ? tags[0] : null;
}

// Get commits since the last tag
async function getCommitsSinceLastTag(
  lastTag: string | null,
  options: Options,
): Promise<CommitInfo[]> {
  let gitArgs: string[];
  if (lastTag) {
    gitArgs = [
      "log",
      "--oneline",
      "--no-merges",
      "--format=%H|%s",
      `${lastTag}..HEAD`,
    ];
  } else {
    // If no release tag exists, get all commits
    gitArgs = ["log", "--oneline", "--no-merges", "--format=%H|%s"];
  }

  const cmd = new Deno.Command("git", { args: gitArgs });

  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);

  const commits: CommitInfo[] = [];

  for (const line of output.trim().split("\n")) {
    if (!line) continue;

    const [hash, message] = line.split("|", 2);
    const parsed = parseCommitMessage(message);

    if (options.verbose) {
      console.log(`  📝 ${hash.substring(0, 8)}: ${message}`);
      console.log(
        `     Type: ${parsed.type}${parsed.scope ? `(${parsed.scope})` : ""}${
          parsed.breaking ? "!" : ""
        }`,
      );
    }

    // Get files changed in this commit
    const filesCmd = new Deno.Command("git", {
      args: ["show", "--name-only", "--format=", hash],
    });

    const { stdout: filesOutput } = await filesCmd.output();
    const files = new TextDecoder().decode(filesOutput)
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);

    if (options.verbose) {
      console.log(`     Files: ${files.join(", ")}`);
    }

    commits.push({
      hash,
      message,
      ...parsed,
      files,
    });
  }

  return commits;
}

// Calculate version bumps based on commits
async function calculateVersionBumps(
  commits: CommitInfo[],
  options: Options,
): Promise<VersionBump[]> {
  const packageBumps = new Map<string, VersionBump>();

  if (options.verbose) {
    console.log("\n🔍 Analyzing commits for version bumps:");
  }

  for (const commit of commits) {
    const bumpType = getBumpType(commit.type, commit.breaking);
    if (!bumpType) {
      if (options.verbose) {
        console.log(
          `  ⏭️  Skipping ${commit.type} commit (no version bump needed)`,
        );
      }
      continue;
    }

    const affectedPackages = new Set(
      commit.files.flatMap((file) => getAffectedPackages(file)),
    );

    if (options.verbose) {
      console.log(
        `  📦 ${commit.type}${commit.scope ? `(${commit.scope})` : ""}${
          commit.breaking ? "!" : ""
        } → ${bumpType} bump`,
      );
      console.log(
        `     Affected packages: ${Array.from(affectedPackages).join(", ")}`,
      );
    }

    // Update bump type for each affected package
    for (const packageName of affectedPackages) {
      if (!packageBumps.has(packageName)) {
        const packageInfo = await getPackageInfo(packageName);
        if (!packageInfo) {
          if (options.verbose) {
            console.log(`     ⚠️  Package ${packageName} not found, skipping`);
          }
          continue;
        }

        packageBumps.set(packageName, {
          package: packageInfo,
          currentVersion: packageInfo.version,
          newVersion: packageInfo.version,
          bumpType: "patch",
          commits: [],
        });

        if (options.verbose) {
          console.log(
            `     ➕ Initializing ${packageName} (current: ${packageInfo.version})`,
          );
        }
      }

      const bump = packageBumps.get(packageName)!;

      // Upgrade bump type if needed (major > minor > patch)
      if (
        bumpType === "major" ||
        (bumpType === "minor" && bump.bumpType === "patch")
      ) {
        if (options.verbose && bump.bumpType !== bumpType) {
          console.log(
            `     ⬆️  Upgrading ${packageName} bump from ${bump.bumpType} to ${bumpType}`,
          );
        }
        bump.bumpType = bumpType;
      }

      bump.commits.push(commit);
    }
  }

  if (options.verbose) {
    console.log("\n📊 Calculating final version bumps:");
  }

  // Calculate new versions
  for (const bump of packageBumps.values()) {
    const currentVersion = parse(bump.currentVersion);
    if (!currentVersion) {
      if (options.verbose) {
        console.log(
          `  ❌ Invalid version format for ${bump.package.name}: ${bump.currentVersion}`,
        );
      }
      continue;
    }

    const newVersion = increment(currentVersion, bump.bumpType);
    if (!newVersion) {
      if (options.verbose) {
        console.log(`  ❌ Failed to increment ${bump.package.name} version`);
      }
      continue;
    }

    bump.newVersion = format(newVersion);

    if (options.verbose) {
      console.log(
        `  📈 ${bump.package.name}: ${bump.currentVersion} → ${bump.newVersion} (${bump.bumpType})`,
      );
      console.log(
        `     Commits: ${bump.commits.length} (${
          bump.commits.map((c) => c.type).join(", ")
        })`,
      );
    }
  }

  return Array.from(packageBumps.values());
}

// Update package version
async function updatePackageVersion(
  packageInfo: PackageInfo,
  newVersion: string,
  options: Options,
): Promise<void> {
  const denoJsonPath = `./${packageInfo.path}/deno.json`;
  const denoJsonContent = await Deno.readTextFile(denoJsonPath);
  const denoJson = JSON.parse(denoJsonContent);

  denoJson.version = newVersion;

  if (options.dryRun) {
    console.log(
      `🔍 [DRY RUN] Would update ${packageInfo.name} version to ${newVersion}`,
    );
    return;
  }

  await Deno.writeTextFile(
    denoJsonPath,
    JSON.stringify(denoJson, null, 2) + "\n",
  );
  console.log(`✅ Updated ${packageInfo.name} version to ${newVersion}`);
}

// Update import map
async function updateImportMap(
  packageName: string,
  newVersion: string,
  options: Options,
): Promise<void> {
  const rootDenoJsonPath = "./deno.json";
  const denoJsonContent = await Deno.readTextFile(rootDenoJsonPath);
  const denoJson = JSON.parse(denoJsonContent);

  if (denoJson.imports && denoJson.imports[packageName]) {
    const currentImport = denoJson.imports[packageName];
    const newImport = currentImport.replace(
      /@[0-9]+\.[0-9]+\.[0-9]+/,
      `@${newVersion}`,
    );
    denoJson.imports[packageName] = newImport;

    if (options.dryRun) {
      console.log(
        `🔍 [DRY RUN] Would update import map for ${packageName} to ${newVersion}`,
      );
      return;
    }

    await Deno.writeTextFile(
      rootDenoJsonPath,
      JSON.stringify(denoJson, null, 2) + "\n",
    );
    console.log(`✅ Updated import map for ${packageName} to ${newVersion}`);
  } else {
    console.warn(`⚠️  No import mapping found for ${packageName}`);
  }
}

// Update releases
async function updateReleases(
  versionBumps: VersionBump[],
  options: Options,
): Promise<void> {
  const releasesPath = "./Releases.md";
  let releasesContent = "";

  try {
    releasesContent = await Deno.readTextFile(releasesPath);
  } catch {
    // Create new releases file if it doesn't exist
    releasesContent = "# Releases\n\n";
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, ".");
  const timeStr = now.toISOString().split("T")[1].split(".")[0].replace(
    /:/g,
    "-",
  );

  // Create date header
  const dateHeader = `### ${dateStr}\n\n`;

  let newEntries = "";

  for (const bump of versionBumps) {
    // Create package release header
    newEntries +=
      `#### ${bump.package.name} ${bump.newVersion} (${bump.bumpType})\n\n`;

    // Group commits by type and scope
    const commitsByTypeAndScope = new Map<string, CommitInfo[]>();
    for (const commit of bump.commits) {
      const key = commit.scope
        ? `${commit.type}(${commit.scope})`
        : commit.type;
      if (!commitsByTypeAndScope.has(key)) {
        commitsByTypeAndScope.set(key, []);
      }
      commitsByTypeAndScope.get(key)!.push(commit);
    }

    // Add commits by type and scope
    for (const [typeAndScope, commits] of commitsByTypeAndScope) {
      // Use the first commit's description as the main entry
      const mainCommit = commits[0];
      newEntries += `- ${typeAndScope}: ${mainCommit.description}\n`;

      // Add additional commits of same type/scope as sub-items
      for (let i = 1; i < commits.length; i++) {
        newEntries += `  - ${commits[i].description}\n`;
      }
    }

    newEntries += "\n";
  }

  if (options.dryRun) {
    console.log("🔍 [DRY RUN] Would update Releases.md with:");
    console.log(dateHeader + newEntries);
    return;
  }

  // Insert new entries at the top (after the title if it exists)
  const lines = releasesContent.split("\n");
  const titleIndex = lines.findIndex((line) => line.startsWith("# Releases"));

  if (titleIndex !== -1) {
    lines.splice(titleIndex + 2, 0, dateHeader + newEntries);
  } else {
    lines.unshift(dateHeader + newEntries);
  }

  await Deno.writeTextFile(releasesPath, lines.join("\n"));
  console.log("✅ Updated Releases.md");
}

// Create git tag
async function createGitTag(
  versionBumps: VersionBump[],
  options: Options,
): Promise<void> {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toISOString().split("T")[1].split(".")[0].replace(
    /:/g,
    "-",
  );

  const tagName = `release-${dateStr}.${timeStr}`;

  if (options.dryRun) {
    console.log(`🔍 [DRY RUN] Would create git tag: ${tagName}`);
    return;
  }

  const cmd = new Deno.Command("git", {
    args: ["tag", tagName],
  });

  const { success } = await cmd.output();

  if (success) {
    console.log(`✅ Created git tag: ${tagName}`);
  } else {
    console.error(`❌ Failed to create git tag: ${tagName}`);
  }
}

// Main function
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.dryRun) {
    console.log("🔍 [DRY RUN MODE] No changes will be made");
  }

  if (options.verbose) {
    console.log("🔍 [VERBOSE MODE] Detailed logging enabled");
  }

  console.log("🔍 Analyzing git commits since last tag...");

  try {
    // Perform safety checks
    const safetyChecksPassed = await performSafetyChecks(options);
    if (!safetyChecksPassed) {
      console.error("❌ Safety checks failed. Use --force to override.");
      Deno.exit(1);
    }

    // Get last release tag
    const lastTag = await getLastReleaseTag();
    if (lastTag) {
      console.log(`📋 Last release tag: ${lastTag}`);
    } else {
      console.log("📋 No previous release tags found, analyzing all commits");
    }

    // Get commits since last tag
    const commits = await getCommitsSinceLastTag(lastTag, options);
    console.log(`📝 Found ${commits.length} commits to analyze`);

    if (commits.length === 0) {
      console.log("✨ No commits found, nothing to bump");
      return;
    }

    // Filter out non-conventional commits
    const conventionalCommits = commits.filter((commit) =>
      commit.type !== "unknown" &&
      getBumpType(commit.type, commit.breaking) !== null
    );

    console.log(
      `📋 Found ${conventionalCommits.length} conventional commits that require version bumps`,
    );

    if (conventionalCommits.length === 0) {
      console.log("✨ No conventional commits found, nothing to bump");
      return;
    }

    // Calculate version bumps
    const versionBumps = await calculateVersionBumps(
      conventionalCommits,
      options,
    );

    if (!options.verbose) {
      console.log(`🔄 Found ${versionBumps.length} packages to bump:`);
      for (const bump of versionBumps) {
        console.log(
          `  - ${bump.package.name}: ${bump.currentVersion} → ${bump.newVersion} (${bump.bumpType})`,
        );
      }
    }

    // Apply version bumps
    console.log("\n📦 Applying version bumps...");
    for (const bump of versionBumps) {
      await updatePackageVersion(bump.package, bump.newVersion, options);
      await updateImportMap(bump.package.name, bump.newVersion, options);
    }

    // Update releases
    console.log("\n📝 Updating releases...");
    await updateReleases(versionBumps, options);

    // Create git tag
    console.log("\n🏷️  Creating git tag...");
    await createGitTag(versionBumps, options);

    if (options.dryRun) {
      console.log("\n🔍 [DRY RUN COMPLETED] No changes were made");
    } else {
      console.log("\n🎉 Successfully completed auto-bump!");
      console.log("📝 Don't forget to commit your changes!");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error: ${errorMessage}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
