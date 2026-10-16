# RouteWarden Release & Version Update Guide

This guide explains how versioning works in RouteWarden and how to publish patch updates, minor releases, and new documentation series snapshots.

---

## Architecture & Single Source of Truth

RouteWarden uses `docs/version.json` as the **single source of truth** for versioning across the entire ecosystem:

```json
{
  "traefik": "v1.3.0",
  "caddy": "v1.3.0",
  "nginx": "v1.3.0",
  "tcp": "v3.0.0",
  "cli": "v4.4.0"
}
```

Whenever versions change, RouteWarden Docs' automated tooling (`scripts/sync-version.mjs`) synchronizes them across:
- All VitePress markdown pages using `{{traefik_version}}`, `{{caddy_version}}`, `{{nginx_version}}`, `{{tcp_version}}`, and `{{cli_version}}` dynamic interpolation.
- App-specific docs directories (`docs/tcp/`, `docs/caddy/`, `docs/traefik/`, `docs/cli/`).
- The version dropdown registry in `docs/versions.json`.

---

## 1. Updating Individual App Versions

You can update any individual application's version in `docs/version.json` and sync all associated documentation files in one command:

```bash
# Update TCP Warden documentation version:
node scripts/sync-version.mjs --app tcp --version v3.0.0
# Or using shortcut flag:
node scripts/sync-version.mjs --tcp v3.0.0

# Update Caddy Warden documentation version:
node scripts/sync-version.mjs --caddy v1.2.2

# Update Traefik Warden documentation version:
node scripts/sync-version.mjs --traefik v1.2.2

# Update CLI (rwarden) version:
node scripts/sync-version.mjs --cli v4.0.2

# Synchronize all apps using their current versions in docs/version.json:
node scripts/sync-version.mjs
```

---

## 2. Patch & Maintenance Updates (e.g. `v1.2.1` ➔ `v1.2.2`)

Patch releases and minor non-breaking fixes do not require creating a new documentation snapshot. The documentation continues to serve the `v0.2.x` series.

### Step-by-Step:
1. **Update `docs/version.json`**:
   ```json
   {
     "version": "v0.2.3"
   }
   ```
2. **Run Version Sync**:
   ```bash
   npm run sync-version
   ```
3. **Verify Changes**:
   ```bash
   npm test
   git diff
   ```
4. **Commit and Tag**:
   ```bash
   git commit -am "chore: release v0.2.3"
   git tag v0.2.3
   git push origin main --tags
   ```

---

## 2. New Major or Minor Series Release (e.g. `v0.2.x` ➔ `v0.3.0`)

When releasing a new version series that introduces breaking changes or significant features warranting an archived version of past documentation, use `npm run docs:release`.

### Command:
```bash
npm run docs:release v0.3.0
```

### What Happens Automatically:
1. **Archives Documentation**:
   - Copies `docs/guide`, `docs/reference`, and `docs/examples` into a frozen snapshot directory `docs/v0.2/`.
   - Injects a `Legacy Version Notice` banner with a one-click link back to Latest at the top of each archived markdown file.
2. **Updates Version Registry (`docs/versions.json`)**:
   - Re-points the previous series (`v0.2.x`) to the archived `/v0.2/guide/getting-started`.
   - Promotes the new series (`v0.3.x (Latest)`) to `/guide/getting-started`.
3. **Updates `docs/version.json`**:
   - Sets target version to `v0.3.0`.
4. **Cascades Version Synchronization**:
   - Replaces plugin version strings in `package.json`, `README.md`, and all `docker-compose.yml` examples.
5. **VitePress Live Preview**:
   - The top navbar dropdown immediately allows users to switch between `v0.3.x (Latest)` and legacy `v0.2.x` snapshots.

---

## 3. Testing & CI Verification

Before pushing any release:

```bash
# Run script unit tests and Go plugin tests
npm run test:all

# Validate VitePress docs build and dead-link check
npm run docs:build
```
