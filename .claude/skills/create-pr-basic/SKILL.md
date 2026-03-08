---
name: create-pr-basic
description: Create a pull request using the project's GitHub PR template
---

Create a pull request for the current branch.

**Title format:** Follow conventional commits (e.g. `feat: add user authentication`, `fix: resolve null pointer in parser`).

**Body:** Look for a PR template in `.github/PULL_REQUEST_TEMPLATE.md` and use it. Fill in each section based on the actual changes in the branch.

Use `gh pr create` to create the PR.
