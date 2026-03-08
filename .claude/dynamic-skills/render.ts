import nunjucks from "nunjucks";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const DIR = join(import.meta.dir);
const PREFS_PATH = join(DIR, "preferences.json");

const input = await Bun.stdin.text();
const { prompt } = JSON.parse(input);

// Find available dynamic skills (directories with template.njk)
const skills = readdirSync(DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(DIR, e.name, "template.njk")))
  .map((e) => e.name);

// Detect #skill-name in prompt
const invoked = skills.filter((s) => prompt.includes(`#${s}`));

if (invoked.length === 0) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

// Load preferences
const prefs = existsSync(PREFS_PATH)
  ? JSON.parse(readFileSync(PREFS_PATH, "utf-8"))
  : {};

// Project root (one level up from .claude/dynamic-skills/)
const PROJECT_ROOT = join(DIR, "..", "..");

// Render each invoked skill
const rendered = invoked.map((name) => {
  const template = readFileSync(join(DIR, name, "template.njk"), "utf-8");

  // Load file contents declared in files.json
  const filesPath = join(DIR, name, "files.json");
  const fileVars: Record<string, string> = {};
  if (existsSync(filesPath)) {
    const fileMap = JSON.parse(readFileSync(filesPath, "utf-8"));
    for (const [key, relPath] of Object.entries(fileMap)) {
      const absPath = join(PROJECT_ROOT, relPath as string);
      if (existsSync(absPath)) {
        fileVars[key] = readFileSync(absPath, "utf-8").trim();
      }
    }
  }

  const body = nunjucks.renderString(template, { ...prefs, ...fileVars, env: process.env }).trim();
  return `<command-name>${name}</command-name>\n<command-instructions>\nYou MUST follow these instructions exactly. This is a skill invocation, not a suggestion.\n\n${body}\n</command-instructions>`;
});

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: rendered.join("\n\n"),
    },
  }),
);
