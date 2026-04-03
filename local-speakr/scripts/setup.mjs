#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin, stdout, platform, env } from "node:process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_INDEX = resolve(__dirname, "..", "dist", "index.js");

// --- Config paths per platform ---

function getConfigPaths() {
  const home = homedir();
  const paths = [];

  // Claude Code CLI
  paths.push({
    label: "Claude Code CLI",
    path: join(home, ".claude", "settings.json"),
  });

  // Claude Desktop
  if (platform === "win32") {
    const appdata = env.APPDATA || join(home, "AppData", "Roaming");
    paths.push({
      label: "Claude Desktop",
      path: join(appdata, "Claude", "claude_desktop_config.json"),
    });
  } else if (platform === "darwin") {
    paths.push({
      label: "Claude Desktop",
      path: join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    });
  } else {
    // Linux — Claude Desktop config location (XDG)
    const configDir = env.XDG_CONFIG_HOME || join(home, ".config");
    paths.push({
      label: "Claude Desktop",
      path: join(configDir, "Claude", "claude_desktop_config.json"),
    });
  }

  return paths;
}

// --- Read / merge / write config ---

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function upsertMcpServer(config, distPath, speakrUrl, speakrToken) {
  if (!config) config = {};
  if (!config.mcpServers) config.mcpServers = {};

  config.mcpServers["local-speakr"] = {
    command: "node",
    args: [distPath],
    env: {
      SPEAKR_URL: speakrUrl,
      SPEAKR_TOKEN: speakrToken,
    },
  };

  return config;
}

function writeConfig(filePath, config) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

// --- Main ---

async function ask(rl, prompt) {
  const answer = await rl.question(prompt);
  if (answer === undefined) {
    console.log("\n  Aborted (no input).");
    process.exit(1);
  }
  return answer.trim();
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log("\n  LocalSpeakR MCP — Setup\n");

  const speakrUrl = (await ask(rl, "  Speakr URL [http://localhost:8899]: ")) || "http://localhost:8899";

  let speakrToken = "";
  while (!speakrToken) {
    speakrToken = await ask(rl, "  Speakr API token: ");
    if (!speakrToken) console.log("  Token is required.");
  }

  rl.close();

  // Normalize dist path: on Windows use backslashes for JSON readability
  const distPath = platform === "win32"
    ? DIST_INDEX.replace(/\//g, "\\")
    : DIST_INDEX;

  const configs = getConfigPaths();
  console.log();

  for (const { label, path } of configs) {
    try {
      const existing = readJsonSafe(path);
      const merged = upsertMcpServer(existing, distPath, speakrUrl, speakrToken);
      writeConfig(path, merged);
      console.log(`  + ${label}: ${path}`);
    } catch (err) {
      console.log(`  x ${label}: ${path}`);
      console.log(`    Error: ${err.message}`);
    }
  }

  console.log("\n  Done. Restart Claude Code / Claude Desktop to apply.\n");
}

main();
