#!/usr/bin/env node
// Release helper for the APK build workflow.
//
// A new release (version bump + APK + GitHub release) is only created when a
// commit message contains "[RELEASE]". By default the PATCH version is bumped
// (0.0.3 -> 0.0.4). To jump to a specific version use "[RELEASE][x.y]" (which
// becomes x.y.0) or "[RELEASE][x.y.z]".
//
// Modes:
//   detect     Read commit subjects from stdin (one per line) and print
//              "released=true|false" plus the target "version=" (GITHUB_OUTPUT
//              compatible). Reads the current version from package.json.
//   set <raw>  Normalize an explicit version ("1.2" -> "1.2.0") and print the
//              same GITHUB_OUTPUT format. Used by manual workflow_dispatch.
//   apply <v>  Write <v> into package.json and package-lock.json (no git ops).

import { readFileSync, writeFileSync } from "node:fs";

const [mode, arg] = process.argv.slice(2);

function currentVersion() {
  return JSON.parse(readFileSync("package.json", "utf8")).version;
}

function targetVersionFrom(messages, current) {
  const releaseMsg = messages.findLast((m) => m.includes("[RELEASE]"));
  if (!releaseMsg) return null;

  const full = releaseMsg.match(/\[RELEASE\]\[(\d+)\.(\d+)\.(\d+)\]/);
  if (full) return `${full[1]}.${full[2]}.${full[3]}`;

  const minor = releaseMsg.match(/\[RELEASE\]\[(\d+)\.(\d+)\]/);
  if (minor) return `${minor[1]}.${minor[2]}.0`;

  const part = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!part) throw new Error(`Versión actual inválida en package.json: "${current}"`);
  return `${part[1]}.${part[2]}.${Number(part[3]) + 1}`;
}

function normalize(raw) {
  let m = raw.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  m = raw.match(/^(\d+)\.(\d+)$/);
  if (m) return `${m[1]}.${m[2]}.0`;
  throw new Error(`Versión inválida: "${raw}". Usa "1.2" o "1.2.0".`);
}

if (mode === "detect") {
  process.stdin.setEncoding("utf8");
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const messages = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const version = targetVersionFrom(messages, currentVersion());
  console.log(version ? `released=true\nversion=${version}` : "released=false");
  process.exit(0);
}

if (mode === "set") {
  if (!arg) throw new Error("Falta la versión (ej: 1.2 o 1.2.0)");
  console.log(`released=true\nversion=${normalize(arg)}`);
  process.exit(0);
}

if (mode === "apply") {
  if (!arg) throw new Error("Falta la versión a aplicar (ej: 1.2.0)");
  const version = normalize(arg);

  const pkgPath = "package.json";
  const lockPath = "package-lock.json";

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  if (typeof lock.version === "string") lock.version = version;
  // npm ci checks the root package version inside package-lock against
  // package.json, so keep both in sync too.
  if (lock.packages && lock.packages[""] && typeof lock.packages[""].version === "string") {
    lock.packages[""].version = version;
  }
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");

  console.log(`version=${version}`);
  process.exit(0);
}

throw new Error(`Uso: release.mjs detect|set <v>|apply <v>`);