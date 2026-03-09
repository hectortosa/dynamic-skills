# Dynamic Skills for Claude Code

Prompt templates that adapt based on your environment before the agent even sees them.

A hook intercepts your prompt, runs detection logic (file reads, env vars, preferences), and renders a [Nunjucks](https://mozilla.github.io/nunjucks/) template with conditional blocks. The agent only receives the instructions that matter for your setup.

## How it works

```
User types #skill-name
        │
        ▼
┌─────────────────────┐
│  UserPromptSubmit   │
│  hook triggers      │
│  render.ts          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Load template.njk  │
│  + preferences.json │
│  + files.json       │
│  + process.env      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Nunjucks renders   │
│  conditional blocks │
│  with all context   │
└─────────┬───────────┘
          │
          ▼
  Agent receives only
  the relevant instructions
```

## Context sources

Templates have access to three sources of dynamic data:

| Source | How | Example |
|---|---|---|
| **Preferences** | `preferences.json` values | `{{ gtm }}`, `{{ style }}` |
| **Project files** | `files.json` maps variable names to file paths | `{{ pr_template }}` loads `.github/PULL_REQUEST_TEMPLATE.md` |
| **Environment variables** | `process.env` passed automatically | `{{ env.SHELL }}`, `{{ env.USER }}`, `{{ env.ASPIRE_CONTAINER_RUNTIME }}` |

## Examples

### `#get-date` - Preference-based branching

Template renders different instructions based on a `gtm` preference:

```njk
{% if gtm %}
  `date -z GMT`
{% else %}
  `date`
{% endif %}
```

### `#create-pr` - File injection

Injects the project's PR template directly into the agent's instructions via `files.json`:

```json
{
  "pr_template": ".github/PULL_REQUEST_TEMPLATE.md"
}
```

The agent doesn't need to search for or read the template. It's already there.

## Why dynamic skills

The main value is **personalization and adaptability**. The same skill can behave differently based on:

- User preferences (timezone, language, coding style)
- Environment variables (container runtime, shell, OS)
- Project files (templates, configs, conventions)

In benchmarks comparing a dynamic `#create-pr` skill against a static `/create-pr-basic` skill (10 runs each, Claude Opus 4.6), the dynamic skill consistently used fewer turns (8 vs 9 on average). Time and cost differences were minimal for this small repo, but the turn reduction grows with larger codebases where the agent needs multiple steps to discover the same context that a dynamic skill injects upfront.

## Project structure

```
.claude/
├── settings.json              # Hook configuration
├── dynamic-skills/
│   ├── render.ts              # Template renderer (runs on every prompt)
│   ├── preferences.json       # Shared preferences for all skills
│   ├── get-date/
│   │   └── template.njk       # Nunjucks template
│   └── create-pr/
│       ├── template.njk       # Nunjucks template
│       └── files.json         # Maps variable names to project files
├── skills/
│   └── create-pr-basic/
│       └── SKILL.md           # Standard (non-dynamic) skill for comparison
.github/
└── PULL_REQUEST_TEMPLATE.md   # PR template (injected by #create-pr)
```

## Installation

Follow these steps to add the dynamic skills system to your own project.

### Requirements

- [Bun](https://bun.sh/) runtime
- The `nunjucks` package (`bun add nunjucks`)

### Step 1 — Create the `dynamic-skills` folder

```bash
mkdir -p .claude/dynamic-skills
```

### Step 2 — Copy the renderer

Copy `render.ts` into `.claude/dynamic-skills/`. This is the script that intercepts prompts, detects `#skill-name` patterns, and renders the matching Nunjucks templates.

```bash
cp /path/to/render.ts .claude/dynamic-skills/render.ts
```

Or create it manually — see [`render.ts`](.claude/dynamic-skills/render.ts) in this repo for the full source.

### Step 3 — Create a preferences file

Create `.claude/dynamic-skills/preferences.json` with an empty object (or with any default preferences your skills will use):

```json
{}
```

### Step 4 — Register the hook in `settings.json`

Add the `UserPromptSubmit` hook to your `.claude/settings.json` so the renderer runs on every prompt:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bun .claude/dynamic-skills/render.ts"
          }
        ]
      }
    ]
  }
}
```

### Step 5 — Install the dependency

```bash
bun add nunjucks
```

### Step 6 — Create your first skill

Create a directory under `.claude/dynamic-skills/` with a `template.njk` file:

```bash
mkdir -p .claude/dynamic-skills/my-skill
```

```njk
{# .claude/dynamic-skills/my-skill/template.njk #}
Your instructions here. Use {{ env.USER }} for env vars,
{{ preference_name }} for preferences, or {{ file_var }} for file contents.
```

Optionally add a `files.json` to inject project file contents into the template:

```json
{
  "file_var": "relative/path/to/file.md"
}
```

Invoke the skill by typing `#my-skill` in any prompt.

### Scaffolding new skills

This project includes a `/dynamic-skills` skill that walks you through creating a new dynamic skill interactively — it sets up the folder structure, `template.njk`, `files.json`, and `preferences.json` entries for you.
