import { useEffect, useState } from 'react'
import {
  ArrowRight, Bike, Wallet, Smartphone, Gift, ShieldCheck, Ban, Coffee,
} from 'lucide-react'
import { getPlano, getConfiguracaoExibicao, registrarVisitaPagina } from '../services/api'
import { formatarMoeda } from '../utils/format'
import { montarWhatsappUrl } from '../utils/whatsapp'
import { useSeoMeta, faqJsonLd } from '../utils/seoMeta'
import { Button } from './Button'
import { Lightbox } from './Lightbox'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

const FAQ = [
  { pergunta: 'Preciso de cartão de crédito pra começar?', resposta: 'O cadastro pede os dados de pagamento já no início, mas você não paga nada durante os dias de teste — cancelando antes do fim do período, nenhuma cobrança acontece.' },
  { pergunta: 'Quantos motoboys posso cadastrar no teste?', resposta: 'Não tem limite artificial de motoboys durante o teste — use o MotoNote do jeito que usaria depois de virar cliente.' },
  { pergunta: 'Dá pra cancelar quando quiser?', resposta: 'Sim, sem multa. O cancelamento é feito por você mesmo, direto nas Configurações da conta.' },
]

// Landing alternativa (/lp3) — ângulo "grátis, direto ao ponto", inspirada
// na estratégia de CTA repetido + benefícios rápidos da Upseller
// (pesquisada via WebFetch). Layout vertical/direto, sem a ilustração
// .hero-art usada em /lp1 e /lp2: o hero já abre com um screenshot real do
// produto, e o CTA de "Começar grátis" se repete em 5 pontos da página —
// mesma lógica de repetição da referência, sem exagerar a ponto de poluir.
// Não afirma "sem cartão de crédito" (a Upseller afirma isso, mas o
// cadastro do MotoNote pede cartão no Checkout mesmo durante o teste — ver
// Cadastro.jsx) — a FAQ é explícita sobre isso em vez de omitir.
export function LandingLP3({ onLogin, onSignup, onComoUsar, onTermos, onPrivacidade }) {
  const [plano, setPlano] = useState(null)
  const [config, setConfig] = useState(null)
  const [imagemAmpliada, setImagemAmpliada] = useState(null)

  useSeoMeta({
    title: 'Comece grátis hoje',
    description: 'Cadastre motoboys, registre entregas e veja o financeiro em tempo real. Teste grátis, sem complicação e sem limite de motoboys durante o período de teste.',
    path: '/lp3',
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
        <nav><a href="#recursos">Recursos</a><a href={whatsappUrl} target="_blank" rel="noreferrer">Fale conosco</a></nav>
        <div className="landing-nav-actions">
          <Button variant="outline" onClick={onLogin}>Entrar <span><ArrowRight size={17} /></span></Button>
          <Button variant="dark" onClick={onSignup}>Começar grátis</Button>
        </div>
      </header>
      <main>
        <section className="page-width" style={{ padding: '55px 0 40px', textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}><span className="eyebrow-dot" /> {trialDays} dias grátis, sem compromisso</div>
          <h1 style={{ margin: '24px auto 18px', maxWidth: 720 }}>Organize sua entrega<br /><em>hoje. Sem complicação.</em></h1>
          <p style={{ maxWidth: 480, margin: '0 auto', color: '#7f7f7f', fontSize: 'var(--fs-md)', lineHeight: 1.7 }}>Cadastre motoboys, registre entregas e veja o financeiro em tempo real. A tela abaixo é o MotoNote de verdade — não uma ilustração.</p>
          <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 26 }}>
            <Button variant="dark" onClick={onSignup}>Começar grátis agora <span><ArrowRight size={17} /></span></Button>
          </div>
          <ul className="trial-badges" style={{ justifyContent: 'center' }}>
            <li><Gift size={14} /> {trialDays} dias grátis</li>
            <li><ShieldCheck size={14} /> Sem cobrança no teste</li>
            <li><Ban size={14} /> Cancele quando quiser</li>
          </ul>
          {plano && <p className="trial-price-note" style={{ maxWidth: 'none' }}>Depois do teste, <strong>{formatarMoeda(plano.valorMensal)}/mês</strong>. Cancele antes disso e não paga nada.</p>}
          {plano && <p className="coffee-note" style={{ maxWidth: 'none' }}><Coffee size={14} /> Menos de <strong>{formatarMoeda(plano.valorMensal / 30)}</strong> por dia — menos que um cafézinho.</p>}
        </section>

        <div className="page-width" style={{ maxWidth: 900, margin: '0 auto 30px' }}>
          <button type="button" className="screenshot-frame" onClick={() => setImagemAmpliada({ src: '/lp/shot-visao-geral.png', alt: 'Tela real da visão geral do MotoNote, com indicadores da operação' })}>
            <img src="/lp/shot-visao-geral.png" alt="Tela real da visão geral do MotoNote, com indicadores da operação" loading="lazy" />
          </button>
        </div>

        <Reveal as="section" className="features-section page-width" id="recursos" style={{ paddingTop: 70 }}>
          <div className="section-heading">
            <div className="eyebrow">Rápido de usar</div>
            <h2>Sem curva de aprendizado,<br /><em>sem complicação.</em></h2>
            <p>O essencial da sua operação, pronto em minutos.</p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-icon"><Bike size={19} /></span>
              <h3>Cadastre motoboys em minutos</h3>
              <p>Nome, contato e acesso próprio — cada motoboy já entra no sistema pronto pra registrar entregas.</p>
            </article>
            <article>
              <span className="feature-icon"><Wallet size={19} /></span>
              <h3>Financeiro em tempo real</h3>
              <p>Valores pendentes, gastos e vales atualizados a cada entrega registrada — sem fechar nada manualmente.</p>
            </article>
            <article>
              <span className="feature-icon"><Smartphone size={19} /></span>
              <h3>Cada motoboy acompanha o seu</h3>
              <p>Portal próprio do motoboy: ele vê as próprias entregas, vales e relatórios, sem precisar te perguntar.</p>
            </article>
          </div>
        </Reveal>

        <Reveal as="section" className="mid-cta page-width">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Comece agora</div>
          <p>É rápido — e os primeiros {trialDays} dias são grátis.</p>
          <Button variant="dark" onClick={onSignup}>Começar grátis <span><ArrowRight size={17} /></span></Button>
        </Reveal>

        <Reveal as="section" className="how-section page-width" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">Como funciona</div>
            <h2>Comece a organizar sua<br /><em>operação em 3 passos.</em></h2>
            <p>Do cadastro ao fechamento financeiro, sem planilhas soltas.</p>
          </div>
          <div className="how-grid">
            <article>
              <span className="how-step">1</span>
              <h3>Cadastre seus motoboys</h3>
              <p>Adicione a equipe que realiza as entregas em poucos segundos, sem burocracia.</p>
            </article>
            <article>
              <span className="how-step">2</span>
              <h3>Registre cada entrega</h3>
              <p>Lance o valor, o motoboy responsável e a data em que a entrega foi realizada.</p>
            </article>
            <article>
              <span className="how-step">3</span>
              <h3>Acompanhe os resultados</h3>
              <p>Veja a visão geral em tempo real e gere relatórios por período sempre que precisar.</p>
            </article>
          </div>
        </Reveal>

        <div className="page-width" style={{ maxWidth: 900, margin: '0 auto 30px' }}>
          <button type="button" className="screenshot-frame" onClick={() => setImagemAmpliada({ src: '/lp/shot-entregas.png', alt: 'Tela real de registro de entregas do MotoNote' })}>
            <img src="/lp/shot-entregas.png" alt="Tela real de registro de entregas do MotoNote" loading="lazy" />
          </button>
        </div>

        <Reveal as="section" className="mid-cta page-width" style={{ padding: '20px 0 60px' }}>
          <Button variant="dark" onClick={onSignup}>Quero começar grátis <span><ArrowRight size={17} /></span></Button>
        </Reveal>

        <Reveal as="section" className="features-section page-width" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">De onde você estiver</div>
            <h2>Funciona no celular<br /><em>igualzinho ao computador.</em></h2>
            <p>Sem app pra baixar — abre no navegador e já funciona.</p>
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
          </div>
        </Reveal>

        <Reveal as="section" className="features-section page-width" style={{ paddingTop: 0 }}>
          <div className="section-heading">
            <div className="eyebrow">Perguntas frequentes</div>
            <h2>Direto ao ponto,<br /><em>sem letra miúda.</em></h2>
          </div>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details className="faq-item" key={item.pergunta}>
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="contact-banner page-width">
          <div>
            <div className="eyebrow">Pronto para começar?</div>
            <h2>Leve mais clareza para<br /><em>sua operação.</em></h2>
          </div>
          <Button variant="light" onClick={onSignup}>Começar grátis <span><ArrowRight size={17} /></span></Button>
        </Reveal>
      </main>
      <footer className="landing-footer page-width"><Logo subtitle /><span>© 2026 MotoNote. Gestão que movimenta.</span><a href="/como-usar" className="text-link" onClick={(e) => { e.preventDefault(); onComoUsar() }}>Como usar</a><a href="/termos" className="text-link" onClick={(e) => { e.preventDefault(); onTermos() }}>Termos de Uso</a><a href="/privacidade" className="text-link" onClick={(e) => { e.preventDefault(); onPrivacidade() }}>Privacidade</a><span>Copyright by OnionCode</span></footer>
      <Lightbox src={imagemAmpliada?.src} alt={imagemAmpliada?.alt} onClose={() => setImagemAmpliada(null)} />
    </div>
  )
}
