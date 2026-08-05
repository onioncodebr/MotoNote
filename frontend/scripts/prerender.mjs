// Roda depois dos dois builds do Vite (client + SSR, ver package.json ->
// script "build"). Lê o dist/index.html já buildado como molde, injeta o
// HTML e os metadados de cada rota pública (gerados por
// src/entry-server.jsx) e escreve um dist/<rota>/index.html próprio pra
// cada uma — é isso que dá pra um crawler sem JS (a maioria dos bots de
// IA, e o Googlebot com atraso) ver o conteúdo real na primeira resposta,
// em vez de só <div id="root"></div>.
//
// Nginx (nginx.conf) já serve arquivo estático quando existe antes de
// cair no fallback de SPA, então essas páginas continuam sendo servidas
// como HTML puro pra rota exata, sem precisar de mudança no servidor.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const ssrDir = join(rootDir, 'dist-ssr')

const BASE_URL = 'https://motonote.onioncode.com.br'
const SITE_NAME = 'MotoNote'
const DEFAULT_OG_IMAGE = `${BASE_URL}/lp/shot-visao-geral.png`

const { renderRoute, ROUTES } = await import(join(ssrDir, 'entry-server.js'))

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function buildHead({ title, description, path }, jsonLd) {
  const fullTitle = `${title} — ${SITE_NAME}`
  const url = `${BASE_URL}${path}`
  const scripts = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [])
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n    ')

  return [
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeAttr(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />`,
    `<title>${fullTitle}</title>`,
    scripts,
  ].filter(Boolean).join('\n    ')
}

const template = readFileSync(join(distDir, 'index.html'), 'utf-8')
const routePaths = Object.keys(ROUTES)

for (const routePath of routePaths) {
  const { html, title, description, jsonLd } = renderRoute(routePath)
  const head = buildHead({ title, description, path: routePath }, jsonLd)

  let page = template.replace(/<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/, head)
  page = page.replace('<div id="root"></div>', `<div id="root">${html}</div>`)

  const outDir = routePath === '/' ? distDir : join(distDir, routePath)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), page)
  console.log(`[prerender] ${routePath} -> dist${routePath === '/' ? '' : routePath}/index.html`)
}

rmSync(ssrDir, { recursive: true, force: true })
console.log(`[prerender] ${routePaths.length} rota(s) pré-renderizada(s), dist-ssr removido.`)
