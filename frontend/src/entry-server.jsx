import { renderToStaticMarkup } from 'react-dom/server'
import { LandingLP1 } from './components/LandingLP1'
import { LandingLP2 } from './components/LandingLP2'
import { LandingLP3 } from './components/LandingLP3'
import { ComoUsar } from './components/ComoUsar'
import { Termos } from './components/Termos'
import { Privacidade } from './components/Privacidade'
import { faqJsonLd, softwareApplicationJsonLd } from './utils/seoMeta'

// Ponto de entrada só usado no build de prerender (scripts/prerender.mjs),
// nunca no app rodando no navegador — App.jsx nem importa este arquivo.
// Renderiza cada página pública fora do Router/estado de sessão da App
// real: os componentes aqui não dependem de wouter nem de auth, só de
// props de navegação (que na prática não são clicadas num HTML estático).
const noop = () => {}
const sharedProps = { onLogin: noop, onSignup: noop, onComoUsar: noop, onTermos: noop, onPrivacidade: noop, onBack: noop }

// Título, descrição e FAQ duplicados aqui de propósito, espelhando os
// mesmos valores passados a useSeoMeta() dentro de cada componente: aquele
// hook só roda depois de hidratar no navegador (é um useEffect), então pro
// HTML estático já sair com <title>/<meta>/JSON-LD corretos, esse mesmo
// conteúdo precisa existir de novo aqui, fora do ciclo de vida do React.
// Mudou o texto lá (LandingLP1.jsx etc.)? Muda aqui também.
export const ROUTES = {
  '/': {
    Component: LandingLP2,
    title: 'Feito pra quem entrega',
    description: 'Sistema de gestão de entregas por motoboy pra lojas de roupas, floriculturas, delivery de comida e qualquer comércio que despacha pedidos. Substitui a planilha e o grupo de WhatsApp.',
    jsonLd: [
      softwareApplicationJsonLd({}),
      faqJsonLd([
        { pergunta: 'Funciona pra qualquer tipo de entrega?', resposta: 'Sim, lojistas que trabalham com entregas por motoboy, independente do ramo de sua loja.' },
        { pergunta: 'Cada motoboy vê os dados dos outros?', resposta: 'Não. O portal do motoboy mostra só as próprias entregas, vales e relatórios — nada de outros motoboys ou informação financeira geral da empresa.' },
        { pergunta: 'Preciso saber mexer em planilha ou sistema?', resposta: 'Não. As telas foram pensadas pra quem nunca usou um sistema de gestão — cadastro de motoboy e lançamento de entrega levam menos de um minuto.' },
      ]),
    ],
  },
  '/lp1': {
    Component: LandingLP1,
    title: 'Toda a operação, num único lugar',
    description: 'Entregas, motoboys, financeiro e relatórios num painel só. Registre entregas, controle vales e gastos, e acompanhe tudo em tempo real — sem planilha solta.',
    jsonLd: faqJsonLd([
      { pergunta: 'Preciso instalar alguma coisa?', resposta: 'Não. O MotoNote roda no navegador, direto pelo celular ou computador — sem aplicativo pra baixar nem instalação no servidor.' },
      { pergunta: 'Meus motoboys têm acesso próprio?', resposta: 'Sim. Cada motoboy cadastrado ganha um login próprio, com um portal enxuto: só o que é dele (entregas, vales, relatórios) — nada de configuração ou dados de outros motoboys.' },
      { pergunta: 'Dá pra cancelar quando quiser?', resposta: 'Sim, sem multa e sem burocracia. Durante o teste grátis, cancelar antes do fim do período não gera nenhuma cobrança.' },
    ]),
  },
  '/lp3': {
    Component: LandingLP3,
    title: 'Comece grátis hoje',
    description: 'Cadastre motoboys, registre entregas e veja o financeiro em tempo real. Teste grátis, sem complicação e sem limite de motoboys durante o período de teste.',
    jsonLd: faqJsonLd([
      { pergunta: 'Preciso de cartão de crédito pra começar?', resposta: 'O cadastro pede os dados de pagamento já no início, mas você não paga nada durante os dias de teste — cancelando antes do fim do período, nenhuma cobrança acontece.' },
      { pergunta: 'Quantos motoboys posso cadastrar no teste?', resposta: 'Não tem limite artificial de motoboys durante o teste — use o MotoNote do jeito que usaria depois de virar cliente.' },
      { pergunta: 'Dá pra cancelar quando quiser?', resposta: 'Sim, sem multa. O cancelamento é feito por você mesmo, direto nas Configurações da conta.' },
    ]),
  },
  '/como-usar': {
    Component: ComoUsar,
    title: 'Como usar',
    description: 'Do cadastro ao fechamento financeiro — veja como organizar sua operação de entregas em poucos passos, com o guia rápido do MotoNote.',
  },
  '/termos': {
    Component: Termos,
    title: 'Termos de Uso',
    description: 'Termos de uso do MotoNote: cadastro, teste grátis e cobrança, uso aceitável, propriedade dos dados e cancelamento da assinatura.',
  },
  '/privacidade': {
    Component: Privacidade,
    title: 'Política de Privacidade',
    description: 'Política de privacidade do MotoNote: quais dados coletamos, para quê, e quais direitos você tem sobre eles, conforme a LGPD.',
  },
}

export function renderRoute(routePath) {
  const route = ROUTES[routePath]
  if (!route) throw new Error(`Rota sem entrada de prerender: ${routePath}`)
  const html = renderToStaticMarkup(<route.Component {...sharedProps} />)
  return { html, title: route.title, description: route.description, jsonLd: route.jsonLd }
}
