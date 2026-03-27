import { mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const homebrewNode = "/opt/homebrew/bin/node";
const npmCli = "/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js";
const runtimeDir = path.join(os.homedir(), ".codex", "vendor", "shadcn-mcp");
const shadcnEntry = path.join(runtimeDir, "node_modules", "shadcn", "dist", "index.js");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}

if (!existsSync(shadcnEntry)) {
  mkdirSync(runtimeDir, {
    recursive: true,
  });

  const installResult = spawnSync(
    homebrewNode,
    [npmCli, "install", "--no-save", "--prefix", runtimeDir, "shadcn@latest"],
    {
      stdio: "inherit",
    },
  );

  if (installResult.status !== 0) {
    process.exit(installResult.status ?? 1);
  }
}

run(homebrewNode, [shadcnEntry, "mcp", ...process.argv.slice(2)]);
