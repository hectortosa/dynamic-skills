# Dynamic Skills for Claude Code

Prompt templates that adapt based on your environment before the agent even sees them.

A hook intercepts your prompt, runs detection logic (shell commands, file reads, env vars), and renders a [Nunjucks](https://mozilla.github.io/nunjucks/) template with conditional blocks. The agent only receives the instructions that matter for your setup.

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

## Experiment: dynamic skill vs static skill

Both skills create a pull request for the current branch. The static skill (`/create-pr-basic`) tells the agent to find and read the PR template. The dynamic skill (`#create-pr`) injects the template content at hook time.

Same task, same repo, same model (Claude Opus 4.6):

| Metric | Static skill | Dynamic skill | Savings |
|---|---|---|---|
| **Total time** | 28.1s | 24.8s | -11.8% |
| **API time** | 25.5s | 21.4s | -16.3% |
| **Turns** | 10 | 6 | -40.0% |
| **Output tokens** | 1,176 | 928 | -21.1% |
| **Cache read tokens** | 61,390 | 46,534 | -24.2% |
| **Cache creation tokens** | 6,227 | 3,338 | -46.4% |
| **Cost** | $0.099 | $0.067 | -32.0% |

The static skill spends extra turns discovering and reading the PR template. The dynamic skill skips that entirely. For a single file injection, that's a 32% cost reduction. The savings compound with skills that need to discover multiple files, detect environment state, or aggregate context from several sources.

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
