#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Normalizes app name or alias into a canonical identifier.
 * @param {string} app
 * @returns {'traefik' | 'caddy' | 'tcp' | 'cli' | 'nginx' | string}
 */
export function normalizeAppName(app) {
  if (!app) return 'all'
  const lower = String(app).toLowerCase().trim()
  if (['traefik', 'traefik-warden', 'traefik_warden', 'plugin'].includes(lower)) {
    return 'traefik'
  }
  if (['caddy', 'caddy-warden', 'caddy_warden'].includes(lower)) {
    return 'caddy'
  }
  if (['tcp', 'tcp-warden', 'tcp_warden', 'l4'].includes(lower)) {
    return 'tcp'
  }
  if (['cli', 'rwarden', 'routewarden-cli'].includes(lower)) {
    return 'cli'
  }
  if (['nginx', 'nginx-warden', 'nginx_warden'].includes(lower)) {
    return 'nginx'
  }
  return lower
}

/**
 * Normalizes a version string into `vX.Y.Z` and raw `X.Y.Z`.
 * @param {string} ver
 * @returns {{ cleanVersion: string, semver: string, seriesTag: string }}
 */
function formatVersion(ver) {
  const cleanVersion = ver.startsWith('v') ? ver : `v${ver}`
  const semver = cleanVersion.replace(/^v/, '')
  const parts = semver.split('.')
  const seriesTag = `v${parts[0]}.${parts[1]}.x`
  return { cleanVersion, semver, seriesTag }
}

/**
 * Collects markdown files in a directory, ignoring frozen versions and internal caches.
 * @param {string} dir
 * @param {string} rootDir
 * @param {string[]} bucket
 */
function collectMarkdownFiles(dir, rootDir, bucket) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(rootDir, fullPath)
    if (entry.isDirectory()) {
      if (/^docs\/v\d+\.\d+/.test(relPath) || relPath.startsWith('docs/.vitepress')) {
        continue
      }
      collectMarkdownFiles(fullPath, rootDir, bucket)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (!bucket.includes(relPath)) {
        bucket.push(relPath)
      }
    }
  }
}

/**
 * Resolves rootDir to the docs repository root, accommodating execution from
 * either inside the docs repository or from a parent monorepo workspace.
 * @param {string} [customDir]
 * @returns {string}
 */
export function resolveDocsRootDir(customDir) {
  let rootDir = customDir || process.cwd()
  if (path.basename(rootDir) !== 'docs' && fs.existsSync(path.join(rootDir, 'docs/docs/version.json'))) {
    return path.join(rootDir, 'docs')
  }
  return rootDir
}

/**
 * Core version syncing logic with support for individual apps or entire ecosystem.
 *
 * @param {Object} options
 * @param {string} [options.rootDir] - Root directory of the repository
 * @param {string} [options.app] - Target application ('traefik' | 'caddy' | 'tcp' | 'cli' | 'nginx' | 'all')
 * @param {string} [options.version] - New version string (e.g. 'v3.0.0')
 * @param {Record<string, string>} [options.versions] - Map of multiple app versions to update
 * @param {boolean} [options.writeVersionFile=true] - Persist changes back to docs/version.json
 * @returns {{ updatedFiles: string[], targetVersion: string, appVersions: Record<string, string> }}
 */
