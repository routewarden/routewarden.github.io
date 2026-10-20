import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { syncVersion, normalizeAppName, resolveDocsRootDir } from '../scripts/sync-version.mjs'
import { snapshotVersion } from '../scripts/snapshot-version.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const docsProjectRoot = path.resolve(__dirname, '..')
const uninstallScriptPath = path.join(docsProjectRoot, 'docs/public/uninstall.sh')
const installScriptPath = path.join(docsProjectRoot, 'docs/public/install.sh')

/**
 * Creates a mock isolated workspace for testing scripts
 */
function createMockWorkspace() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routewarden-scripts-test-'))

  // Setup docs structure
  fs.mkdirSync(path.join(tempDir, 'docs/guide'), { recursive: true })
  fs.mkdirSync(path.join(tempDir, 'docs/reference'), { recursive: true })
  fs.mkdirSync(path.join(tempDir, 'docs/examples'), { recursive: true })

  fs.writeFileSync(
    path.join(tempDir, 'docs/version.json'),
    JSON.stringify({ version: 'v0.2.1' }, null, 2)
  )

  fs.writeFileSync(
    path.join(tempDir, 'docs/versions.json'),
    JSON.stringify(
      {
        current: 'v0.2.x',
        versions: [
          { text: 'v0.2.x (Latest)', link: '/guide/getting-started', tag: 'v0.2.x' },
          { text: 'v0.1.x', link: '/v0.1/guide/getting-started', tag: 'v0.1.x' }
        ]
      },
      null,
      2
    )
  )

  fs.writeFileSync(
    path.join(tempDir, 'docs/guide/getting-started.md'),
    '# Getting Started\n\nInstall version: {{version}}\n'
  )

  // Setup package.json
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ name: 'routewarden', version: '0.2.1' }, null, 2)
  )

  // Setup README.md
  fs.writeFileSync(
    path.join(tempDir, 'README.md'),
    '--experimental.plugins.routewarden.version=v0.2.1\nversion: v0.2.1\n'
  )

  // Setup sample example
  fs.mkdirSync(path.join(tempDir, 'examples/01-basic-sensitive-files'), { recursive: true })
  fs.writeFileSync(
    path.join(tempDir, 'examples/01-basic-sensitive-files/docker-compose.yml'),
    '--experimental.plugins.routewarden.version=v0.2.1\n'
  )

  // Setup sample tcp files
  fs.mkdirSync(path.join(tempDir, 'docs/tcp'), { recursive: true })
  fs.writeFileSync(
    path.join(tempDir, 'docs/tcp/api.md'),
    '{\n  "status": "ok",\n  "version": "2.1.0"\n}\n'
  )
  fs.writeFileSync(
    path.join(tempDir, 'docs/tcp/getting-started.md'),
    '# {"status":"ok","version":"2.1.0"}\n'
  )

  // Setup sample caddy files
  fs.mkdirSync(path.join(tempDir, 'docs/caddy'), { recursive: true })
  fs.writeFileSync(
    path.join(tempDir, 'docs/caddy/getting-started.md'),
    'RUN xcaddy build --with github.com/routewarden/caddy-warden@v1.0.0\n'
  )

  // Setup sample nginx files
  fs.mkdirSync(path.join(tempDir, 'docs/nginx'), { recursive: true })
  fs.writeFileSync(
    path.join(tempDir, 'docs/nginx/getting-started.md'),
    '# Clone: https://github.com/routewarden/nginx-warden@v1.0.0\n'
  )

  return tempDir
}

test('syncVersion updates versions in files when target version changes', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  // Change version in docs/version.json to v0.3.0
  fs.writeFileSync(
    path.join(ws, 'docs/version.json'),
    JSON.stringify({ version: 'v0.3.0' }, null, 2)
  )

  const result = syncVersion({ rootDir: ws })

  assert.equal(result.targetVersion, 'v0.3.0')
  assert.ok(!result.updatedFiles.includes('package.json'))
  assert.ok(result.updatedFiles.includes('docs/versions.json'))
  assert.ok(result.updatedFiles.includes('README.md'))
  assert.ok(result.updatedFiles.includes('examples/01-basic-sensitive-files/docker-compose.yml'))

  // Verify docs/versions.json
  const registry = JSON.parse(fs.readFileSync(path.join(ws, 'docs/versions.json'), 'utf8'))
  assert.equal(registry.current, 'v0.3.x')
  assert.equal(registry.versions[0].tag, 'v0.3.x')
  assert.equal(registry.versions[0].text, 'v0.3.x (Latest)')

  // Verify README.md
  const readme = fs.readFileSync(path.join(ws, 'README.md'), 'utf8')
  assert.match(readme, /version: v0\.3\.0/)
  assert.match(readme, /--experimental\.plugins\.routewarden\.version=v0\.3\.0/)

  // Running sync again without version changes should be idempotent
  const secondRun = syncVersion({ rootDir: ws })
  assert.equal(secondRun.updatedFiles.length, 0)
})

