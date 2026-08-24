# Dependabot

How dependency updates reach a release. `.github/dependabot.yml` opens the PRs; a maintainer merges them and dispatches `release.yml`.

ADR-1 through ADR-3 and ADR-5 describe the automation that used to sit in between — `dependabot-auto-merge.yml`,
`dependabot-rebase-behind.yml` and `dependabot-auto-release.yml`, all three deleted.s.

## ADR-1: Every dependency update is released, as a patch version, without asking

**Status:** SUPERSEDED by ADR-6

**Decision:** A merged Dependabot PR touching npm or Maven dependencies dispatches `release.yml` with `bump=patch` — weekly version
updates and GHSA-triggered security updates alike. No human step sits between the merge and the published release.

**Rationale:** The dependencies ship inside the Electron app, so a bump that is merged but not released has changed nothing for any user.
That matters most for security updates, where the advisory is only answered once the fix is downloadable. Patch is always the right bump,
because the `ignore` rules drop every `version-update:semver-major` before it becomes a PR.

**Consequences, accepted:**

Versions advance on dependency churn alone, and no human sees such a release before it is published — it rests entirely on the CI gate and
the three-OS build in `release.yml`.

## ADR-2: A batch of PRs produces one release, dispatched by the last one to merge

**Status:** SUPERSEDED by ADR-6

**Decision:** `dependabot-auto-release.yml` runs on every closed Dependabot PR and dispatches `release.yml` only when no Dependabot PR is
left open against `main`. Every merge in a batch except the last one therefore releases nothing.

**Rationale:** Dependabot arrives in bursts. Releasing per PR would run the full three-OS build each time, producing patch versions that are
known to be patched immediately by the next release.

**Consequences, accepted:**

A batch whose final PR is *closed* rather than merged dispatches nothing, leaving the earlier merges unreleased until some later merge
drains the queue. This can be mitigated by hand, since `release.yml` is a `workflow_dispatch`.

## ADR-3: GitHub Actions updates never trigger a release

**Status:** SUPERSEDED by ADR-6

**Decision:** PRs on `dependabot/github_actions/*` branches are excluded from `dependabot-auto-release.yml`, both as a trigger and from the
count it waits for.

**Rationale:** Nothing in `.github/workflows` ships, so such a release would be identical to its predecessor. The exclusion must cover the
count too: an open github-actions PR would otherwise hold the batch back indefinitely, since merging it releases nothing.

## ADR-4: Each ecosystem gets its own Dependabot groups, all sharing one weekly slot

**Status:** ACCEPTED

**Decision:** Every entry in `.github/dependabot.yml` carries its own `schedule` and its own `applies-to: version-updates` and
`applies-to: security-updates` groups, all on one slot: Saturday 06:00 `Europe/Berlin`. No `multi-ecosystem-group`.

**Rationale:** The multi-ecosystem group gave a tidier weekly PR, but it also claimed every security update these entries generated and
mishandled it twice over. Its branch names omit the directory, so on 2026-08-04 PRs #49 and #52 — the same advisory in two directories —
collided on one name. And every job touching such a PR is dispatched as a refresh of the group, finds no group PR to refresh, and no-ops:
that made `@dependabot rebase` useless and left #50, #51 and #53 unable to catch up with `main`, hence unable to merge at all under the
up-to-date requirement. Per-ecosystem groups restore the standard `dependabot/<manager>/<directory>/<group>-<hash>` namespace, in which
both work.

One shared slot is what lets ADR-2 and ADR-5 collapse the week's updates into one release. Saturday morning leaves the weekend to react.

## ADR-5: The count is preceded by a 15-minute wait, and later merges cancel earlier ones

**Status:** SUPERSEDED by ADR-6

**Decision:** `dependabot-auto-release.yml` sleeps 15 minutes before counting open Dependabot PRs, under a `concurrency` group keyed on the
PR author with `cancel-in-progress: true`.

**Rationale:** ADR-2's count is a snapshot, and a snapshot cannot see a PR that has not been opened yet. The previous assumption, that the
PR runtime itself was longer than the time dependabot needs to open the next PR proved false.

Waiting first closes it: each later merge starts a run that cancels the one still sleeping, so only the last merge of a wave reaches the
count. The count still earns its place for the case the wait does not cover — a PR that is already open but sits in CI longer than the wait.
The wait also does what the shared weekly slot of ADR-4 intends but cannot guarantee on its own: the client, api and server PRs of one
Saturday collapse into a single release.

The concurrency group is keyed on `github.event.pull_request.user.login` because GitHub evaluates concurrency before the job's `if`. Every
closed PR — human ones included — starts a run of this workflow, so an unkeyed group would let a human PR closing cancel a wave's pending
release.

**Consequences, accepted:**

A release now trails the last merge of a wave by 15 minutes, security updates included, and a runner idles for that time. Canceled runs
show up in the Actions list as a normal part of a wave rather than as failures. A wave whose PRs are spaced more than 15 minutes apart still
splits into two releases, but the count keeps that harmless whenever the later PR is already open.

## ADR-6: Dependabot only opens PRs; merging and releasing are both manual

**Status:** ACCEPTED

**Decision:** No workflow merges a Dependabot PR, and no workflow keeps one up to date with `main`. Maintainers check the open PRs, merge
the ones worth merging, and then dispatch `release.yml` with `bump=patch` by hand. `dependabot-auto-merge.yml`,
`dependabot-rebase-behind.yml` and `dependabot-auto-release.yml` are deleted; `release.yml` remains `workflow_dispatch`-only.

**Rationale:** The previous workflow was consuming too many resources, since it created a cascade of workflows.

Dropping the cascade also drops the Personal Access Token. The former `RELEASE_TOKEN` existed only so that a merge would trigger the next
workflow, since GitHub starts no run for an event caused by `GITHUB_TOKEN`. With nothing left to cascade into, `release.yml` runs on the
default token with per-job `contents` permissions, and the secret is deleted from both the Actions and the Dependabot store. See
`MAINTAINING.md`.

**Consequences, accepted:**

A dependency fix reaches users when the next manual merges of Dependabot PRs and a manual release occur. There are no more automatic
releases. Neither for regular Dependabot upgrades, nor for GHSA-triggered updates.
