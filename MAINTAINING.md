# Maintaining

Maintainer-only runbook for operational procedures that aren't obvious from the code.

## Preparing a release

One workflow releases: `.github/workflows/release.yml`. It is `workflow_dispatch` only — nothing dispatches it but a maintainer, from the
Actions tab.

It bumps the version, commits and tags on `main`, builds the three OS distributions, and publishes the GitHub Release with the notes
`scripts/prepare-release.js` cut from `CHANGELOG.md`.

### Tokens

The workflow runs on the default `GITHUB_TOKEN`. There is no Personal Access Token in this repository.

Permissions are granted per job, not repository-wide:

| Job       | Permission        | Why                                                     |
|-----------|-------------------|---------------------------------------------------------|
| `prepare` | `contents: write` | Pushes the release commit and the version tag to `main` |
| `build`   | `contents: read`  | Checks the tag out                                      |
| `publish` | `contents: write` | Creates the GitHub Release and uploads the archives     |

`actions/checkout` persists that token as the git credential helper, which is what the `git push` in `prepare` authenticates with, so the
step needs no `token:` input.

**What the default token impedes:** GitHub starts no workflow run for an event caused by `GITHUB_TOKEN`. The release commit therefore does
not re-run `ci.yml`, and the tag triggers nothing. That is the intended shape here: the `build` job in the same run already checks out that
tag and runs the full suite (`npm test`, `mvn package`, `licenses:check`) on all three OSes before `publish` gets to create anything.

## The Dependabot PR queue

Two kinds of Dependabot PRs land here, and they behave differently:

- **Version updates** — on the shared Saturday 06:00 `Europe/Berlin` slot, one PR per `updates` entry via its
  `<part>-version-updates` group (`applies-to: version-updates`), with a 7-day cooldown and no majors. They cover only the dependencies
  declared in `package.json` / `pom.xml`, never transitive ones.
- **Security updates** — triggered by Dependabot alerts, so they ignore both the schedule and the cooldown, and they do reach transitive
  dependencies. The `<part>-security-updates` group (`applies-to: security-updates`) in each `updates` entry bundles them, giving at most
  one PR per ecosystem *and directory*. Grouping across directories additionally requires the repository-level "Grouped security updates"
  setting (Settings → Advanced Security).

`applies-to` is what keeps these apart: a security update is never folded into a version-update PR, so two PRs per directory is the floor
even when both arrive in the same wave.

### Working the queue

Nothing merges or releases on its own. The weekly routine is:

1. Look at the open Dependabot PRs and read what each one bumps.
2. Merge as required, one after another.
3. Dispatch `release.yml` with `bump=patch` once, after the last merge — see the command above.
