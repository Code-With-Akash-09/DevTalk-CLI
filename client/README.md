# devtalk-cli

> Cross-platform realtime terminal chat CLI.

## Install

Install globally to use the `devtalk-cli` command:

```bash
npm install -g devtalk-cli
```

Or run it instantly with `npx`:

```bash
npx devtalk-cli register
```

## Requirements

- Node.js 16+
- npm

## Usage

| Command | Description |
| --- | --- |
| `devtalk-cli register` | Register a new user |
| `devtalk-cli login` | Log in with an existing account |
| `devtalk-cli chat` | Start the chat client |

## Examples

```bash
# Register a new user
devtalk-cli register

# Log in
devtalk-cli login

# Start chat
devtalk-cli chat
```

## Updates

On start, the CLI checks the npm registry for newer versions. To upgrade:

```bash
npm install -g devtalk-cli
```

## Repository

This package is part of the DevTalk CLI monorepo. See the repository root for the server and contributing guidelines.

- CLI entry: [src/server.js](src/server.js)

## License

MIT — see the parent repository `LICENSE` file.

## Author

Akash Lakade
