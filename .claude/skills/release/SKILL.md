---
name: release
description: Cut and deploy a release for any of my projects. Invoked with an explicit semantic version (X.X.X). Reads per-project settings from .claude/release.config.json, commits the working tree under that version, tags it, pushes the tag (triggering the Jenkins multibranch build), waits for that tag's build to go green, verifies the image landed in AWS ECR, then SSH-deploys by bumping the image version in docker-compose and confirms the container stays healthy. Use when the user says "release", "cut a release", "ship it", "tag and deploy", or "/release X.X.X".
---

# Release & deploy

A single, project-agnostic release pipeline driven by a per-project config file.
Same process everywhere; only `.claude/release.config.json` differs.

```
load config → validate → commit → tag X.X.X → [confirm] push → Jenkins build (green)
        → ECR image check → [confirm] SSH deploy (bump compose) → verify
```

## Golden rules (apply to every step)

- **Any issue, at any point → report it and STOP.** Never work around a problem,
  never proceed past a failed check. Surface what went wrong and halt.
- **Two confirmation gates:** before the push (it triggers the prod build) and
  before the deploy (it changes prod). Both need a clear "yes".
- **Never handle secrets.** Don't print or store the Jenkins token, AWS creds, SSH
  keys, or any env-var values. Credential/env changes are applied **manually by the
  user** (see step 8).

## Arguments

```
/release <X.X.X>
  <X.X.X>   required. Bare semantic version, no "v", exactly three numeric parts.
```
Echo back the version you parsed before doing anything. If missing or not a bare
`X.X.X` (e.g. `v1.4`, `1.4`, `1.4.0-rc1`) → report & stop.

## Configuration

All per-project, non-secret settings live in **`.claude/release.config.json`** at
the project root. Secrets are **not** in there — they come from the environment.

**Secrets (must already be in the environment; referenced by name, never seen):**
- Jenkins user + token as the env vars named by `jenkins.userEnv` /
  `jenkins.tokenEnv` (default `JENKINS_USER` / `JENKINS_TOKEN`). Generate the token
  in Jenkins (*Your name → Configure → API Token*). ⚠️ `! export …` lasts only the
  session — **put them in `~/.zshrc`** to persist. AWS/SSH persist via `~/.aws` /
  `~/.ssh` and are assumed already working.

**Assumed on PATH / working:** `git`, `ssh`, `docker compose`, `aws`, `jq`
(macOS ships `jq` at `/usr/bin/jq`). `git remote` configured.

## 0. Load config

```bash
CFG=.claude/release.config.json
[ -f "$CFG" ] || { echo "no $CFG — STOP"; exit 1; }

BRANCH=$(jq -r '.git.branch'                "$CFG")
JENKINS_URL=$(jq -r '.jenkins.url'          "$CFG")
PROJECT=$(jq -r '.jenkins.project'          "$CFG")
J_USER_ENV=$(jq -r '.jenkins.userEnv'       "$CFG");  JU=${!J_USER_ENV}
J_TOK_ENV=$(jq -r '.jenkins.tokenEnv'       "$CFG");  JT=${!J_TOK_ENV}
DISCOVER_TIMEOUT=$(jq -r '.jenkins.discoverTimeoutSeconds' "$CFG")
JPOLL=$(jq -r '.jenkins.pollSeconds'        "$CFG")
REPO=$(jq -r '.ecr.repo'                     "$CFG")
REGION=$(jq -r '.ecr.region'                 "$CFG")
PROFILE=$(jq -r '.ecr.profile // ""'         "$CFG")    # "" = default profile
IMAGE_TAG_TPL=$(jq -r '.ecr.imageTag'        "$CFG")    # "{version}" → bare X.X.X
SSH_HOST=$(jq -r '.deploy.sshHost'           "$CFG")
COMPOSE_PATH=$(jq -r '.deploy.composePath'   "$CFG")
SERVICE=$(jq -r '.deploy.service'            "$CFG")
DOMAIN=$(jq -r '.verify.domain'              "$CFG")
HEALTHCHECK_PATH=$(jq -r '.verify.healthcheckPath' "$CFG")
EXPECT_STATUS=$(jq -r '.verify.expectStatus' "$CFG")
WATCH_SECONDS=$(jq -r '.verify.watchSeconds' "$CFG")
SAMPLE_SECONDS=$(jq -r '.verify.sampleSeconds' "$CFG")
```

- Any **required** value blank (anything except `ecr.profile`) → report & stop with
  the missing key name. Don't proceed with a half-filled config.
- The image tag is `IMAGE_TAG_TPL` with `{version}` replaced by `X.X.X`
  (default just the bare version).
- Reference/example compose file in the repo shows the image-ref line shape so the
  bump in step 8 is precise.

## 1. Validate (preconditions — each one: fail → report & stop)

1. Arg is a bare `X.X.X`.
2. Tag `X.X.X` does **not** already exist (`git tag --list X.X.X` empty). Never
   reuse/overwrite a version.
