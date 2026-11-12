#!/usr/bin/env node
// Regenerates internal/skill/rules/README.md from the rule files themselves.
//
// The rule index is served over MCP as rules://index, so it has to match the
// rules exactly. Titles, domains and counts are read from each rule's header;
// this file only owns the section names and the preamble.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDir = join(root, "internal", "skill", "rules");

// Section order and headings. The key is the domain written in the rule header.
const sections = [
  ["foundations", "Foundations — principles that govern every decision"],
  ["color", "Color — theory, harmony, contrast, systems, accessibility"],
  ["typography", "Typography — selection, hierarchy, setting, type at size"],
  ["layout", "Layout & composition — grids, structure, image placement, scale"],
  ["psychology", "Perception & psychology — how people actually look at a design"],
  ["branding", "Branding & identity — strategy, marks, systems, guidelines"],
  ["illustration", "Illustration — form, line, light, texture, vector production"],
  ["imagery", "Imagery & photography — selection, treatment, compositing"],
  ["print", "Print production — color management, bleed, paper, finishing, prepress"],
  ["ui", "Interface design — systems, components, states, accessibility, data"],
  ["history", "Design history — movements as usable visual languages"],
  ["production", "Critique, quality & delivery — the gate before anything ships"],
];

const preamble = `# Rules index

The authoritative half of the library. Each file is one applied principle, written to be used on
a canvas rather than quoted: purpose, definition, core principles, techniques, when to use and
avoid, common mistakes, a worked example, related rules and sources.

Read the rule that the routed task skill links. Read this index when you need to know what else
exists, or when a decision has no obvious owner.

- **Reading order**: \`SKILL.md\` → \`<task>/SKILL.md\` → the 4–8 rules it links → a reference for numbers.
- **Authority**: when a rule and a reference disagree about a number, the rule wins — fix the reference.
- **Ceiling**: this library holds at most 120 rule files so an agent can hold the index in context.
- **Adding a rule**: follow the template in any existing rule exactly; the H2 headings and their
  order are enforced by \`go test ./internal/skill\`.
- **Regenerating**: \`node scripts/gen-rule-index.mjs\` rewrites this file from the rule headers.
`;

const files = (await readdir(rulesDir)).filter((f) => f.endsWith(".md") && f !== "README.md");
const rules = [];
for (const file of files) {
  const text = await readFile(join(rulesDir, file), "utf8");
  const title = text.match(/^# Rule: (.+)$/m)?.[1];
  const domain = text.match(/\*\*Domain:\*\*\s*([a-z-]+)/)?.[1];
  const id = file.replace(/\.md$/, "");
  if (!title) throw new Error(`${file}: no "# Rule:" title`);
  if (!domain) throw new Error(`${file}: no domain in the header`);
  if (!sections.some(([key]) => key === domain)) throw new Error(`${file}: unknown domain "${domain}"`);
  rules.push({ id, title, domain });
}

const byDomain = new Map(sections.map(([key]) => [key, []]));
for (const rule of rules) byDomain.get(rule.domain).push(rule);
for (const list of byDomain.values()) {
  list.sort((a, b) => Number(a.id.split("-")[0]) - Number(b.id.split("-")[0]) || a.id.localeCompare(b.id));
}

let out = preamble.trimEnd() + "\n\n## Index\n\n| Domain | Rules |\n|---|---|\n";
for (const [key, heading] of sections) {
  out += `| ${heading.split(" — ")[0]} | ${byDomain.get(key).length} |\n`;
}
for (const [key, heading] of sections) {
  const list = byDomain.get(key);
  if (list.length === 0) continue;
  out += `\n## ${heading}\n\n`;
  for (const rule of list) out += `- [\`${rule.id}\`](${rule.id}.md) — ${rule.title}\n`;
}
out += `\n---\n\n${rules.length} rule files. Generated index; edit the rules, not this file.\n`;

await writeFile(join(rulesDir, "README.md"), out, "utf8");
console.log(`wrote ${rules.length} rules across ${sections.length} domains`);
