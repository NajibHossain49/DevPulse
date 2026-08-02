import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });

copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
copyFileSync(join(root, "src", "styles.css"), join(dist, "styles.css"));
copyFileSync(join(root, "src", "popup.html"), join(dist, "popup.html"));

// content.ts / popup.ts compile to dist/*.js already via tsc.
// Ensure popup.html references the built popup.js next to it (already does).

if (!existsSync(join(dist, "content.js"))) {
  throw new Error("content.js missing — run tsc first");
}

// Chrome content scripts can't use ES modules by default; rewrite to IIFE-friendly JS if needed.
// Our tsconfig emits ES2020 modules — strip import/export for content/popup by reading and wrapping.
for (const name of ["content.js", "popup.js"]) {
  const file = join(dist, name);
  let code = readFileSync(file, "utf8");
  // Remove export statements (none expected) and keep as classic script.
  code = code.replace(/^export\s*\{[^}]*\};?\s*$/gm, "");
  writeFileSync(file, code);
}

console.log("Browser extension assets copied to dist/");
