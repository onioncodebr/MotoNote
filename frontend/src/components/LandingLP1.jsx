import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowDown, TrendingUp, CheckCircle2, Gift, ShieldCheck, Ban, Coffee,
} from 'lucide-react'
import { getPlano, getConfiguracaoExibicao, registrarVisitaPagina } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { montarWhatsappUrl } from '../utils/whatsapp'
import { useSeoMeta, faqJsonLd } from '../utils/seoMeta'
import { Button } from './Button'
import { Lightbox } from './Lightbox'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

const PILARES = [
  {
    eyebrow: 'Operação',
    titulo: 'Cada entrega, registrada na hora.',
    texto: 'Lance o valor, o motoboy responsável e a forma de pagamento em segundos. O histórico completo fica sempre disponível, filtrável por motoboy e por período — sem depender de caderno ou grupo de WhatsApp.',
    imagem: '/lp/shot-entregas.png',
    alt: 'Tela real de registro de entregas do MotoNote, com formulário e lista de entregas recentes',
  },
  {
    eyebrow: 'Financeiro',
    titulo: 'Vale, gasto e valor pendente, sob controle.',
    texto: 'Adiantamentos podem ser parcelados em datas escolhidas por você — cada parcela concluída ou reaberta de forma independente. Gastos e valores pendentes ficam no mesmo painel, sem planilha paralela.',
    imagem: '/lp/shot-vale.png',
    alt: 'Tela real de vales do MotoNote, mostrando um adiantamento parcelado em 4 vezes',
  },
  {
    eyebrow: 'Relatórios',
    titulo: 'A operação inteira, num gráfico só.',
    texto: 'Entregas e faturamento por dia, ranking de motoboys por período — tudo calculado automaticamente a partir do que já foi lançado, sem fechamento manual no fim do mês.',
    imagem: '/lp/shot-graficos.png',
    alt: 'Tela real de gráficos do MotoNote, com entregas e faturamento por dia e ranking de motoboys',
  },
]

const FAQ = [
  { pergunta: 'Preciso instalar alguma coisa?', resposta: 'Não. O MotoNote roda no navegador, direto pelo celular ou computador — sem aplicativo pra baixar nem instalação no servidor.' },
  { pergunta: 'Meus motoboys têm acesso próprio?', resposta: 'Sim. Cada motoboy cadastrado ganha um login próprio, com um portal enxuto: só o que é dele (entregas, vales, relatórios) — nada de configuração ou dados de outros motoboys.' },
  { pergunta: 'Dá pra cancelar quando quiser?', resposta: 'Sim, sem multa e sem burocracia. Durante o teste grátis, cancelar antes do fim do período não gera nenhuma cobrança.' },
]