test('normalizeAppName resolves all known aliases', () => {
  assert.equal(normalizeAppName('tcp'), 'tcp')
  assert.equal(normalizeAppName('tcp-warden'), 'tcp')
  assert.equal(normalizeAppName('tcp_warden'), 'tcp')
  assert.equal(normalizeAppName('l4'), 'tcp')
  assert.equal(normalizeAppName('caddy'), 'caddy')
  assert.equal(normalizeAppName('caddy-warden'), 'caddy')
  assert.equal(normalizeAppName('traefik'), 'traefik')
  assert.equal(normalizeAppName('traefik-warden'), 'traefik')
  assert.equal(normalizeAppName('plugin'), 'traefik')
  assert.equal(normalizeAppName('cli'), 'cli')
  assert.equal(normalizeAppName('rwarden'), 'cli')
  assert.equal(normalizeAppName('nginx'), 'nginx')
  assert.equal(normalizeAppName(''), 'all')
})

test('syncVersion allows updating individual app version (tcp) without touching other apps', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  const res = syncVersion({ rootDir: ws, app: 'tcp', version: 'v3.0.0' })

  assert.equal(res.targetVersion, 'v3.0.0')
  assert.equal(res.appVersions.tcp, 'v3.0.0')
  // Verify only tcp files and version.json are touched
  assert.ok(res.updatedFiles.includes('docs/version.json'))
  assert.ok(res.updatedFiles.includes('docs/tcp/api.md'))
  assert.ok(res.updatedFiles.includes('docs/tcp/getting-started.md'))
  assert.ok(!res.updatedFiles.includes('README.md'))
  assert.ok(!res.updatedFiles.includes('docs/caddy/getting-started.md'))
  assert.ok(!res.updatedFiles.includes('docs/versions.json'))

  // Verify file contents
  const apiDoc = fs.readFileSync(path.join(ws, 'docs/tcp/api.md'), 'utf8')
  assert.match(apiDoc, /"version": "3\.0\.0"/)

  const gsDoc = fs.readFileSync(path.join(ws, 'docs/tcp/getting-started.md'), 'utf8')
  assert.match(gsDoc, /# \{"status":"ok","version":"3\.0\.0"\}/)

  // Verify docs/version.json preserved base version and updated tcp
  const vJson = JSON.parse(fs.readFileSync(path.join(ws, 'docs/version.json'), 'utf8'))
  assert.equal(vJson.version, 'v0.2.1')
  assert.equal(vJson.tcp, 'v3.0.0')
})

test('syncVersion allows updating caddy version without touching tcp or traefik', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  const res = syncVersion({ rootDir: ws, app: 'caddy-warden', version: 'v1.2.0' })

  assert.equal(res.targetVersion, 'v1.2.0')
  assert.equal(res.appVersions.caddy, 'v1.2.0')
  assert.ok(res.updatedFiles.includes('docs/version.json'))
  assert.ok(res.updatedFiles.includes('docs/caddy/getting-started.md'))
  assert.ok(!res.updatedFiles.includes('docs/tcp/api.md'))
  assert.ok(!res.updatedFiles.includes('README.md'))

  const caddyDoc = fs.readFileSync(path.join(ws, 'docs/caddy/getting-started.md'), 'utf8')
  assert.match(caddyDoc, /caddy-warden@v1\.2\.0/)
})

test('syncVersion allows updating nginx version without touching other apps', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  const res = syncVersion({ rootDir: ws, app: 'nginx', version: 'v1.3.0' })

  assert.equal(res.targetVersion, 'v1.3.0')
  assert.equal(res.appVersions.nginx, 'v1.3.0')
  assert.ok(res.updatedFiles.includes('docs/version.json'))
  assert.ok(res.updatedFiles.includes('docs/nginx/getting-started.md'))
  assert.ok(!res.updatedFiles.includes('docs/caddy/getting-started.md'))

  const nginxDoc = fs.readFileSync(path.join(ws, 'docs/nginx/getting-started.md'), 'utf8')
  assert.match(nginxDoc, /nginx-warden@v1\.3\.0/)
})