3. Working tree is **dirty** — there's something to release:
   ```bash
   git status --porcelain   # empty = clean = "nothing to release" → STOP
   ```
4. If `X.X.X` is **lower** than the latest tag
   (`git tag --list | sort -V | tail -1`), surface it and confirm it's intentional.

## 2. Commit

```bash
git add -A
git commit -m "<message>"
```
- Propose a message from `git diff --staged --stat` (+ the user's intent if given);
  show it at the step-4 gate. End the body with the Co-Authored-By trailer.

## 3. Tag

```bash
git tag -a X.X.X -m "Release X.X.X"
```

## 4. ⚠️ CONFIRMATION GATE — push

Show, in one view: version `X.X.X`, the proposed commit message, and
`git diff --staged --stat`. On a clear yes:
```bash
git push --follow-tags
```
Push rejected for any reason → report & stop.

## 5. Wait for the Jenkins build (multibranch — the tag is its own job)

The pushed tag becomes a sub-job; its highest-numbered build (`lastBuild`) is the
verdict.

1. **Wait for the tag job to be discovered** (poll up to `DISCOVER_TIMEOUT`; if it
   never appears → report & stop):
   ```bash
   curl -fsS -u "$JU:$JT" "$JENKINS_URL/job/$PROJECT/api/json?tree=jobs[name]" \
     | jq -e --arg v "X.X.X" '.jobs[]|select(.name==$v)'
   ```
2. **Poll its `lastBuild`** every `JPOLL`s (don't busy-loop):
   ```bash
   curl -fsS -u "$JU:$JT" \
     "$JENKINS_URL/job/$PROJECT/job/X.X.X/lastBuild/api/json?tree=building,result,number"
   ```
   - `building:true` → wait. `result:"SUCCESS"` → proceed.
   - anything else → report & stop with the console URL
     `…/job/$PROJECT/job/X.X.X/<number>/console`.

## 6. Verify the image is in AWS ECR (hard gate)

Green build is the expectation; this is the proof. Missing → report & stop.
```bash
IMAGE_TAG=${IMAGE_TAG_TPL/\{version\}/X.X.X}
aws ecr describe-images --repository-name "$REPO" \
  --image-ids imageTag="$IMAGE_TAG" --region "$REGION" \
  ${PROFILE:+--profile "$PROFILE"} >/dev/null 2>&1 \
  && echo "ECR: $IMAGE_TAG present" \
  || { echo "ECR: $IMAGE_TAG NOT found — STOP"; exit 1; }
```

## 7. ⚠️ CONFIRMATION GATE — deploy

Show what's going out: version `X.X.X`, target `$SSH_HOST`, and whether any env
changes are needed (default: none). Get a clear yes.

## 8. Deploy over SSH (bump the image version)

On the server, against `$COMPOSE_PATH`:
1. **Back up first:** `cp $COMPOSE_PATH $COMPOSE_PATH.bak-X.X.X`.
2. **Bump the image version** on the `$SERVICE` image-ref line to `X.X.X` — a
   precise, reviewable edit (targeted `sed` on the image line, or edit-then-diff),
   never a blind rewrite. The example compose file shows the line shape.
3. **Env vars:** default is **no change**. If one is needed, **pause and have the
   user edit it manually** (names from the example compose file; values never pass
   through the skill). Resume on their go.
4. Pull + restart:
   ```bash
   ssh "$SSH_HOST" "cd $(dirname $COMPOSE_PATH) && docker compose pull $SERVICE && docker compose up -d $SERVICE"
   ```
   Server is assumed authed to pull from ECR; a pull failing on auth → report & stop.

## 9. Verify it held — all three signals over the watch window

Sample over `WATCH_SECONDS` (default 180 = 3 min) every `SAMPLE_SECONDS` (~30s).
Green by the deadline or it's broken. Any signal fails → report & stop, then
**offer rollback**.

1. **Container** runs the new tag `X.X.X` and `RestartCount` stays **0** (a
   crash-loop reads as "up" momentarily — that's why it's sampled, not one-shot).
2. **Docker HEALTHCHECK** = `healthy` (the container's own check), e.g.
   `ssh "$SSH_HOST" "docker inspect -f '{{.State.RestartCount}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' <container>"`.
3. **App reachable through DNS:**
   ```bash
   curl -fsS -o /dev/null -w '%{http_code}' "https://$DOMAIN$HEALTHCHECK_PATH"  # == $EXPECT_STATUS
   ```

## 10. Report

On success: version `X.X.X`, Jenkins build number, ECR image confirmed, and that
the container held healthy for the window.

## Rollback (offered on any deploy/verify failure)

Restore the previous compose and bring the prior version back up:
```bash
ssh "$SSH_HOST" "cd $(dirname $COMPOSE_PATH) && mv $COMPOSE_PATH.bak-X.X.X $COMPOSE_PATH && docker compose up -d $SERVICE"
```
Then verify the prior version is healthy and report what failed. The git tag/commit
stay as-is (the code is released; only the live deploy rolled back) — say so in the
report.
```
