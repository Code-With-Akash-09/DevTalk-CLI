# DevTalk CLI

> Realtime terminal chat for fast team conversations.

DevTalk CLI includes two packages: the CLI client (`client/`) and the server (`server/`). This README covers quick start, running locally, usage examples, and the automated release/version flow.

---

## Quick Start

**Requirements:** Node.js 16+ and npm.

```bash
# Install globally from npm
npm install -g devtalk-cli
```

---

## Usage

### 1. Register an account

```bash
devtalk-cli register
```

### 2. Login

```bash
devtalk-cli login
```

### 3. List available rooms

```bash
devtalk-cli rooms
```

Example output:
```
 Available Rooms

  # general
  # backend
  # design

Join a room: devtalk-cli chat --room <name>
```

### 4. Join a room and chat

```bash
# Join the default room (general)
devtalk-cli chat

# Join a specific room
devtalk-cli chat --room backend
devtalk-cli chat -r design
```

### Chat keyboard shortcuts

| Key | Action |
|---|---|
| `Enter` / `Ctrl+S` | Send message |
| `Esc` | Quit chat |
| `Ctrl+L` | Clear message history |

---

## How rooms work

- **Rooms are created automatically** the first time someone chats in them — no manual setup needed.
- **Message history** is persisted in MongoDB. The last 50 messages in a room are shown when you join.
- **All messages are scoped to a room** — messages in `#backend` won't appear in `#general`.
- **Messages auto-expire after 24 hours** — chat history is ephemeral by design, powered by a MongoDB TTL index on `createdAt`.


---

## Running Locally

### Start the server

```bash
cd server
npm install
npm start
```

### Start the CLI (client)

```bash
cd client
npm install
node src/server.js --help

# Register, login, list rooms, and chat
node src/server.js register
node src/server.js login
node src/server.js rooms
node src/server.js chat --room general
```

---

## Release & Versioning (automated)

- **Trigger:** pushes to `main` affecting `client/**` trigger the `Publish DevTalk CLI` workflow.
- **Skip CI:** commits containing `[skip ci]` are ignored by the workflow.
- **Release type** is chosen from the pushed commit message:
  - `BREAKING CHANGE` in the body or a `!` in the subject → `major`
  - subject starting with `feat:` or `feat(` → `minor`
  - subject starting with `fix:`, `refactor:`, or other fixes → `patch`
  - default → `patch`

### Workflow steps (summary)

1. Checkout and set up Node (uses Node 20, working directory: `client/`).
2. Install dependencies (`npm ci`).
3. Determine release type from the commit message.
4. Run `npm version <patch|minor|major> --no-git-tag-version` in `client/`.
5. Publish to npm (`npm publish --access public`) using `NODE_AUTH_TOKEN` from the `NPM_TOKEN` secret.
6. Commit `package.json` and `package-lock.json` with `[skip ci]` and push back to `main`.
7. Tag the release as `v<version>` and push the tag.
8. Create a GitHub release using the tag.

### Commit message examples

```bash
# Patch (bugfix)
git commit -m "fix: correct login retry handling"

# Minor (feature)
git commit -m "feat: add chat typing indicator"

# Major (breaking change)
git commit -m "feat!: change message format to v2"
```

> **Note:** Add `NPM_TOKEN` to repository Secrets (Settings → Secrets → Actions) with publish permission for the `devtalk-cli` package.

---

## Repository Layout

```
devtalk-cli/
├── client/          # CLI client application
│   └── src/
│       ├── server.js          # CLI entry point
│       └── commands/
│           ├── register.js
│           ├── login.js
│           ├── rooms.js       # List rooms
│           └── chat.js        # Realtime chat UI
└── server/          # API + WebSocket server
    └── src/
        ├── server.js
        ├── config/
        ├── controller/
        ├── middleware/
        └── routes/
```

---

## Contributing

- Fork and open a PR with a clear description of changes.
- Keep commits focused and use conventional commit-style messages when possible.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## Useful Links

- Client package: [client/package.json](client/package.json)
- Publish workflow: [.github/workflows/publish-client.yml](.github/workflows/publish-client.yml)
- CLI entry point: [client/src/server.js](client/src/server.js)

---

## License

This project is open source. See [LICENSE](LICENSE) for the full license text.
