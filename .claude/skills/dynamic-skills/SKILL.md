---
name: dynamic-skills
description: Scaffold a new dynamic skill with folder structure and template files
---

Help the user create a new dynamic skill. A dynamic skill is a Nunjucks template that gets rendered at prompt time via a `UserPromptSubmit` hook, injecting context-aware instructions into the agent's prompt.

## Steps

1. **Ask the user** for the skill name (lowercase, kebab-case, e.g. `run-tests`, `deploy-app`).

2. **Ask what context sources** the skill needs (can be one or more):
   - **Preferences** — values from `preferences.json` (booleans, strings, numbers shared across all skills)
   - **Project files** — file contents injected via `files.json` (maps variable names to project file paths)
   - **Environment variables** — values from `process.env`, accessed as `{{ env.VAR_NAME }}`

3. **Create the folder structure** under `.claude/dynamic-skills/<skill-name>/`:

   ```
   .claude/dynamic-skills/<skill-name>/
   ├── template.njk       # Always created
   └── files.json          # Only if the skill uses project files
   ```

4. **Generate `template.njk`** using the appropriate patterns based on the chosen context sources:

   **For preferences** — use conditional blocks:
   ```njk
   {% if preference_name %}
     Instructions when preference is true/set
   {% else %}
     Instructions when preference is false/unset
   {% endif %}
   ```

   **For project files** — use variable interpolation (variables are loaded from `files.json`):
   ```njk
   Use the following content:

   ```
   {{ variable_name }}
   ```
   ```

   **For environment variables** — use the `env` object:
   ```njk
   {% if env.CI %}
     Running in CI environment
   {% else %}
     Running locally as {{ env.USER }}
   {% endif %}
   ```

   All three can be combined in a single template.

5. **Generate `files.json`** (only if the skill uses project files). This maps variable names to relative file paths from the project root:

   ```json
   {
     "variable_name": "path/to/file.md"
   }
   ```

6. **Update `preferences.json`** if the skill introduces new preferences. Add the new keys to `.claude/dynamic-skills/preferences.json` with sensible defaults. Do not remove existing preferences.

7. **Tell the user** their skill is ready and can be invoked by typing `#<skill-name>` in any prompt.

## Important notes

- The skill name becomes the directory name and the trigger (e.g. directory `run-tests` is triggered by `#run-tests`)
- Templates use [Nunjucks](https://mozilla.github.io/nunjucks/) syntax
- The render context passed to every template is: `{ ...preferences, ...fileVariables, env: process.env }`
- File paths in `files.json` are relative to the project root
- Keep templates focused and concise — the rendered output is injected into the agent's system prompt
