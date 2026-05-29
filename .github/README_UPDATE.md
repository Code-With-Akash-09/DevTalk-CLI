# README Update Policy

Scope

- Applies to the npm package README at `client/README.md`.

Policy

- Whenever a new feature, command, option, or significant behavioral change is added to the CLI (code under `client/src/`), the contributor must update `client/README.md` before merging the change.

What to update

- Add or update command usage and examples for any new CLI commands or flags.
- Update the "Install" or "Auto-update hint" sections if install or upgrade steps change.
- Add notes about breaking changes or migration steps if they affect users.

PR checklist (add to PR description)

- [ ] `client/README.md` updated with new feature documentation.
- [ ] Examples tested locally (run the CLI commands manually or via `npx`).
- [ ] If appropriate, bump `client/package.json` `version` or ensure CI release workflow will publish the change.

Reviewer guidance

- Confirm that the README accurately shows how to use the new feature and that examples work.
- If the change is purely internal and there is no user-facing behavior, add a short note in the PR explaining why README changes are not required.

Optional

- Consider adding a short entry to the repository `CHANGELOG.md` (if present) for notable features and releases.

This file documents the minimal README update requirement for the npm package. Follow it to keep the npm package listing accurate for users.
