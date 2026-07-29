import { useEffect, useState } from 'react'
import {
  ArrowRight, ArrowDown, TrendingUp, CheckCircle2,
  Gift, ShieldCheck, Ban, Coffee, Shirt, Flower2, UtensilsCrossed, Check,
} from 'lucide-react'
import { getPlano, getConfiguracaoExibicao, registrarVisitaPagina } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { montarWhatsappUrl } from '../utils/whatsapp'
import { Button } from './Button'
import { Lightbox } from './Lightbox'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

const SEGMENTOS = [
  { icon: Shirt, titulo: 'Loja de roupas', texto: 'Venda pelo WhatsApp ou pela loja física e mande pelo motoboy: cada entrega registrada, com o valor certo e o cliente certo, sem depender de anotação solta.' },
  { icon: Flower2, titulo: 'Floriculturas', texto: 'Entrega tem hora certa pra chegar. Acompanhe qual motoboy está com qual pedido e feche o financeiro do dia sem perder nenhuma entrega de vista.' },
  { icon: UtensilsCrossed, titulo: 'Delivery de comida (pizzarias e lanches)', texto: 'Fluxo alto, vários motoboys ao mesmo tempo: valores pendentes, vales e gastos organizados por pessoa, com relatório pronto no fim do turno.' },
]

const ABAS = [
  {
    id: 'entregas',
    label: 'Entregas',
    titulo: 'Registre cada entrega em segundos.',
    imagem: '/lp/shot-entregas.png',
    alt: 'Tela real de registro de entregas do MotoNote',
    itens: ['Motoboy, valor, forma de pagamento e data — tudo num formulário só', 'Lista de entregas recentes, filtrável por motoboy e período', 'Status de cada entrega (recebido/pendente) sempre visível'],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    titulo: 'Vale, gasto e valor pendente, num só painel.',
    imagem: '/lp/shot-vale.png',
    alt: 'Tela real de vales do MotoNote, com um adiantamento parcelado',
    itens: ['Vales podem ser parcelados em datas escolhidas por você', 'Cada parcela concluída ou reaberta de forma independente', 'Gastos e valores pendentes organizados por motoboy'],
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    titulo: 'A operação inteira, num painel só.',
    imagem: '/lp/shot-visao-geral.png',
    alt: 'Tela real da visão geral do MotoNote, com indicadores da operação',
    itens: ['Entregas, faturamento e ticket médio do período', 'Valores pendentes e gastos consolidados', 'Motoboys ativos e ranking por faturamento'],
  },
]

const COMPARACAO = [
  { criterio: 'Onde ficam os dados', planilha: 'Espalhados (planilha + WhatsApp)', motonote: 'Tudo num só lugar' },
  { criterio: 'Valores pendentes', planilha: 'Calculado manualmente', motonote: 'Atualizado a cada entrega' },
  { criterio: 'Motoboy acompanha o próprio trabalho', planilha: 'Não', motonote: 'Sim, com portal próprio' },
  { criterio: 'Vale parcelado em datas escolhidas', planilha: 'Anotado à parte, fácil de esquecer', motonote: 'Sim, cada parcela controlada' },
  { criterio: 'Relatório por período', planilha: 'Fechado manualmente', motonote: 'Gerado automaticamente' },
]

const FAQ = [
  { pergunta: 'Funciona pra qualquer tipo de entrega?', resposta: 'Sim, lojistas que trabalham com entregas por motoboy, independente do ramo de sua loja.' },
  { pergunta: 'Cada motoboy vê os dados dos outros?', resposta: 'Não. O portal do motoboy mostra só as próprias entregas, vales e relatórios — nada de outros motoboys ou informação financeira geral da empresa.' },
  { pergunta: 'Preciso saber mexer em planilha ou sistema?', resposta: 'Não. As telas foram pensadas pra quem nunca usou um sistema de gestão — cadastro de motoboy e lançamento de entrega levam menos de um minuto.' },
]

