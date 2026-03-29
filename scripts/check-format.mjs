#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ZERO_OID = /^0+$/;
const EMPTY_TREE_OID = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const BIOME_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".css",
  ".graphql",
  ".gql",
  ".html",
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const biomeConfigPath = path.join(repoRoot, "biome.json");

main();

function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode !== "--staged" && mode !== "--pre-push") {
    fail(`Unsupported mode: ${mode ?? "(missing)"}`);
  }

  const entries = mode === "--staged" ? getStagedEntries() : getPrePushEntries(rest[0] ?? "origin");
  if (entries.length === 0) {
    process.exit(0);
  }

  const biomeFailures = checkBiome(entries.filter((entry) => isBiomeFile(entry.file)));
  const rustFailures = checkRust(entries.filter((entry) => entry.file.endsWith(".rs")));

  if (biomeFailures.length === 0 && rustFailures.length === 0) {
    process.exit(0);
  }

  console.error("Formatting checks failed.");

  if (biomeFailures.length > 0) {
    console.error("");
    console.error("Biome:");
    for (const failure of biomeFailures) {
      console.error(`- ${failure.file}`);
    }
  }

  if (rustFailures.length > 0) {
    console.error("");
    console.error("rustfmt:");
    for (const failure of rustFailures) {
      console.error(`- ${failure.file}`);
    }
  }

  console.error("");
  console.error("Run `pnpm format` and restage the affected files before retrying.");
  process.exit(1);
}

function getStagedEntries() {
  return getDiffEntries(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).map(
    (file) => ({
      file,
      spec: `:${file}`,
    }),
  );
}

function getPrePushEntries(remoteName) {
  const input = readStdin().trim();
  if (!input) {
    return [];
  }

  const entries = new Map();
  for (const line of input.split("\n")) {
    const [localRef, localOid, remoteRef, remoteOid] = line.trim().split(/\s+/);
    if (!localRef || !localOid || !remoteRef || !remoteOid || ZERO_OID.test(localOid)) {
      continue;
    }

    const baseOid = ZERO_OID.test(remoteOid)
      ? resolveNewBranchBase(localOid, remoteName)
      : resolveMergeBase(localOid, remoteOid);

    const files = getDiffEntries([
      "diff",
      "--name-only",
      "--diff-filter=ACMR",
      "-z",
      baseOid,
      localOid,
    ]);
    for (const file of files) {
      entries.set(`${localOid}:${file}`, {
        file,
        spec: `${localOid}:${file}`,
      });
    }
  }

  return [...entries.values()];
}

function resolveNewBranchBase(localOid, remoteName) {
  const candidates = [];
  const remoteHead = git(
    ["symbolic-ref", "--quiet", "--short", `refs/remotes/${remoteName}/HEAD`],
    { allowFailure: true },
  ).stdout.trim();

  if (remoteHead) {
    candidates.push(remoteHead);
  }

  candidates.push(`refs/remotes/${remoteName}/main`, `refs/remotes/${remoteName}/master`, "HEAD");

  for (const candidate of candidates) {
    const mergeBase = git(["merge-base", localOid, candidate], {
      allowFailure: true,
    }).stdout.trim();
    if (mergeBase && mergeBase !== localOid) {
      return mergeBase;
    }
  }

  const parent = git(["rev-parse", `${localOid}^`], { allowFailure: true }).stdout.trim();
  return parent || EMPTY_TREE_OID;
}

function resolveMergeBase(localOid, remoteOid) {
  const mergeBase = git(["merge-base", localOid, remoteOid], { allowFailure: true }).stdout.trim();
  return mergeBase || remoteOid;
}

function getDiffEntries(args) {
  const result = git(args);
  return result.stdout.split("\0").filter(Boolean);
}

function checkBiome(entries) {
  const failures = [];

  for (const entry of entries) {
    const content = readGitObject(entry.spec);
    const result = run(
      "pnpm",
      [
        "exec",
        "biome",
        "format",
        "--config-path",
        biomeConfigPath,
        "--stdin-file-path",
        entry.file,
      ],
      {
        cwd: repoRoot,
        allowFailure: true,
        input: content,
      },
    );

    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status !== 0) {
      if (output.includes("formatter is currently disabled")) {
        continue;
      }

      failures.push(entry);
      continue;
    }

    if (result.stdout !== content) {
      failures.push(entry);
    }
  }

  return failures;
}

function checkRust(entries) {
  if (entries.length === 0) {
    return [];
  }

  const tempRoot = mkdtempSync(path.join(tmpdir(), "harness-docs-rustfmt-"));
  const failures = [];

  try {
    for (const entry of entries) {
      const content = readGitObject(entry.spec);
      const tempFile = path.join(tempRoot, entry.file);

      mkdirSync(path.dirname(tempFile), { recursive: true });
      writeFileSync(tempFile, content);

      const edition = resolveRustEdition(entry.file);
      const result = run(
        "rustfmt",
        ["--check", "--color", "never", "--edition", edition, "--config-path", repoRoot, tempFile],
        {
          cwd: repoRoot,
          allowFailure: true,
        },
      );

      if (result.status !== 0) {
        failures.push(entry);
      }
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  return failures;
}

function resolveRustEdition(file) {
  let currentDir = path.dirname(path.join(repoRoot, file));

  while (currentDir.startsWith(repoRoot)) {
    const cargoTomlPath = path.join(currentDir, "Cargo.toml");
    if (existsSync(cargoTomlPath)) {
      const cargoToml = readFileSync(cargoTomlPath, "utf8");
      const match = cargoToml.match(/^\s*edition\s*=\s*"(2015|2018|2021|2024)"/m);
      return match?.[1] ?? "2021";
    }

    if (currentDir === repoRoot) {
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  return "2021";
}

function isBiomeFile(file) {
  return BIOME_EXTENSIONS.has(path.extname(file));
}

function readGitObject(spec) {
  return git(["show", spec]).stdout;
}

function readStdin() {
  return process.stdin.isTTY ? "" : readFileSync(0, "utf8");
}

function git(args, options = {}) {
  return run("git", args, {
    cwd: repoRoot,
    allowFailure: options.allowFailure ?? false,
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    input: options.input,
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (!options.allowFailure && result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(detail || `${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }

  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
