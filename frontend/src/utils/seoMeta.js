import { useEffect } from 'react'

// Domínio de produção — usado para montar URLs absolutas em canonical e
// Open Graph, que precisam ser absolutas (não faz sentido um crawler
// resolver uma URL relativa num <meta property="og:url">).
const BASE_URL = 'https://motonote.onioncode.com.br'
const SITE_NAME = 'MotoNote'
// TODO: trocar por uma imagem 1200x630 dedicada pra social share quando
// existir (ver seo.md, item 3) — por ora reaproveita um screenshot real.
const DEFAULT_OG_IMAGE = `${BASE_URL}/lp/shot-visao-geral.png`

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return el
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
  return el
}

// Schema da entidade MotoNote em si (usado só na home, pra não repetir a
// mesma entidade "SoftwareApplication" em cada landing alternativa).
// `price` é opcional porque o valor mensal só existe depois que a landing
// busca /api/planos — sem ele, o schema sai sem o bloco `offers`.
export function softwareApplicationJsonLd({ price } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: BASE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Sistema de gestão de entregas por motoboy: registro de entregas, controle de vales, gastos e relatórios, com portal próprio pra cada motoboy.',
    ...(price != null && {
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'BRL',
        priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
      },
    }),
  }
}

// Monta o schema FAQPage a partir do mesmo array { pergunta, resposta } que
// cada landing já usa pra renderizar a seção de perguntas frequentes — sem
// duplicar conteúdo, só reaproveitando o que já existe em tela.
export function faqJsonLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ pergunta, resposta }) => ({
      '@type': 'Question',
      name: pergunta,
      acceptedAnswer: { '@type': 'Answer', text: resposta },
    })),
  }
}

// Aplica title, description, canonical, Open Graph, Twitter Card e dados
// estruturados (JSON-LD) pra uma rota pública. Usado só nas páginas que
// precisam ser indexadas (landings, como-usar, termos, privacidade) —
// telas atrás de login não chamam isso.
//
// Em produção, essas mesmas tags são geradas de novo no build de prerender
// (rota por rota) pra existirem no HTML entregue a crawlers que não
// executam JS; este hook garante que, depois da hidratação, elas continuem
// corretas caso o usuário navegue entre rotas públicas sem reload.
export function useSeoMeta({ title, description, path, image, type = 'website', jsonLd }) {
  // Serializado à parte pra entrar na dependency array do useEffect abaixo:
  // `jsonLd` costuma chegar como array/objeto literal novo a cada render
  // (ex: `[faqJsonLd(FAQ)]` em componente), então comparar por referência
  // faria o efeito recriar as tags a cada render em vez de só quando o
  // conteúdo muda de fato.
  const jsonLdKey = JSON.stringify(jsonLd)

  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
    const url = `${BASE_URL}${path}`
    const ogImage = image || DEFAULT_OG_IMAGE

    document.title = fullTitle
    const metaDescription = description ? upsertMeta('name', 'description', description) : null
    const canonical = upsertLink('canonical', url)
    const ogTags = [
      upsertMeta('property', 'og:site_name', SITE_NAME),
      upsertMeta('property', 'og:type', type),
      upsertMeta('property', 'og:title', fullTitle),
      description ? upsertMeta('property', 'og:description', description) : null,
      upsertMeta('property', 'og:url', url),
      upsertMeta('property', 'og:image', ogImage),
      upsertMeta('property', 'og:locale', 'pt_BR'),
    ].filter(Boolean)
    const twitterTags = [
      upsertMeta('name', 'twitter:card', 'summary_large_image'),
      upsertMeta('name', 'twitter:title', fullTitle),
      description ? upsertMeta('name', 'twitter:description', description) : null,
      upsertMeta('name', 'twitter:image', ogImage),
    ].filter(Boolean)

    // Remove qualquer JSON-LD já presente no <head> (inclusive o gerado
    // pelo prerender estático, ver scripts/prerender.mjs) antes de inserir
    // o novo — sem isso, a primeira montagem depois da hidratação duplica
    // as tags em vez de substituí-las.
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove())
    const jsonLdScripts = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []).map((schema) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
      return script
    })

    return () => {
      document.title = SITE_NAME
      metaDescription?.remove()
      canonical.remove()
      ogTags.forEach((el) => el.remove())
      twitterTags.forEach((el) => el.remove())
      jsonLdScripts.forEach((el) => el.remove())
    }
  }, [title, description, path, image, type, jsonLdKey])
}
