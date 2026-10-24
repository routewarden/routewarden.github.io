# Internal Automation Scripts

This directory contains Node.js automation scripts supporting Routewarden's version lifecycle, documentation builds, and multi-file consistency.

---

## Available Scripts

### 1. `sync-version.mjs`
Synchronizes the single source of truth (`docs/version.json`) across the entire repository.

- **CLI Usage**:
  ```bash
  npm run sync-version
  # or
  node scripts/sync-version.mjs
  ```
- **Programmatic API**:
  ```javascript
  import { syncVersion } from './scripts/sync-version.mjs'

  const { updatedFiles, targetVersion } = syncVersion({ rootDir: '.' })
  console.log(`Updated ${updatedFiles.length} files to ${targetVersion}`)
  ```
- **Target Files**:
  - `package.json` (semver without `v`)
  - `docs/versions.json` (`current` series and `(Latest)` item tag/text)
  - `README.md` and `VERSIONING.md`
  - Active documentation markdown files in `docs/` (excluding frozen `docs/v0.x/` snapshots)
  - Static docker-compose / kubernetes example files

---

### 2. `snapshot-version.mjs`
Automates documentation release snapshots when incrementing minor or major version series.

- **CLI Usage**:
  ```bash
  npm run docs:release <new-version>
  # Example:
  npm run docs:release v0.3.0
  ```
- **Programmatic API**:
  ```javascript
  import { snapshotVersion } from './scripts/snapshot-version.mjs'

  const res = snapshotVersion('v0.3.0', { rootDir: '.' })
  console.log(`Archived ${res.previousVersion} to docs/${res.minorSnapshotDirName}/`)
  ```
- **Workflow Steps**:
  1. Copies `docs/guide`, `docs/reference`, and `docs/examples` into `docs/vX.Y/`.
  2. Injects legacy version warning banners into all archived markdown pages.
  3. Replaces dynamic `{{version}}` placeholders with frozen release tags.
  4. Updates `docs/versions.json` registry with `vX.Y.x` series.
  5. Updates `docs/version.json` and runs `sync-version.mjs`.

---

## Running Script Tests

The automation scripts are backed by unit tests written using Node.js's built-in test runner (`node:test` and `node:assert/strict`):

```bash
# Run script unit tests
npm run test:scripts
# or
npm test
```

Test definitions can be inspected and extended in [tests/scripts.test.mjs](../tests/scripts.test.mjs).
