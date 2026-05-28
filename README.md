# DevTalk CLI — Release & Run Guide

This repository contains two packages: the CLI client (`client/`) and the server (`server/`).

**Purpose of this document:** quick reference for how releases are performed (automatic publishing to npm) and useful commands to work with the project locally.

**Files to know**
- **Client package:** [client/package.json](client/package.json)
- **Publish workflow:** [.github/workflows/publish-client.yml](.github/workflows/publish-client.yml)
- **CLI entry point:** [client/src/server.js](client/src/server.js)

**Release overview**

- The GitHub Actions workflow `Publish DevTalk CLI` automatically publishes the `devtalk-cli` package from `client/` to npm.
- It runs only when code is pushed to `main`.
- Every eligible push creates a patch release, publishes to npm, and commits the version bump back to `main` with `[skip ci]` so the release commit does not retrigger the workflow.


**Release rule**
- `main` push → patch release only.
- No PR labels, manual workflow inputs, or GitHub CLI release commands are used anymore.

Required repository setup
- Add `NPM_TOKEN` to repository Secrets (Repository Settings → Secrets). This token must be an npm automation token or a token with publish access for the `devtalk-cli` package.
- Ensure GitHub Actions are enabled on the repo and that the workflow file exists at `.github/workflows/publish-client.yml`.

How the workflow behaves
- When a release is triggered it will:
  1. Install dependencies inside `client/`.
  2. Run `npm version patch --no-git-tag-version` in `client/`.
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
- Push your changes to `main` and the workflow will publish automatically.

Example:

```
git checkout main
git merge your-branch
git push origin main
```

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
