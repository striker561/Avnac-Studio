#!/usr/bin/env node
// Scrapes https://glyphsapp.com/learn/drawing-good-paths into a local, reviewable
// reference: cleaned markdown plus the article images.
//
// The output is a design reference, not a runtime dependency. The vector rules
// in internal/skill/rules cite it from their Sources section.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "reference", "glyphs-drawing-good-paths");
const imgDir = join(outDir, "images");
const SOURCE = "https://glyphsapp.com/learn/drawing-good-paths";
const TICK = String.fromCharCode(96);

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", times: "×", middot: "·", copy: "©",
  eacute: "é", uuml: "ü", ouml: "ö", auml: "ä", szlig: "ß",
  rarr: "→", larr: "←", harr: "↔", shy: "",
};

function decodeEntities(input) {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z][a-z0-9]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();
}

function inlineToMd(html) {
  let s = html;
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => TICK + stripTags(t) + TICK);
  s = s.replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const label = stripTags(text);
    if (!label) return "";
    if (href.startsWith("#")) return label;
    return "[" + label + "](" + href + ")";
  });
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
    const inner = inlineToMd(t);
    return inner ? "*" + inner + "*" : "";
  });
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => {
    const inner = inlineToMd(t);
    return inner ? "**" + inner + "**" : "";
  });
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = stripTags(s);
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

function bestImage(figureHtml) {
  // Animated GIFs are served straight from src and have no srcset.
  const direct = /<img\b[^>]*\bsrc="(https:\/\/[^"]+\.(?:gif|png|jpe?g|webp))"/i.exec(figureHtml);
  if (direct) return direct[1];

  // Otherwise take the largest srcset candidate, preferring PNG (lossless and
  // animation-safe) over WebP. Candidates read "<url> <width>w, <url> <width>w".
  const pngUrls = [];
  for (const tag of figureHtml.match(/<source\b[^>]*>/gi) ?? []) {
    const type = /\btype="([^"]*)"/i.exec(tag);
    if (type && type[1] !== "image/png") continue;
    const set = /(?:data-)?srcset="([^"]+)"/i.exec(tag);
    if (!set) continue;
    for (const part of set[1].split(",")) {
      const bits = part.trim().split(/\s+/);
      if (bits[0] && bits[0].startsWith("https://")) pngUrls.push(bits[0]);
    }
  }
  if (pngUrls.length === 0) return null;
  // The last candidate is the highest resolution; step back one (the 1920 px
  // file) so the checked-in reference stays lightweight.
  return pngUrls.length >= 2 ? pngUrls[pngUrls.length - 2] : pngUrls[0];
}