test('resolveDocsRootDir returns custom directory when specified', () => {
  assert.equal(resolveDocsRootDir('/tmp/custom-test'), '/tmp/custom-test')
})

test('syncVersion supports updating multiple apps via options.versions', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  const res = syncVersion({
    rootDir: ws,
    versions: {
      tcp: 'v3.2.1',
      caddy: 'v1.4.0'
    }
  })

  assert.equal(res.appVersions.tcp, 'v3.2.1')
  assert.equal(res.appVersions.caddy, 'v1.4.0')
  assert.ok(res.updatedFiles.includes('docs/tcp/api.md'))
  assert.ok(res.updatedFiles.includes('docs/caddy/getting-started.md'))
})

test('syncVersion throws error when docs/version.json is missing and no version passed', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  fs.rmSync(path.join(ws, 'docs/version.json'))
  assert.throws(() => syncVersion({ rootDir: ws }), /docs\/version\.json not found/)
})

test('snapshotVersion archives previous minor version and updates registry and files', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  const res = snapshotVersion('v0.3.0', { rootDir: ws })

  assert.equal(res.previousVersion, 'v0.2.1')
  assert.equal(res.newVersion, 'v0.3.0')
  assert.equal(res.minorSnapshotDirName, 'v0.2')
  assert.equal(res.skipped, false)

  // Verify snapshot dir was created
  const archivedDoc = path.join(ws, 'docs/v0.2/guide/getting-started.md')
  assert.ok(fs.existsSync(archivedDoc))
  const archivedContent = fs.readFileSync(archivedDoc, 'utf8')
  assert.match(archivedContent, /Legacy Version Notice/)
  assert.match(archivedContent, /Install version: v0\.2\.1/)

  // Verify docs/versions.json updated with v0.3.x series
  const registry = JSON.parse(fs.readFileSync(path.join(ws, 'docs/versions.json'), 'utf8'))
  assert.equal(registry.current, 'v0.3.x')
  assert.equal(registry.versions[0].tag, 'v0.3.x')
  assert.equal(registry.versions[0].text, 'v0.3.x (Latest)')
  assert.equal(registry.versions[1].tag, 'v0.2.x')
  assert.equal(registry.versions[1].link, '/v0.2/guide/getting-started')

  // Verify docs/version.json updated
  const versionData = JSON.parse(fs.readFileSync(path.join(ws, 'docs/version.json'), 'utf8'))
  assert.equal(versionData.version, 'v0.3.0')
})

test('snapshotVersion skips when target version matches current version', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  const res = snapshotVersion('v0.2.1', { rootDir: ws })
  assert.equal(res.skipped, true)
})

test('snapshotVersion throws when version argument is missing', (t) => {
  const ws = createMockWorkspace()
  t.after(() => fs.rmSync(ws, { recursive: true, force: true }))

  assert.throws(() => snapshotVersion('', { rootDir: ws }), /New version argument is required/)
})

// ─── Universal Shell Script Tests (install.sh / uninstall.sh) ──────────────────

test('uninstall.sh script exists, is executable, and passes bash syntax validation', () => {
  assert.ok(fs.existsSync(uninstallScriptPath), `Expected ${uninstallScriptPath} to exist`)
  const stat = fs.statSync(uninstallScriptPath)
  assert.ok((stat.mode & 0o111) !== 0, 'uninstall.sh must be executable')

  assert.doesNotThrow(() => {
    execFileSync('bash', ['-n', uninstallScriptPath], { stdio: 'pipe' })
  })
})

test('uninstall.sh runs cleanly when no rwarden installation is found', (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-uninstall-clean-'))
  t.after(() => fs.rmSync(tempHome, { recursive: true, force: true }))

  const stdout = execFileSync('bash', [uninstallScriptPath], {
    env: {
      HOME: tempHome,
      PATH: '/bin:/usr/bin'
    },
    encoding: 'utf8'
  })

  assert.match(stdout, /Stopping RouteWarden services/)
  assert.match(stdout, /No rwarden binary found in standard install locations/)
  assert.match(stdout, /RouteWarden uninstallation complete/)
})

