# DevTalk CLI — Release & Run Guide

This repository contains two packages: the CLI client (`client/`) and the server (`server/`).

**Purpose of this document:** quick reference for how releases are performed (automatic publishing to npm) and useful commands to work with the project locally.

**Files to know**
- **Client package:** [client/package.json](client/package.json)
- **Publish workflow:** [.github/workflows/publish-client.yml](.github/workflows/publish-client.yml)
- **CLI entry point:** [client/src/server.js](client/src/server.js)

**Release overview**

- The GitHub Actions workflow `Publish DevTalk CLI` automatically publishes the `devtalk-cli` package from `client/` to npm.
- The workflow can be triggered in three ways (precedence order):
  1. PR label (recommended): add one of `release:patch`, `release:minor`, `release:major` to the merged PR and the workflow will publish that release type.
  2. Manual trigger: run the workflow from the GitHub UI or via GitHub CLI and set the `release_type` input (`patch`, `minor`, `major`, or `auto`).
  3. Auto-detection from commit message: the workflow falls back to commit message heuristics when no PR label or manual input is provided.

**Commit message heuristics**
- `BREAKING CHANGE` or `!` → major release (e.g., 1.4.2 → 2.0.0)
- `feat:` or commit subject starting with `feat(` → minor release (e.g., 1.4.2 → 1.5.0)
- `fix:`, `refactor:` or commit subject starting with `fix(` / `refactor(` → patch release (e.g., 1.4.2 → 1.4.3)

Note: The repository uses conventional-commit style cues but will accept PR labels as the source-of-truth for team workflows.

Required repository setup
- Add `NPM_TOKEN` to repository Secrets (Repository Settings → Secrets). This token needs publish access for the `devtalk-cli` npm package.
- Ensure GitHub Actions are enabled on the repo and that the workflow file exists at `.github/workflows/publish-client.yml`.
- If you plan to run releases from your terminal, install and authenticate the GitHub CLI: `gh auth login`.

How the workflow behaves
- When a release is triggered it will:
  1. Install dependencies inside `client/`.
  2. Determine the release type (PR label → manual input → commit heuristics).
  3. Run `npm version <patch|minor|major> --no-git-tag-version` in `client/`.
  4. Publish to npm with `npm publish --access public` (using `NPM_TOKEN`).
  5. Commit the updated `package.json` and `package-lock.json` back to `main` with message `chore(release): bump client version [skip ci]`.

Commands — quick reference

General (repo root)
- Install dependencies for both packages (run separately):

```
cd client
npm install

cd ../server
npm install
```

Run the server

```
cd server
npm start
```

Run the CLI locally

```
cd client
npm start
# or run the script directly: node src/server.js
```

Release commands
- Automatic (merge a PR with a release label)
  - Add label `release:patch`, `release:minor`, or `release:major` to the PR, then merge to `main`. The workflow will publish accordingly.

- Manual via GitHub UI
  - Go to Actions → Publish DevTalk CLI → Run workflow → choose `release_type`.

- Manual via GitHub CLI / npm scripts (convenience wrappers)
  - From `client/`, the repo includes npm scripts that call the `gh` CLI:

```
npm run release        # auto-detect
npm run release:patch  # force patch
npm run release:minor  # force minor
npm run release:major  # force major
```

Notes when using `npm run release`
- `npm run release*` uses `gh workflow run` and requires `gh` CLI installed and authenticated.
- `npm run release` uses `release_type=auto` by default — the workflow will use PR label or commit heuristics.

Verification & debugging
- After publishing, confirm the new version on npm:

```
npm view devtalk-cli version
```

- If a workflow run fails, inspect the Actions run logs; common issues are missing `NPM_TOKEN` or authentication errors with `gh` when running locally.

Advanced suggestions (optional)
- Enforce label requirement by adding a branch protection rule or a merge-check workflow that prevents merging without a release label.
- Add PR templates that remind contributors to add a release label when opening PRs.

If you want, I can add a PR template and a small `.github/labels.yml` recommendation file to create the suggested labels programmatically.

---

File links
- Workflow: [.github/workflows/publish-client.yml](.github/workflows/publish-client.yml)
- Client package: [client/package.json](client/package.json)
- CLI entry: [client/src/server.js](client/src/server.js)