export function syncVersion(options = {}) {
  const rootDir = resolveDocsRootDir(options.rootDir)
  const versionFilePath = path.join(rootDir, 'docs/version.json')

  if (!fs.existsSync(versionFilePath)) {
    throw new Error(`Error: ${versionFilePath} not found`)
  }

  const rawVersionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
  const primaryVersion = rawVersionData.traefik || rawVersionData.version || 'v1.0.0'

  // Build the app version registry from version.json with defaults
  const appVersions = {
    traefik: rawVersionData.traefik || primaryVersion,
    caddy: rawVersionData.caddy || primaryVersion,
    tcp: rawVersionData.tcp || 'v3.0.0',
    cli: rawVersionData.cli || 'v4.0.1',
    nginx: rawVersionData.nginx || primaryVersion,
    ...rawVersionData
  }
  // Only maintain legacy "version" key if it was explicitly present in the source file
  if ('version' in rawVersionData) {
    appVersions.version = rawVersionData.version || primaryVersion
  } else {
    delete appVersions.version
  }

  // Apply explicit versions map if supplied
  if (options.versions && typeof options.versions === 'object') {
    for (const [k, v] of Object.entries(options.versions)) {
      const canonical = normalizeAppName(k)
      const formatted = formatVersion(v).cleanVersion
      appVersions[canonical] = formatted
      if (canonical === 'traefik' && 'version' in appVersions) {
        appVersions.version = formatted
      }
    }
  }

  const targetApp = options.app ? normalizeAppName(options.app) : null
  let targetVersion = options.version

  // If a specific version was passed for a target app (or globally)
  if (targetVersion) {
    const formatted = formatVersion(targetVersion).cleanVersion
    if (targetApp && targetApp !== 'all') {
      appVersions[targetApp] = formatted
      if (targetApp === 'traefik' && 'version' in appVersions) {
        appVersions.version = formatted
      }
    } else {
      // Global version update applies to default and traefik
      if ('version' in appVersions) {
        appVersions.version = formatted
      }
      appVersions.traefik = formatted
    }
  }

  // Determine what targetVersion string to return
  let returnedTargetVersion = targetVersion
  if (!returnedTargetVersion) {
    returnedTargetVersion = (targetApp && targetApp !== 'all' && appVersions[targetApp])
      ? appVersions[targetApp]
      : (appVersions.traefik || appVersions.version)
  }
  returnedTargetVersion = formatVersion(returnedTargetVersion).cleanVersion

  // Persist updated versions to docs/version.json if any modifications occurred
  const writeVersionFile = options.writeVersionFile !== false
  const updatedFiles = []

  const versionJsonContent = JSON.stringify(appVersions, null, 2) + '\n'
  const originalVersionJson = fs.readFileSync(versionFilePath, 'utf8')
  if (writeVersionFile && versionJsonContent !== originalVersionJson) {
    fs.writeFileSync(versionFilePath, versionJsonContent, 'utf8')
    updatedFiles.push('docs/version.json')
  }

  const shouldSyncTraefik = !targetApp || targetApp === 'all' || targetApp === 'traefik'
  const shouldSyncCaddy = !targetApp || targetApp === 'all' || targetApp === 'caddy'
  const shouldSyncTcp = !targetApp || targetApp === 'all' || targetApp === 'tcp'
  const shouldSyncCli = !targetApp || targetApp === 'all' || targetApp === 'cli'
  const shouldSyncNginx = !targetApp || targetApp === 'all' || targetApp === 'nginx'

  // Helper to safely replace and track updated file
  const updateFileContent = (relPath, updater) => {
    const filePath = path.join(rootDir, relPath)
    if (!fs.existsSync(filePath)) return
    const original = fs.readFileSync(filePath, 'utf8')
    const next = updater(original)
    if (next !== original) {
      fs.writeFileSync(filePath, next, 'utf8')
      if (!updatedFiles.includes(relPath)) {
        updatedFiles.push(relPath)
      }
    }
  }

  // ── 1. Synchronize Traefik & Core RouteWarden Files ─────────────────────────
  if (shouldSyncTraefik) {
    const { cleanVersion: traefikClean, semver: traefikSemver, seriesTag } = formatVersion(appVersions.traefik)

    // Update docs/versions.json current series and latest entry
    const versionsJsonPath = path.join(rootDir, 'docs/versions.json')
    if (fs.existsSync(versionsJsonPath)) {
      const registry = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'))
      let changed = false
      if (registry.current !== seriesTag) {
        registry.current = seriesTag
        changed = true
      }
      if (Array.isArray(registry.versions) && registry.versions.length > 0) {
        const latest = registry.versions[0]
        const expectedText = `${seriesTag} (Latest)`
        if (latest.tag !== seriesTag || latest.text !== expectedText) {
          latest.tag = seriesTag
          latest.text = expectedText
          changed = true
        }
      }
      if (changed) {
        fs.writeFileSync(versionsJsonPath, JSON.stringify(registry, null, 2) + '\n', 'utf8')
        if (!updatedFiles.includes('docs/versions.json')) {
          updatedFiles.push('docs/versions.json')
        }
      }
    }

    const traefikFiles = [
      'README.md',
      'VERSIONING.md',
      'examples/01-basic-sensitive-files/docker-compose.yml',
      'examples/02-global-entrypoint-shield/docker-compose.yml',
      'examples/03-ip-whitelist-vpn/docker-compose.yml',
      'examples/04-captcha-challenge/docker-compose.yml',
      'examples/05-kubernetes-ingressroute/README.md'
    ]
    collectMarkdownFiles(path.join(rootDir, 'docs/traefik'), rootDir, traefikFiles)
    collectMarkdownFiles(path.join(rootDir, 'docs/examples'), rootDir, traefikFiles)

    for (const relPath of traefikFiles) {
      updateFileContent(relPath, (content) => {
        let updated = content
        // Traefik plugin CLI flag: --experimental.plugins.routewarden.version=vX.Y.Z
        updated = updated.replace(
          /(--experimental\.plugins\.routewarden\.version=)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${traefikClean}`
        )
        // Traefik plugin repository tag: github.com/routewarden/traefik-warden@vX.Y.Z
        updated = updated.replace(
          /(github\.com\/routewarden\/traefik-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${traefikClean}`
        )
        // Traefik YAML/TOML version declaration (scoped to traefik/examples docs or README)
        if (relPath.startsWith('docs/traefik') || relPath.startsWith('examples') || relPath === 'README.md') {
          updated = updated.replace(
            /(version:\s+)v?[0-9]+\.[0-9]+\.[0-9]+/g,
            `$1${traefikClean}`
          )
          updated = updated.replace(
            /(version\s*=\s*")v?[0-9]+\.[0-9]+\.[0-9]+(")/g,
            `$1${traefikClean}$2`
          )
        }
        return updated
      })
    }
  }

  // ── 2. Synchronize Caddy Warden Files ──────────────────────────────────────
  if (shouldSyncCaddy) {
    const { cleanVersion: caddyClean } = formatVersion(appVersions.caddy)
    const caddyFiles = []
    collectMarkdownFiles(path.join(rootDir, 'docs/caddy'), rootDir, caddyFiles)
    collectMarkdownFiles(path.join(rootDir, 'docs/examples'), rootDir, caddyFiles)

    for (const relPath of caddyFiles) {
      updateFileContent(relPath, (content) => {
        let updated = content
        updated = updated.replace(
          /(github\.com\/routewarden\/caddy-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${caddyClean}`
        )
        updated = updated.replace(
          /(caddy-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${caddyClean}`
        )
        return updated
      })
    }
  }

  // ── 3. Synchronize TCP Warden Files ────────────────────────────────────────
  if (shouldSyncTcp) {
    const { cleanVersion: tcpClean, semver: tcpSemver } = formatVersion(appVersions.tcp)
    const tcpFiles = [
      'docs/tcp/api.md',
      'docs/tcp/getting-started.md'
    ]
    collectMarkdownFiles(path.join(rootDir, 'docs/tcp'), rootDir, tcpFiles)

    for (const relPath of tcpFiles) {
      updateFileContent(relPath, (content) => {
        let updated = content
        // Health / API status JSON snippet: "version": "3.0.0"
        if (relPath.endsWith('api.md') || relPath.endsWith('getting-started.md')) {
          updated = updated.replace(
            /("version":\s*")[0-9]+\.[0-9]+\.[0-9]+(")/g,
            `$1${tcpSemver}$2`
          )
          updated = updated.replace(
            /(# \{"status":"ok","version":")[0-9]+\.[0-9]+\.[0-9]+("\})/g,
            `$1${tcpSemver}$2`
          )
        }
        // GitHub / GHCR container image references
        updated = updated.replace(
          /(github\.com\/routewarden\/tcp-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${tcpClean}`
        )
        updated = updated.replace(
          /(ghcr\.io\/routewarden\/tcp-warden:)v[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${tcpClean}`
        )
        return updated
      })
    }
  }

  // ── 4. Synchronize CLI Files ───────────────────────────────────────────────
  if (shouldSyncCli) {
    const { cleanVersion: cliClean, semver: cliSemver } = formatVersion(appVersions.cli)
    const cliFiles = []
    collectMarkdownFiles(path.join(rootDir, 'docs/cli'), rootDir, cliFiles)

    for (const relPath of cliFiles) {
      updateFileContent(relPath, (content) => {
        let updated = content
        updated = updated.replace(
          /(github\.com\/routewarden\/cli@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${cliClean}`
        )
        updated = updated.replace(
          /(github\.com\/routewarden\/cli\/releases\/download\/)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${cliClean}`
        )
        updated = updated.replace(
          /(rwarden_)[0-9]+\.[0-9]+\.[0-9]+(_)/g,
          `$1${cliSemver}$2`
        )
        updated = updated.replace(
          /(rwarden\s+(?:version\s+)?v?)[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${cliSemver}`
        )
        return updated
      })
    }

    if (fs.existsSync(path.join(rootDir, 'docs/public/install.sh'))) {
      updateFileContent('docs/public/install.sh', (content) => {
        let updated = content
        updated = updated.replace(
          /(LATEST_TAG=")[^"]*(")/,
          `$1${cliClean}$2`
        )
        updated = updated.replace(
          /(Fallback to )v?[0-9]+\.[0-9]+\.[0-9]+/,
          `$1${cliClean}`
        )
        return updated
      })
    }

    if (fs.existsSync(path.join(rootDir, 'VERSIONING.md'))) {
      updateFileContent('VERSIONING.md', (content) => {
        return content.replace(
          /("cli":\s*")v?[0-9]+\.[0-9]+\.[0-9]+(")/g,
          `$1${cliClean}$2`
        )
      })
    }
  }

  // ── 5. Synchronize NGINX Warden Files ──────────────────────────────────────
  if (shouldSyncNginx) {
    const { cleanVersion: nginxClean } = formatVersion(appVersions.nginx)
    const nginxFiles = []
    collectMarkdownFiles(path.join(rootDir, 'docs/nginx'), rootDir, nginxFiles)

    for (const relPath of nginxFiles) {
      updateFileContent(relPath, (content) => {
        let updated = content
        updated = updated.replace(
          /(github\.com\/routewarden\/nginx-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${nginxClean}`
        )
        updated = updated.replace(
          /(nginx-warden@)v?[0-9]+\.[0-9]+\.[0-9]+/g,
          `$1${nginxClean}`
        )
        return updated
      })
    }
  }

  return { updatedFiles, targetVersion: returnedTargetVersion, appVersions }
}

/**
 * Parses CLI command line arguments.
 * @param {string[]} args
 * @returns {{ app?: string, version?: string }}
 */
function parseArgs(args) {
  let app
  let version
  let rootDir

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--app=')) {
      app = arg.split('=')[1]
    } else if (arg === '--app' && args[i + 1]) {
      app = args[++i]
    } else if (arg.startsWith('--version=')) {
      version = arg.split('=')[1]
    } else if (arg === '--version' && args[i + 1]) {
      version = args[++i]
    } else if (arg.startsWith('--tcp=')) {
      app = 'tcp'
      version = arg.split('=')[1]
    } else if (arg === '--tcp' && args[i + 1]) {
      app = 'tcp'
      version = args[++i]
    } else if (arg.startsWith('--caddy=')) {
      app = 'caddy'
      version = arg.split('=')[1]
    } else if (arg === '--caddy' && args[i + 1]) {
      app = 'caddy'
      version = args[++i]
    } else if (arg.startsWith('--traefik=')) {
      app = 'traefik'
      version = arg.split('=')[1]
    } else if (arg === '--traefik' && args[i + 1]) {
      app = 'traefik'
      version = args[++i]
    } else if (arg.startsWith('--cli=')) {
      app = 'cli'
      version = arg.split('=')[1]
    } else if (arg === '--cli' && args[i + 1]) {
      app = 'cli'
      version = args[++i]
    } else if (arg.startsWith('--nginx=')) {
      app = 'nginx'
      version = arg.split('=')[1]
    } else if (arg === '--nginx' && args[i + 1]) {
      app = 'nginx'
      version = args[++i]
    } else if (arg.startsWith('--rootDir=') || arg.startsWith('--root=')) {
      rootDir = arg.split('=')[1]
    } else if ((arg === '--rootDir' || arg === '--root') && args[i + 1]) {
      rootDir = args[++i]
    } else if (!arg.startsWith('-')) {
      // Positional args: [app, version] or [version]
      if (['tcp', 'caddy', 'traefik', 'cli', 'nginx', 'all'].includes(arg.toLowerCase())) {
        app = arg
      } else if (!version) {
        version = arg
      }
    }
  }

  return { app, version, rootDir }
}

// Auto-run when executed directly via CLI
const currentScriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && (path.resolve(process.argv[1]) === currentScriptPath || path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname))) {
  const cliArgs = parseArgs(process.argv.slice(2))
  const { updatedFiles, targetVersion, appVersions } = syncVersion(cliArgs)

  if (cliArgs.app) {
    console.log(`Synced RouteWarden [${cliArgs.app}] version: ${targetVersion}`)
  } else {
    console.log(`Synced RouteWarden version: ${targetVersion}`)
  }
  console.log(`Active app versions:`, JSON.stringify(appVersions))
  console.log(`Successfully synced version to ${updatedFiles.length} file(s)!`)

  try {
    const { generateSetupSnippets } = await import('./generate-snippets.mjs')
    await generateSetupSnippets({ rootDir: cliArgs.rootDir })
    console.log(`Regenerated setup code snippets`)
  } catch (err) {
    console.warn(`Could not regenerate setup snippets: ${err.message}`)
  }

  if (syncObservabilityAssets(cliArgs.rootDir)) {
    console.log(`Synchronized observability assets from CLI repository`)
  }
}

/**
 * Synchronizes observability assets (like config.alloy) from the canonical CLI repository
 * into docs when running in a multi-repo workspace.
 * @param {string} [customDir]
 * @returns {boolean}
 */
export function syncObservabilityAssets(customDir) {
  const docsRoot = resolveDocsRootDir(customDir)
  const candidateCliDirs = [
    path.join(docsRoot, '../cli/observability'),
    path.join(process.cwd(), '../cli/observability'),
    path.join(process.cwd(), 'cli/observability')
  ]

  for (const cliObsDir of candidateCliDirs) {
    const srcAlloy = path.join(cliObsDir, 'config.alloy')
    if (fs.existsSync(srcAlloy)) {
      const alloyContent = fs.readFileSync(srcAlloy, 'utf8')
      const targetLocations = [
        path.join(docsRoot, 'docs/cli/dashboard/config.alloy'),
        path.join(docsRoot, 'docs/public/config.alloy')
      ]

      for (const targetLoc of targetLocations) {
        const targetDir = path.dirname(targetLoc)
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }
        const existing = fs.existsSync(targetLoc) ? fs.readFileSync(targetLoc, 'utf8') : ''
        if (existing !== alloyContent) {
          fs.writeFileSync(targetLoc, alloyContent, 'utf8')
        }
      }
      return true
    }
  }
  return false
}