test('uninstall.sh stops services, cleans containers, removes binary, and wipes ~/.routewarden', (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-uninstall-full-'))
  t.after(() => fs.rmSync(tempHome, { recursive: true, force: true }))

  const localBin = path.join(tempHome, '.local/bin')
  fs.mkdirSync(localBin, { recursive: true })

  const mockLog = path.join(tempHome, 'mock_calls.log')
  const rwardenBin = path.join(localBin, 'rwarden')
  fs.writeFileSync(rwardenBin, `#!/bin/sh\necho "$@" >> "${mockLog}"\nexit 0\n`, { mode: 0o755 })

  const runtimeDir = path.join(tempHome, '.routewarden')
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(path.join(runtimeDir, 'state.json'), '{"active":true}')

  const stdout = execFileSync('bash', [uninstallScriptPath], {
    env: {
      HOME: tempHome,
      PATH: `${localBin}:/bin:/usr/bin`
    },
    encoding: 'utf8'
  })

  // Verify binary removal
  assert.ok(!fs.existsSync(rwardenBin), 'Expected rwarden binary to be deleted')

  // Verify runtime directory cleanup
  assert.ok(!fs.existsSync(runtimeDir), 'Expected ~/.routewarden to be deleted')

  // Verify services stop and cleanup calls
  const calls = fs.readFileSync(mockLog, 'utf8')
  assert.match(calls, /stop/)
  assert.match(calls, /cleanup/)

  // Verify stdout notifications
  assert.match(stdout, /Successfully uninstalled rwarden/)
  assert.ok(stdout.includes('Removing ~/.routewarden runtime data'), 'Expected runtime data cleanup message')
  assert.match(stdout, /RouteWarden uninstallation complete/)
})

test('uninstall.sh invokes docker rm -f routewarden-dashboard when docker CLI is available', (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-uninstall-docker-'))
  t.after(() => fs.rmSync(tempHome, { recursive: true, force: true }))

  const binDir = path.join(tempHome, 'bin')
  fs.mkdirSync(binDir, { recursive: true })

  const dockerLog = path.join(tempHome, 'docker.log')
  const dockerBin = path.join(binDir, 'docker')
  fs.writeFileSync(dockerBin, `#!/bin/sh\necho "$@" >> "${dockerLog}"\nexit 0\n`, { mode: 0o755 })

  execFileSync('bash', [uninstallScriptPath], {
    env: {
      HOME: tempHome,
      PATH: `${binDir}:/bin:/usr/bin`
    },
    encoding: 'utf8'
  })

  const dockerCalls = fs.readFileSync(dockerLog, 'utf8')
  assert.match(dockerCalls, /rm -f routewarden-dashboard/)
})

test('uninstall.sh removes symlinked binary correctly', (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-uninstall-symlink-'))
  t.after(() => fs.rmSync(tempHome, { recursive: true, force: true }))

  const realBinDir = path.join(tempHome, 'real_bin')
  const localBin = path.join(tempHome, '.local/bin')
  fs.mkdirSync(realBinDir, { recursive: true })
  fs.mkdirSync(localBin, { recursive: true })

  const targetBin = path.join(realBinDir, 'rwarden_actual')
  fs.writeFileSync(targetBin, `#!/bin/sh\nexit 0\n`, { mode: 0o755 })

  const symlinkBin = path.join(localBin, 'rwarden')
  fs.symlinkSync(targetBin, symlinkBin)

  execFileSync('bash', [uninstallScriptPath], {
    env: {
      HOME: tempHome,
      PATH: `${localBin}:/bin:/usr/bin`
    },
    encoding: 'utf8'
  })

  assert.ok(!fs.existsSync(symlinkBin), 'Expected symlink at .local/bin/rwarden to be removed')
})

test('uninstall.sh is resilient when rwarden stop or cleanup command fails', (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-uninstall-resilient-'))
  t.after(() => fs.rmSync(tempHome, { recursive: true, force: true }))

  const localBin = path.join(tempHome, '.local/bin')
  fs.mkdirSync(localBin, { recursive: true })

  const rwardenBin = path.join(localBin, 'rwarden')
  fs.writeFileSync(rwardenBin, `#!/bin/sh\nexit 1\n`, { mode: 0o755 })

  const stdout = execFileSync('bash', [uninstallScriptPath], {
    env: {
      HOME: tempHome,
      PATH: `${localBin}:/bin:/usr/bin`
    },
    encoding: 'utf8'
  })

  assert.ok(!fs.existsSync(rwardenBin), 'Expected binary to still be removed even when stop fails')
  assert.match(stdout, /Successfully uninstalled rwarden/)
})

test('install.sh script exists and passes bash syntax validation', () => {
  assert.ok(fs.existsSync(installScriptPath), `Expected ${installScriptPath} to exist`)
  const stat = fs.statSync(installScriptPath)
  assert.ok(stat.size > 0, 'install.sh must not be empty')

  assert.doesNotThrow(() => {
    execFileSync('bash', ['-n', installScriptPath], { stdio: 'pipe' })
  })
})