// Landing alternativa (/lp1) — ângulo "operação conectada", inspirada na
// estratégia de confiança-por-visão-unificada da Olist (pesquisada via
// WebFetch). Layout em linhas alternadas (texto de um lado, screenshot
// real do produto do outro) — diferente da grade de cards usada em /lp2 e
// do layout vertical de /lp3. As imagens em PILARES são capturas reais do
// dashboard (frontend/public/lp/), não ilustração — igual pedido: nada de
// depoimento ou número de cliente inventado, só o produto de verdade.
export function LandingLP1({ onLogin, onSignup, onComoUsar, onTermos, onPrivacidade }) {
  const [plano, setPlano] = useState(null)
  const [config, setConfig] = useState(null)
  const [imagemAmpliada, setImagemAmpliada] = useState(null)

  useSeoMeta({
    title: 'Toda a operação, num único lugar',
    description: 'Entregas, motoboys, financeiro e relatórios num painel só. Registre entregas, controle vales e gastos, e acompanhe tudo em tempo real — sem planilha solta.',
    path: '/lp1',
    jsonLd: faqJsonLd(FAQ),
  })

  useEffect(() => {
    let cancelado = false
    getPlano().then((data) => { if (!cancelado) setPlano(data) }).catch(() => {})
    getConfiguracaoExibicao().then((data) => { if (!cancelado) setConfig(data) }).catch(() => {})
    registrarVisitaPagina('LANDING')
    return () => { cancelado = true }
  }, [])

  const trialDays = plano?.trialDays ?? 15
  const whatsappUrl = montarWhatsappUrl(config?.contatoSuporteWhatsapp)

  return (
    <div className="landing-page">
      <header className="landing-nav page-width">
        <Logo subtitle />
        <nav><a href="#pilares">Pilares</a><a href="#perguntas">Perguntas</a><a href={whatsappUrl} target="_blank" rel="noreferrer">Fale conosco</a></nav>
        <div className="landing-nav-actions">
          <Button variant="outline" onClick={onLogin}>Entrar <span><ArrowRight size={17} /></span></Button>
          <Button variant="dark" onClick={onSignup}>Iniciar teste grátis</Button>
        </div>
      </header>
      <main>
        <section className="hero-section page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Gestão conectada</div>
            <h1>Toda a sua operação.<br /><em>Num único lugar.</em></h1>
            <p>Entregas, motoboys, financeiro e relatórios — sem planilha solta, sem sistema separado pra cada coisa. Uma visão só, sempre atualizada.</p>
            <div className="hero-actions"><Button variant="dark" onClick={onSignup}>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></Button><a href="#pilares" className="text-link">Conheça os pilares <span><ArrowDown size={17} /></span></a></div>
            <ul className="trial-badges">
              <li><Gift size={14} /> {trialDays} dias grátis</li>
              <li><ShieldCheck size={14} /> Sem cobrança no teste</li>
              <li><Ban size={14} /> Cancele quando quiser</li>
            </ul>
            {plano && <p className="trial-price-note">Depois do teste, <strong>{formatarMoeda(plano.valorMensal)}/mês</strong>. Cancele antes disso e não paga nada.</p>}
            {plano && <p className="coffee-note"><Coffee size={14} /> Menos de <strong>{formatarMoeda(plano.valorMensal / 30)}</strong> por dia — menos que um cafézinho.</p>}
          </div>
          <div className="hero-art" aria-label="Pilares da operação conectados">
            <div className="art-glow" />
            <div className="floating-card floating-top"><span className="mini-icon green-bg"><TrendingUp size={15} strokeWidth={2.5} /></span><div><small>Entregas hoje</small><strong>+24,8%</strong></div></div>
            <div className="dashboard-preview">
              <div className="preview-header"><Logo compact /><span className="preview-menu">•••</span></div>
              <div className="preview-greeting"><small>Visão geral</small><strong>Bom dia, empresa!</strong></div>
              <div className="preview-stats"><div><small>Entregas</small><strong>128</strong><span>+12,5%</span></div><div><small>Faturamento</small><strong>R$ 4.280</strong><span>+8,2%</span></div></div>
              <div className="preview-chart"><div className="chart-label"><span>Entregas por período</span><small>Últimos 7 dias</small></div><div className="preview-graph"><div className="preview-grid-lines"><i /><i /><i /></div><svg viewBox="0 0 300 100" preserveAspectRatio="none"><polyline points="0,57 50,41 100,52 150,26 200,37 250,10 300,22" fill="none" stroke="var(--chart-1)" strokeWidth="2.5" /></svg></div><div className="chart-days"><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div></div>
              <div className="preview-riders"><div className="chart-label"><span>Motoboys ativos</span><small>Ver todos →</small></div><div className="rider-row"><span className="rider-avatar green">CM</span><span>Carlos Mendes</span><b>42 entregas</b></div><div className="rider-row"><span className="rider-avatar blue">RS</span><span>Rafael Souza</span><b>36 entregas</b></div></div>
            </div>
            <div className="floating-card floating-bottom"><span className="mini-icon dark-bg"><CheckCircle2 size={15} strokeWidth={2.5} /></span><div><small>Operação em dia</small><strong>100% organizada</strong></div></div>
          </div>
        </section>

        <div className="page-width" id="pilares">
          <div className="section-heading" style={{ paddingTop: 40 }}>
            <div className="eyebrow">Como funciona</div>
            <h2>Três pilares,<br /><em>uma visão só.</em></h2>
            <p>Cada parte da operação já conversa com as outras — telas reais do MotoNote, sem maquete.</p>
          </div>
          {PILARES.map((pilar, i) => (
            <Reveal key={pilar.eyebrow} as="div" className={`pillar-row${i % 2 === 1 ? ' reverse' : ''}`}>
              <div className="pillar-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> {pilar.eyebrow}</div>
                <h3>{pilar.titulo}</h3>
                <p>{pilar.texto}</p>
              </div>
              <button type="button" className="screenshot-frame" onClick={() => setImagemAmpliada({ src: pilar.imagem, alt: pilar.alt })}>
                <img src={pilar.imagem} alt={pilar.alt} loading="lazy" />
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal as="section" className="mid-cta page-width">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Sem planilha, sem grupo de WhatsApp</div>
          <p>Tudo que você faria em três lugares diferentes, feito num só.</p>
          <Button variant="dark" onClick={onSignup}>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></Button>
        </Reveal>

        <Reveal as="section" className="features-section page-width" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">No bolso, o dia todo</div>
            <h2>Funciona tão bem<br /><em>no celular quanto no computador.</em></h2>
            <p>As mesmas telas reais, adaptadas — nada de versão reduzida.</p>
          </div>
          <div className="phone-showcase">
            <figure className="phone-frame">
              <button type="button" className="phone-screen" onClick={() => setImagemAmpliada({ src: '/lp/shot-visao-geral-mobile.png', alt: 'Visão geral do MotoNote no celular, tela real' })}>
                <img src="/lp/shot-visao-geral-mobile.png" alt="Visão geral do MotoNote no celular, tela real" loading="lazy" />
              </button>
              <figcaption>Visão geral</figcaption>
            </figure>
            <figure className="phone-frame">
              <button type="button" className="phone-screen" onClick={() => setImagemAmpliada({ src: '/lp/shot-vale-mobile.png', alt: 'Lista de vales do MotoNote no celular, tela real' })}>
                <img src="/lp/shot-vale-mobile.png" alt="Lista de vales do MotoNote no celular, tela real" loading="lazy" />
              </button>
              <figcaption>Vales</figcaption>
            </figure>
          </div>
        </Reveal>

        <Reveal as="section" className="features-section page-width" id="perguntas" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">Perguntas frequentes</div>
            <h2>Antes de começar,<br /><em>tire suas dúvidas.</em></h2>
          </div>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details className="faq-item" key={item.pergunta}>
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Button variant="dark" onClick={onSignup}>Ainda com dúvida? Comece o teste grátis <span><ArrowRight size={17} /></span></Button>
          </div>
        </Reveal>

        <Reveal as="section" className="contact-banner page-width">
          <div>
            <div className="eyebrow">Pronto para começar?</div>
            <h2>Conecte sua operação<br /><em>hoje mesmo.</em></h2>
          </div>
          <Button variant="light" onClick={onSignup}>Iniciar teste grátis <span><ArrowRight size={17} /></span></Button>
        </Reveal>
      </main>
      <footer className="landing-footer page-width"><Logo subtitle /><span>© 2026 MotoNote. Gestão que movimenta.</span><a href="/como-usar" className="text-link" onClick={(e) => { e.preventDefault(); onComoUsar() }}>Como usar</a><a href="/termos" className="text-link" onClick={(e) => { e.preventDefault(); onTermos() }}>Termos de Uso</a><a href="/privacidade" className="text-link" onClick={(e) => { e.preventDefault(); onPrivacidade() }}>Privacidade</a><span>Copyright by OnionCode</span></footer>
      <Lightbox src={imagemAmpliada?.src} alt={imagemAmpliada?.alt} onClose={() => setImagemAmpliada(null)} />
    </div>
  )
}
