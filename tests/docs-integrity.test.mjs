import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const docsDir = path.join(rootDir, 'docs')

test('documentation structure and integrity', async (t) => {
  await t.test('required core files exist and are non-empty', () => {
    const requiredFiles = [
      'core/anti-evasion.md',
      'core/custom-patterns.md',
      'core/changelog.md',
      'core/response-modes.md',
      'core/architecture.md',
      'faq.md',
      'index.md'
    ]

    for (const rel of requiredFiles) {
      const fullPath = path.join(docsDir, rel)
      assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${rel}`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 0, `File should not be empty: ${rel}`)
    }
  })

  await t.test('gateway specific sections exist', () => {
    const gateways = ['traefik', 'caddy', 'nginx']
    for (const gw of gateways) {
      const dir = path.join(docsDir, gw)
      assert.ok(fs.existsSync(dir), `Expected gateway directory: ${gw}`)
      assert.ok(fs.existsSync(path.join(dir, 'index.md')), `Expected ${gw}/index.md`)
      assert.ok(fs.existsSync(path.join(dir, 'getting-started.md')), `Expected ${gw}/getting-started.md`)
      assert.ok(fs.existsSync(path.join(dir, 'examples.md')), `Expected ${gw}/examples.md`)
    }
  })

  await t.test('reference documents properly include canonical core documents', () => {
    const includes = [
      { file: 'reference/anti-evasion.md', expectedTarget: '../core/anti-evasion.md' },
      { file: 'reference/custom-paths.md', expectedTarget: '../core/custom-patterns.md' },
      { file: 'reference/changelog.md', expectedTarget: '../core/changelog.md' },
      { file: 'reference/response-modes.md', expectedTarget: '../core/response-modes.md' }
    ]

    for (const { file, expectedTarget } of includes) {
      const fullPath = path.join(docsDir, file)
      assert.ok(fs.existsSync(fullPath), `Expected reference file to exist: ${file}`)
      const content = fs.readFileSync(fullPath, 'utf8').trim()
      assert.equal(
        content,
        `<!--@include: ${expectedTarget}-->`,
        `${file} should reference ${expectedTarget}`
      )
    }
  })

  await t.test('all relative markdown includes in docs resolve to real files', () => {
    function findMarkdownFiles(dir) {
      let results = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== '.vitepress' && entry.name !== 'node_modules') {
            results = results.concat(findMarkdownFiles(fullPath))
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const mdFiles = findMarkdownFiles(docsDir)
    assert.ok(mdFiles.length > 0, 'Should find markdown files')

    const includeRegex = /<!--@include:\s*([^\s>]+)-->/g
    for (const file of mdFiles) {
      const content = fs.readFileSync(file, 'utf8')
      let match
      while ((match = includeRegex.exec(content)) !== null) {
        const includeTarget = match[1]
        const resolvedPath = path.resolve(path.dirname(file), includeTarget)
        assert.ok(
          fs.existsSync(resolvedPath),
          `Broken @include in ${path.relative(docsDir, file)}: target "${includeTarget}" does not exist at ${resolvedPath}`
        )
      }
    }
  })

  await t.test('docs/version.json and versions.json registry have valid format', () => {
    const versionPath = path.join(docsDir, 'version.json')
    assert.ok(fs.existsSync(versionPath), 'docs/version.json must exist')
    const vData = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
    for (const app of ['traefik', 'caddy', 'tcp', 'cli', 'nginx']) {
      assert.ok(typeof vData[app] === 'string', `${app} version must be string`)
      assert.match(vData[app], /^v?\d+\.\d+\.\d+/, `${app} version must match semver`)
    }

    const versionsPath = path.join(docsDir, 'versions.json')
    assert.ok(fs.existsSync(versionsPath), 'docs/versions.json must exist')
    const registry = JSON.parse(fs.readFileSync(versionsPath, 'utf8'))
    assert.ok(typeof registry.current === 'string', 'registry.current must be string')
    assert.ok(Array.isArray(registry.versions), 'registry.versions must be array')
    assert.ok(registry.versions.length > 0, 'registry.versions must not be empty')
  })

  await t.test('tcp plugin documentation files exist and are non-empty', () => {
    const tcpPluginsDir = path.join(docsDir, 'tcp', 'plugins')
    assert.ok(fs.existsSync(tcpPluginsDir), 'Expected tcp/plugins directory')

    const expectedPlugins = [
      'amqp.md', 'echo-filter.md', 'ftp.md', 'generic.md', 'http.md',
      'imap.md', 'ldap.md', 'memcached.md', 'minecraft.md', 'mongodb.md',
      'mqtt.md', 'mysql.md', 'pop3.md', 'postgres.md', 'redis.md',
      'smtp.md', 'ssh.md', 'tls-sni.md', 'vnc.md'
    ]

    for (const plugin of expectedPlugins) {
      const fullPath = path.join(tcpPluginsDir, plugin)
      assert.ok(fs.existsSync(fullPath), `Expected plugin doc: ${plugin}`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 1000, `Plugin doc ${plugin} should have comprehensive content`)
    }
  })

  await t.test('cli documentation files exist and are non-empty', () => {
    const cliDir = path.join(docsDir, 'cli')
    assert.ok(fs.existsSync(cliDir), 'Expected cli directory')

    const expectedCliDocs = [
      'index.md',
      'installation.md',
      'commands.md',
      'dashboard.md',
      'schema.md',
      'changelog.md'
    ]

    for (const doc of expectedCliDocs) {
      const fullPath = path.join(cliDir, doc)
      assert.ok(fs.existsSync(fullPath), `Expected cli document: ${doc}`)
      const stat = fs.statSync(fullPath)
      assert.ok(stat.size > 0, `CLI document should not be empty: ${doc}`)
    }
  })

  await t.test('cli dashboard architecture overview uses CodeViewer with Mermaid support', () => {
    const dashboardDoc = path.join(docsDir, 'cli', 'dashboard.md')
    const content = fs.readFileSync(dashboardDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="archSnippets" />'), 'dashboard.md must render CodeViewer with archSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'dashboard.md must declare mermaid language for architecture definition')
    assert.ok(content.includes('Architecture Graph') || content.includes('Architecture Flow'), 'dashboard.md must provide visual architecture tab')
    assert.ok(content.includes('flowchart LR'), 'dashboard.md must include flowchart LR definition')
  })

  await t.test('cli schema workflow architecture uses CodeViewer with Mermaid support', () => {
    const schemaDoc = path.join(docsDir, 'cli', 'schema.md')
    const content = fs.readFileSync(schemaDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="workflowSnippets" />'), 'schema.md must render CodeViewer with workflowSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'schema.md must declare mermaid language for workflow definition')
    assert.ok(content.includes('Workflow Graph'), 'schema.md must provide visual workflow graph tab')
    assert.ok(content.includes('flowchart TD'), 'schema.md must include flowchart TD definition')
  })

  await t.test('core architecture flow uses CodeViewer with Mermaid support', () => {
    const archDoc = path.join(docsDir, 'core', 'architecture.md')
    const content = fs.readFileSync(archDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="archFlowSnippets" />'), 'architecture.md must render CodeViewer with archFlowSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'architecture.md must declare mermaid language for architectural pipeline')
    assert.ok(content.includes('Inspection Pipeline'), 'architecture.md must provide visual inspection pipeline tab')
    assert.ok(content.includes('flowchart TD'), 'architecture.md must include flowchart TD definition')
  })

  await t.test('pattern checker evaluation flow uses CodeViewer with Mermaid support', () => {
    const patternDoc = path.join(docsDir, 'tools', 'pattern-checker.md')
    const content = fs.readFileSync(patternDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="evalFlowSnippets" />'), 'pattern-checker.md must render CodeViewer with evalFlowSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'pattern-checker.md must declare mermaid language for evaluation flow')
    assert.ok(content.includes('Evaluation Flow'), 'pattern-checker.md must provide visual evaluation flow tab')
    assert.ok(content.includes('flowchart TD'), 'pattern-checker.md must include flowchart TD definition')
  })

  await t.test('immich case study architecture diagram uses CodeViewer with Mermaid support', () => {
    const immichDoc = path.join(docsDir, 'examples', 'case-study-immich.md')
    const content = fs.readFileSync(immichDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="immichArchSnippets" />'), 'case-study-immich.md must render CodeViewer with immichArchSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'case-study-immich.md must declare mermaid language for dual-router architecture')
    assert.ok(content.includes('Dual-Router Architecture'), 'case-study-immich.md must provide visual dual-router architecture tab')
    assert.ok(content.includes('flowchart TD'), 'case-study-immich.md must include flowchart TD definition')
  })

  await t.test('tcp faq collaborative diagram uses CodeViewer with Mermaid support', () => {
    const faqDoc = path.join(docsDir, 'tcp', 'faq.md')
    const content = fs.readFileSync(faqDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="collabSnippets"'), 'tcp/faq.md must render CodeViewer with collabSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'tcp/faq.md must declare mermaid language for collaborative loop')
    assert.ok(content.includes('Collaborative Loop'), 'tcp/faq.md must provide visual collaborative loop tab')
    assert.ok(content.includes('flowchart TD'), 'tcp/faq.md must include flowchart TD definition')
  })

  await t.test('tcp crowdsec architecture diagram uses CodeViewer with Mermaid support', () => {
    const csDoc = path.join(docsDir, 'tcp', 'crowdsec.md')
    const content = fs.readFileSync(csDoc, 'utf8')

    assert.ok(content.includes('<CodeViewer :snippets="archSnippets" />'), 'tcp/crowdsec.md must render CodeViewer with archSnippets')
    assert.ok(content.includes("lang: 'mermaid'"), 'tcp/crowdsec.md must declare mermaid language for crowdsec loop')
    assert.ok(content.includes('Collaborative Loop'), 'tcp/crowdsec.md must provide visual collaborative loop tab')
    assert.ok(content.includes('flowchart TD'), 'tcp/crowdsec.md must include flowchart TD definition')
  })

  await t.test('cli installation document matches version.json release version', () => {
    const installDoc = path.join(docsDir, 'cli', 'installation.md')
    const content = fs.readFileSync(installDoc, 'utf8')
    const vData = JSON.parse(fs.readFileSync(path.join(docsDir, 'version.json'), 'utf8'))
    const cliSemver = vData.cli.replace(/^v/, '')

    assert.ok(
      content.includes(`https://github.com/routewarden/cli/releases/download/${vData.cli}/`),
      `installation.md download links must match CLI version ${vData.cli}`
    )
    assert.ok(
      content.includes(`rwarden_${cliSemver}_`),
      `installation.md archive filenames must match CLI semver ${cliSemver}`
    )
    assert.ok(
      content.includes(`# rwarden version ${cliSemver}`),
      `installation.md verification command must match CLI semver ${cliSemver}`
    )
  })

  await t.test('cli docker-compose.yml is synchronized and imported as single source of truth', () => {
    const docsCompose = path.join(docsDir, 'cli', 'dashboard', 'docker-compose.yml')
    assert.ok(fs.existsSync(docsCompose), 'Expected docs/cli/dashboard/docker-compose.yml to exist')
    const composeContent = fs.readFileSync(docsCompose, 'utf8')
    assert.ok(composeContent.length > 0, 'docker-compose.yml must not be empty')
    assert.ok(composeContent.includes('ghcr.io/routewarden/cli'), 'must include routewarden cli image directive')
    assert.ok(composeContent.includes('dashboard --port 7890'), 'must include dashboard command')

    // When running inside monorepo, verify it exactly matches canonical cli repo file
    const canonicalCliCompose = path.join(rootDir, '../cli/observability/docker-compose.yml')
    if (fs.existsSync(canonicalCliCompose)) {
      const canonicalContent = fs.readFileSync(canonicalCliCompose, 'utf8')
      assert.equal(composeContent, canonicalContent, 'docs/cli/dashboard/docker-compose.yml must match cli/observability/docker-compose.yml byte-for-byte')
    }
  })
})


