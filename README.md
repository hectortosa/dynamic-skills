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

## Setup

Requires [Bun](https://bun.sh/) and the `nunjucks` package:

```bash
bun add nunjucks
```

The hook is configured in `.claude/settings.json` to run `render.ts` on every `UserPromptSubmit` event.
