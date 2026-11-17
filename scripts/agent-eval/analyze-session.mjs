#!/usr/bin/env node
// Summarise one DSH session (a subagent's transcript) for the Avnac rule-timing
// eval. The session file is concatenated zstd frames: one frame per append, so
// scanning for the frame magic and decompressing each slice is the only way to
// get the whole transcript with Node's zstd bindings.
//
// Usage: node analyze-session.mjs <session-dir-or-id>

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { zstdDecompressSync } from "node:zlib";

const sessionsRoot = join(homedir(), ".dsh", "sessions");
const query = process.argv[2];
if (!query) {
  console.error("usage: node analyze-session.mjs <session-dir-or-id>");
  process.exit(2);
}

async function findSessionFile() {
  for (const project of await readdir(sessionsRoot)) {
    const projectDir = join(sessionsRoot, project);
    let entries;
    try {
      entries = await readdir(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.includes(query)) continue;
      const file = join(projectDir, entry.name, "session.v4.jsonl.zstd");
      try {
        await readFile(file);
        return file;
      } catch {
        // not every directory has a transcript
      }
    }
  }
  return null;
}

const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

function decodeFrames(buf) {
  const starts = [];
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === MAGIC[0] && buf[i + 1] === MAGIC[1] && buf[i + 2] === MAGIC[2] && buf[i + 3] === MAGIC[3]) {
      starts.push(i);
    }
  }
  const parts = [];
  let failed = 0;
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : buf.length;
    try {
      parts.push(zstdDecompressSync(buf.subarray(starts[i], end)));
    } catch {
      failed++;
    }
  }
  return { text: Buffer.concat(parts).toString("utf8"), frames: starts.length, failed };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// The MCP tool result is a JSON string inside the dispatch content. Some tools
// return images too; only the text parts matter here.
function resultJson(dispatch) {
  const parts = Array.isArray(dispatch.content) ? dispatch.content : [];
  for (const part of parts) {
    if (part && part.type === "text" && typeof part.text === "string") {
      const parsed = parseJson(part.text);
      if (parsed && typeof parsed === "object") return parsed;
    }
  }
  return null;
}

const file = await findSessionFile();
if (!file) {
  console.error("no session transcript found for", query);
  process.exit(2);
}
const { text, frames, failed } = decodeFrames(await readFile(file));
const events = text
  .split("\n")
  .filter(Boolean)
  .map(parseJson)
  .filter(Boolean);
const header = events.find((e) => e.type === "session") ?? {};
const stepByCall = new Map();
for (const event of events) {
  if (event.type === "tool/call") stepByCall.set(event.data.callId, event.data.step);
}

const mcpCalls = [];
for (const event of events) {
  if (event.type !== "tool/ptc-dispatch") continue;
  const rawName = String(event.data.name ?? "");
  const isAvnacCall = rawName.startsWith("mcp__avnac-studio__");
  const isResourceRead = rawName === "read_mcp_resource" || rawName === "list_mcp_resources";
  if (!isAvnacCall && !isResourceRead) continue;
  const args = event.data.arguments ?? {};
  if (rawName === "read_mcp_resource" && args.server !== "avnac-studio") continue;
  const step = stepByCall.get(event.data.rootCallId) ?? null;
  mcpCalls.push({
    step,
    seq: event.seq,
    name: rawName.replace("mcp__avnac-studio__", ""),
    args,
    isError: Boolean(event.data.isError),
    result: resultJson(event.data),
  });
}

const reads = [];
for (const call of mcpCalls) {
  if (call.name !== "read_mcp_resource") continue;
  const uri = String(call.args?.uri ?? "");
  if (!uri) continue;
  const kind = uri.startsWith("skill://") ? "skill" : uri.startsWith("rules://") ? "rule" : uri.startsWith("references://") ? "reference" : "other";
  reads.push({ step: call.step, kind, uri });
}

const guideCalls = mcpCalls.filter((c) => c.name === "guide" && !c.isError);
const guide = guideCalls.length ? guideCalls[guideCalls.length - 1].result : null;
const composeKinds = new Set(["elements", "vector"]);
const firstCompose = mcpCalls.find(
  (c) => composeKinds.has(c.name) && ["render", "draw"].includes(String(c.args?.op ?? "")),
);
const firstValidate = mcpCalls.find((c) => c.name === "canvas" && c.args?.op === "validate");
const firstRead = reads[0] ?? null;
const firstImage = mcpCalls.find((c) => c.name === "get_canvas_image");

const unsupported = [];
const elementFieldAllow = new Set([
  "type","name","text","x","left","y","top","width","height","fill","stroke","strokeWidth",
  "opacity","rotation","cornerRadius","fontFamily","fontSize","fontWeight","fontStyle",
  "lineHeight","textAlign","underline","url","fit","focalPoint","crop","gradientStops",
  "gradientAngle","shadow","blur","stickerName","sides","points","radius","color",
]);
for (const call of mcpCalls) {
  if (call.name !== "elements") continue;
  const elements = Array.isArray(call.args?.elements) ? call.args.elements : [];
  for (const element of elements) {
    for (const key of Object.keys(element ?? {})) {
      if (!elementFieldAllow.has(key)) unsupported.push({ step: call.step, key, type: element?.type });
    }
  }
}

const before = (step) => mcpCalls.filter((c) => c.step !== null && step !== null && c.step < step);
const summary = {
  session: {
    id: header.id,
    origin: header.origin ?? "main",
    parentSession: header.parentSession ?? null,
    delegationDepth: header.delegationDepth ?? 0,
    cwd: header.cwd,
  },
  transcript: { file, frames, failed, events: events.length },
  mcpCalls: mcpCalls.map((c) => ({ step: c.step, name: c.name, op: c.args?.op ?? null, isError: c.isError })),
  reads,
  guide: guide
    ? {
        confidence: guide.confidence ?? null,
        skill: guide.skill?.uri ?? null,
        matched: guide.matchedTokens ?? null,
        rules: Array.isArray(guide.rules) ? guide.rules.map((r) => r.id) : [],
        checks: Array.isArray(guide.checks) ? guide.checks.map((c) => ({ rule: c.rule, checks: c.checks })) : [],
      }
    : null,
  timing: {
    firstReadStep: firstRead?.step ?? null,
    firstComposeStep: firstCompose?.step ?? null,
    firstValidateStep: firstValidate?.step ?? null,
    firstImageStep: firstImage?.step ?? null,
    readsBeforeCompose: firstCompose?.step ? before(firstCompose.step).filter((c) => c.name === "read_mcp_resource").length : null,
    readsAfterCompose: firstCompose?.step ? mcpCalls.filter((c) => c.name === "read_mcp_resource" && c.step > firstCompose.step).length : null,
    composedBeforeGuide: guideCalls.length && firstCompose?.step ? firstCompose.step < guideCalls[0].step : null,
    validatedBeforeImage: firstValidate && firstImage ? firstValidate.step < firstImage.step : null,
  },
  validate: firstValidate?.result ?? null,
  unsupportedElementFields: unsupported,
};

console.log(JSON.stringify(summary, null, 2));
