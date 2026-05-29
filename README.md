# DevTalk CLI

DevTalk CLI includes two packages: the CLI client (`client/`) and the server (`server/`). This README covers quick start, running locally, and the automated release/version flow.

Quick start

- Requirements: Node.js 16+ and npm.
- Install dependencies:

  ```bash
  cd client
  npm install

  cd ../server
  npm install
  ```

Running locally

- Start the server:

  ```bash
  cd server
  npm start
  ```

- Start the CLI (client):

  ```bash
  cd client
  npm start
  # or: node src/server.js
  ```

Release & Versioning (automated)

- Trigger: pushes to `main` affecting `client/**` or the workflow file trigger the `Publish DevTalk CLI` workflow.
- Skip CI: commits containing `[skip ci]` are ignored by the workflow.
- How the release type is chosen (from the pushed commit message):
  - `BREAKING CHANGE` in the body or a `!` in the subject → `major`
  - subject starting with `feat:` or `feat(` → `minor`
  - subject starting with `fix:`, `refactor:` or other non-feature fixes → `patch`
  - default → `patch`
- Workflow steps (summary):
  1. Checkout and set up Node (uses Node 20, working directory: `client/`).
  2. Install dependencies (`npm ci`).
  3. Determine release type from the commit message.
  4. Run `npm version <patch|minor|major> --no-git-tag-version` in `client/`.
  5. Publish to npm (`npm publish --access public`) using `NODE_AUTH_TOKEN` from the `NPM_TOKEN` repository secret.
  6. Commit `package.json` and `package-lock.json` with message `chore(release): bump client version [skip ci]` and push back to `main`.
  7. Tag the release as `v<version>` and push the tag.
  8. Create a GitHub release using the tag.

Requirements

- Add `NPM_TOKEN` to repository Secrets (Repository Settings → Secrets → Actions). This must be an npm token with publish permission for the `devtalk-cli` package.
- Do not create repository secrets that begin with `GITHUB_`. The workflow uses the built-in `secrets.GITHUB_TOKEN` provided by Actions.

Examples (commit messages)

- Patch (bugfix):

  ```bash
  git commit -m "fix: correct login retry handling"
  git push origin main
  ```

- Minor (feature):

  ```bash
  git commit -m "feat: add chat typing indicator"
  git push origin main
  ```

- Major (breaking change):

  ```bash
  git commit -m "feat!: change message format to v2"
  # or include a BREAKING CHANGE in the commit body
  git push origin main
  ```

Repository layout

- `client/` — CLI client application and package.json
- `server/` — API server and related code

Contributing

- Fork and open a PR with a clear description of changes.
- Keep commits focused and use conventional commit-style messages when possible.

Useful links

- Client package: [client/package.json](client/package.json)
- Publish workflow: [.github/workflows/publish-client.yml](.github/workflows/publish-client.yml)
- CLI entry point: [client/src/server.js](client/src/server.js)

License

This project is open source. See the `LICENSE` file if present.

```

```