// Landing alternativa (/lp2) — ângulo "para quem é", inspirada na
// estratégia de segmentação + profundidade de recursos da Bling
// (pesquisada via WebFetch). Layout com abas interativas (Entregas /
// Financeiro / Indicadores), cada uma com screenshot real do produto —
// diferente do layout em linhas alternadas de /lp1 e do vertical de /lp3.
export function LandingLP2({ onLogin, onSignup, onComoUsar, onTermos, onPrivacidade }) {
  const [plano, setPlano] = useState(null)
  const [config, setConfig] = useState(null)
  const [abaAtiva, setAbaAtiva] = useState(ABAS[0].id)
  const [imagemAmpliada, setImagemAmpliada] = useState(null)

  useEffect(() => {
    document.title = 'MotoNote — Feito pra quem entrega'
    return () => { document.title = 'MotoNote' }
  }, [])

  useEffect(() => {
    let cancelado = false
    getPlano().then((data) => { if (!cancelado) setPlano(data) }).catch(() => {})
    getConfiguracaoExibicao().then((data) => { if (!cancelado) setConfig(data) }).catch(() => {})
    registrarVisitaPagina('LANDING')
    return () => { cancelado = true }
  }, [])

  // Avança sozinho pra próxima aba a cada poucos segundos — reagendado a
  // cada troca (automática ou por clique), pra nunca trocar logo depois de
  // alguém clicar manualmente numa aba.
  useEffect(() => {
    const id = setTimeout(() => {
      setAbaAtiva((atual) => {
        const indiceAtual = ABAS.findIndex((a) => a.id === atual)
        return ABAS[(indiceAtual + 1) % ABAS.length].id
      })
    }, 4500)
    return () => clearTimeout(id)
  }, [abaAtiva])

  const trialDays = plano?.trialDays ?? 15
  const whatsappUrl = montarWhatsappUrl(config?.contatoSuporteWhatsapp)
  const aba = ABAS.find((a) => a.id === abaAtiva) || ABAS[0]

  return (
    <div className="landing-page">
      <header className="landing-nav page-width">
        <Logo subtitle />
        <nav><a href="#para-quem">Para quem é</a><a href="#recursos">Recursos</a><a href={whatsappUrl} target="_blank" rel="noreferrer">Fale conosco</a></nav>
        <div className="landing-nav-actions">
          <Button variant="outline" onClick={onLogin}>Entrar <span><ArrowRight size={17} /></span></Button>
          <Button variant="dark" onClick={onSignup}>Iniciar teste grátis</Button>
        </div>
      </header>
      <main>
        <section className="hero-section page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Para quem entrega</div>
            <h1>Feito pra quem entrega,<br /><em>do jeito que você entrega.</em></h1>
            <p>De um motoboy autônomo com equipe pequena até uma operação de e-commerce com entrega própria — o MotoNote se adapta ao tamanho do seu negócio.</p>
            <div className="hero-actions"><Button variant="dark" onClick={onSignup}>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></Button><a href="#para-quem" className="text-link">Ver pra quem é <span><ArrowDown size={17} /></span></a></div>
            <ul className="trial-badges">
              <li><Gift size={14} /> {trialDays} dias grátis</li>
              <li><ShieldCheck size={14} /> Sem cobrança no teste</li>
              <li><Ban size={14} /> Cancele quando quiser</li>
            </ul>
            {plano && <p className="trial-price-note">Depois do teste, <strong>{formatarMoeda(plano.valorMensal)}/mês</strong>. Cancele antes disso e não paga nada.</p>}
            {plano && <p className="coffee-note"><Coffee size={14} /> Menos de <strong>{formatarMoeda(plano.valorMensal / 30)}</strong> por dia — menos que um cafézinho.</p>}
          </div>
          <div className="hero-art" aria-label="Resumo da operação de entregas">
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

        <Reveal as="section" className="features-section page-width" id="para-quem">
          <div className="section-heading">
            <div className="eyebrow">Para quem é</div>
            <h2>Não importa o ramo<br /><em>da sua loja.</em></h2>
            <p>Três tipos de comércio que já organizam as entregas com o MotoNote.</p>
          </div>
          <div className="feature-grid">
            {SEGMENTOS.map((seg) => (
              <article key={seg.titulo}>
                <span className="feature-icon"><seg.icon size={19} /></span>
                <h3>{seg.titulo}</h3>
                <p>{seg.texto}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="mid-cta page-width">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Não importa o perfil</div>
          <p>O cadastro é o mesmo pra qualquer tamanho de operação — comece agora.</p>
          <Button variant="dark" onClick={onSignup}>Iniciar teste grátis de {trialDays} dias <span><ArrowRight size={17} /></span></Button>
        </Reveal>

        <Reveal as="section" className="features-section page-width" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">Planilha vs. MotoNote</div>
            <h2>O que muda na prática<br /><em>pro seu dia a dia.</em></h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="compare-table">
              <thead>
                <tr><th></th><th>Planilha + WhatsApp</th><th>MotoNote</th></tr>
              </thead>
              <tbody>
                {COMPARACAO.map((linha) => (
                  <tr key={linha.criterio}>
                    <td>{linha.criterio}</td>
                    <td className="cell-no">{linha.planilha}</td>
                    <td className="cell-yes">{linha.motonote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal as="section" className="features-section page-width" id="recursos" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">Recursos</div>
            <h2>Veja o produto<br /><em>por dentro.</em></h2>
            <p>Telas reais do MotoNote — clique pra ver cada parte da operação.</p>
          </div>
          <div className="tab-switcher">
            <div className="tab-buttons" role="tablist">
              {ABAS.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={abaAtiva === item.id} className={abaAtiva === item.id ? 'active' : ''} onClick={() => setAbaAtiva(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="tab-panel" key={aba.id}>
              <button type="button" className="screenshot-frame view-fade" onClick={() => setImagemAmpliada({ src: aba.imagem, alt: aba.alt })}>
                <img src={aba.imagem} alt={aba.alt} loading="lazy" />
              </button>
              <div className="view-fade">
                <h3>{aba.titulo}</h3>
                <ul>
                  {aba.itens.map((item) => (
                    <li key={item}><Check size={16} /> {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
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
              <button type="button" className="phone-screen" onClick={() => setImagemAmpliada({ src: '/lp/shot-entregas-mobile.png', alt: 'Lista de entregas do MotoNote no celular, tela real' })}>
                <img src="/lp/shot-entregas-mobile.png" alt="Lista de entregas do MotoNote no celular, tela real" loading="lazy" />
              </button>
              <figcaption>Entregas</figcaption>
            </figure>
            <figure className="phone-frame">
              <button type="button" className="phone-screen" onClick={() => setImagemAmpliada({ src: '/lp/shot-vale-mobile.png', alt: 'Lista de vales do MotoNote no celular, tela real' })}>
                <img src="/lp/shot-vale-mobile.png" alt="Lista de vales do MotoNote no celular, tela real" loading="lazy" />
              </button>
              <figcaption>Vales</figcaption>
            </figure>
          </div>
        </Reveal>

        <Reveal as="section" className="features-section page-width" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">Perguntas frequentes</div>
            <h2>Ainda com dúvida?<br /><em>Provavelmente já respondemos.</em></h2>
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
            <h2>Encontre o seu jeito<br /><em>de usar o MotoNote.</em></h2>
          </div>
          <Button variant="light" onClick={onSignup}>Iniciar teste grátis <span><ArrowRight size={17} /></span></Button>
        </Reveal>
      </main>
      <footer className="landing-footer page-width"><Logo subtitle /><span>© 2026 MotoNote. Gestão que movimenta.</span><a href="/como-usar" className="text-link" onClick={(e) => { e.preventDefault(); onComoUsar() }}>Como usar</a><a href="/termos" className="text-link" onClick={(e) => { e.preventDefault(); onTermos() }}>Termos de Uso</a><a href="/privacidade" className="text-link" onClick={(e) => { e.preventDefault(); onPrivacidade() }}>Privacidade</a><span>Copyright by OnionCode</span></footer>
      <Lightbox src={imagemAmpliada?.src} alt={imagemAmpliada?.alt} onClose={() => setImagemAmpliada(null)} />
    </div>
  )
}