function figureMarkdown(rawFigure, index) {
  const captionMatch = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(rawFigure);
  const caption = captionMatch ? inlineToMd(captionMatch[1]) : "";
  const url = bestImage(rawFigure);
  if (!url) return null;
  const base = decodeURIComponent(url.split("/").pop() ?? "");
  const name = base.replace(/-q\d+(?=\.)/, "");
  const file = index.toString().padStart(2, "0") + "-" + name;
  // Alt text is plain: strip the markdown emphasis the caption converter added
  // so a screen reader (or a plain renderer) does not read asterisks.
  const alt = (caption || "Illustration from Drawing good paths")
    .replace(/[\[\]*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    markdown:
      "![Figure " + index + ": " + alt + "](images/" + file + ")\n" +
      (caption ? "\n*Figure " + index + " — " + caption + "*" : ""),
    download: { url, file, caption, index },
  };
}

function articleToMarkdown(html) {
  // Figures are extracted first: their best image lives in a <picture> that the
  // sanitising pass below removes.
  let body = html;
  const downloads = [];
  let figureIndex = 0;
  body = body.replace(/<figure\b[\s\S]*?<\/figure>/gi, (raw) => {
    figureIndex += 1;
    const built = figureMarkdown(raw, figureIndex);
    if (!built) return "";
    downloads.push({ ...built.download, markdown: built.markdown });
    return "\n\n@@FIG" + figureIndex + "@@\n\n";
  });

  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<picture\b[\s\S]*?<\/picture>/gi, "")
    .replace(/<button\b[\s\S]*?<\/button>/gi, "")
    .replace(/<source\b[^>]*>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<glyphs-copy-to-clipboard\b[\s\S]*?<\/glyphs-copy-to-clipboard>/gi, "");

  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body);
  const title = h1 ? inlineToMd(h1[1]) : "Drawing good paths";
  body = body.replace(/<h1\b[\s\S]*?<\/h1>/gi, "");

  // Put every block tag on its own line so the parser sees one block per line.
  body = body
    .replace(/<(h[2-4]|p|li|ul|ol|div)\b/gi, "\n<$1")
    .replace(/<\/(h[2-4]|p|li|ul|ol|div)>/gi, "</$1>\n");

  const lines = body.split("\n");
  const out = [];
  let listMode = null;
  let listCounter = 0;

  const flushList = () => {
    if (listMode) {
      out.push("");
      listMode = null;
      listCounter = 0;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const fig = /^@@FIG(\d+)@@$/.exec(line);
    if (fig) {
      flushList();
      const n = Number(fig[1]);
      const built = downloads.find((d) => d.index === n);
      out.push(built ? built.markdown : "");
      continue;
    }

    if (/^<ol\b/i.test(line)) { flushList(); listMode = "ol"; listCounter = 0; continue; }
    if (/^<ul\b/i.test(line)) { flushList(); listMode = "ul"; continue; }
    if (/^<\/(ol|ul)>/i.test(line)) { flushList(); continue; }
    if (/^<div\b/i.test(line)) continue;
    if (/^<\/div>/i.test(line)) { flushList(); continue; }

    const heading = /^<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/i.exec(line);
    if (heading) {
      flushList();
      const text = inlineToMd(heading[2]);
      if (text) out.push("", "#".repeat(Number(heading[1])) + " " + text, "");
      continue;
    }

    const item = /^<li\b[^>]*>([\s\S]*?)<\/li>/i.exec(line);
    if (item) {
      const text = inlineToMd(item[1]);
      if (!text) continue;
      if (listMode === "ol") {
        listCounter += 1;
        out.push(listCounter + ". " + text);
      } else {
        if (listMode !== "ul") { listMode = "ul"; out.push(""); }
        out.push("- " + text);
      }
      continue;
    }

    const para = /^<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(line);
    if (para) {
      flushList();
      const text = inlineToMd(para[1]);
      if (text) out.push("", text, "");
      continue;
    }

    // Anything left is stray text between blocks; keep it as a paragraph.
    const text = inlineToMd(line);
    if (text) {
      flushList();
      out.push("", text, "");
    }
  }

  const markdown = out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  return { title, markdown, downloads };
}

async function main() {
  const response = await fetch(SOURCE, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; Avnac-Studio reference scraper)" },
  });
  if (!response.ok) throw new Error("fetch failed: HTTP " + response.status);
  const html = await response.text();

  const articleStart = html.indexOf("<article");
  if (articleStart < 0) throw new Error("no <article> in the page");
  let article = html.slice(articleStart);
  const articleEnd = article.search(/<\/article>|<footer\b/i);
  if (articleEnd > 0) article = article.slice(0, articleEnd);

  const { title, markdown, downloads } = articleToMarkdown(article);
  await mkdir(imgDir, { recursive: true });

  const saved = [];
  for (const item of downloads) {
    try {
      const res = await fetch(item.url, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; Avnac-Studio reference scraper)",
          referer: SOURCE,
        },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const bytes = Buffer.from(await res.arrayBuffer());
      await writeFile(join(imgDir, item.file), bytes);
      saved.push({ ...item, bytes: bytes.length });
    } catch (err) {
      console.warn("image failed:", item.url, String(err));
    }
  }

  // Drop the table-of-contents block and the language switcher row: they are
  // page chrome, not part of the article.
  const cleaned = markdown
    .replace(/## On this page:[\s\S]*?(?=\n## )/, "")
    .replace(/^\[(en|es|fr|zh)\]\([^)]*\)$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const header = [
    "<!--",
    "  Scraped reference: " + SOURCE,
    "  Captured by scripts/scrape-glyphs-drawing-good-paths.mjs.",
    "  Text and images belong to Glyphs (Glyphs GmbH); kept locally as design reference.",
    "-->",
    "",
    "# " + title,
    "",
    "> Source: [" + SOURCE + "](" + SOURCE + "). Scraped " + new Date().toISOString().slice(0, 10) + ".",
    "> Images are in " + TICK + "images/" + TICK + " and are referenced inline below.",
    "",
  ].join("\n");

  await writeFile(join(outDir, "article.md"), header + "\n" + cleaned + "\n", "utf8");
  await writeFile(
    join(outDir, "manifest.json"),
    JSON.stringify(
      {
        source: SOURCE,
        scrapedAt: new Date().toISOString(),
        title,
        images: saved,
        missing: downloads.filter((d) => !saved.some((s) => s.file === d.file)),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log("wrote article.md (" + markdown.length + " chars) and " + saved.length + "/" + downloads.length + " images");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
