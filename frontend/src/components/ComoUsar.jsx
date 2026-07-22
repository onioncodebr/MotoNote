import {
  ArrowLeft, ArrowRight, UserPlus, Bike, Package, BarChart3, CreditCard,
  Download, KeyRound, ShieldCheck,
} from 'lucide-react'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

const passos = [
  {
    icon: UserPlus,
    titulo: '1. Crie sua conta',
    texto: 'Cadastre sua empresa e comece o teste grátis na hora. O cartão é pedido já no cadastro, mas a cobrança só começa depois dos 15 dias — cancele antes disso e não paga nada.',
  },
  {
    icon: Bike,
    titulo: '2. Cadastre seus motoboys',
    texto: 'Em "Motoboys", adicione a equipe que faz as entregas. Cada motoboy pode ganhar um login próprio (e-mail e senha) pra acessar o portal dele e ver só as próprias entregas.',
  },
  {
    icon: Package,
    titulo: '3. Registre as entregas',
    texto: 'Em "Entregas", lance o valor, o motoboy responsável e a data de cada entrega realizada. A tela mostra as mais recentes primeiro, com filtro por período.',
  },
  {
    icon: BarChart3,
    titulo: '4. Acompanhe os resultados',
    texto: 'A "Visão geral" traz o resumo do dia: total de entregas, faturamento, motoboys ativos e o gráfico da semana. Filtre por motoboy ou por período pra ver só o que interessa.',
  },
  {
    icon: Download,
    titulo: '5. Gere relatórios e exporte',
    texto: 'Em "Relatórios", escolha um período (geral ou de um motoboy específico) e exporte tudo em Excel — útil pra fechamento financeiro ou pra repassar pro motoboy.',
  },
  {
    icon: CreditCard,
    titulo: '6. Gerencie sua assinatura',
    texto: 'Em "Assinatura", acompanhe quanto falta do seu teste grátis, assine quando quiser continuar, ou gerencie forma de pagamento e cancelamento — tudo pelo Portal do Cliente do Stripe.',
  },
]

export function ComoUsar({ onBack }) {
  return (
    <div className="landing-page">
      <header className="landing-nav page-width">
        <Logo subtitle />
        <button className="back-home" onClick={onBack}><ArrowLeft size={15} /> Voltar para o início</button>
      </header>
      <main>
        <section className="hero-section page-width" style={{ minHeight: 'auto', paddingBottom: 0 }}>
          <div className="hero-copy" style={{ maxWidth: '640px' }}>
            <div className="eyebrow"><span className="eyebrow-dot" /> Guia rápido</div>
            <h1>Como usar o<br /><em>MotoNote.</em></h1>
            <p>Do cadastro ao fechamento financeiro — veja como organizar sua operação de entregas em poucos passos.</p>
          </div>
        </section>

        <Reveal as="section" className="how-section page-width" id="passos">
          <div className="section-heading">
            <div className="eyebrow">Passo a passo</div>
            <h2>Seis passos pra ter<br /><em>sua operação sob controle.</em></h2>
          </div>
          <div className="how-grid">
            {passos.map((passo) => (
              <article key={passo.titulo}>
                <span className="feature-icon"><passo.icon size={19} /></span>
                <h3>{passo.titulo}</h3>
                <p>{passo.texto}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="features-section page-width" id="portal-motoboy">
          <div className="section-heading">
            <div className="eyebrow">Portal do motoboy</div>
            <h2>Cada motoboy acompanha<br /><em>só as próprias entregas.</em></h2>
            <p>Ao cadastrar um motoboy com e-mail e senha, ele ganha acesso a um portal restrito.</p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-icon"><KeyRound size={19} /></span>
              <h3>Login próprio</h3>
              <p>O motoboy entra com o e-mail e senha cadastrados por você, sem enxergar dados de outros motoboys.</p>
            </article>
            <article>
              <span className="feature-icon"><Package size={19} /></span>
              <h3>Só leitura</h3>
              <p>Ele vê visão geral, entregas e relatórios das próprias corridas — sem poder editar ou cadastrar nada.</p>
            </article>
            <article>
              <span className="feature-icon"><ShieldCheck size={19} /></span>
              <h3>Acesso isolado</h3>
              <p>Se precisar, é possível bloquear o acesso de um motoboy a qualquer momento, sem apagar o histórico dele.</p>
            </article>
          </div>
        </Reveal>

        <section className="contact-banner page-width">
          <div>
            <div className="eyebrow">Pronto pra começar?</div>
            <h2>Volte pra tela inicial<br /><em>e crie sua conta.</em></h2>
          </div>
          <button className="button button-light" onClick={onBack}>Voltar para o início <span><ArrowRight size={17} /></span></button>
        </section>
      </main>
      <footer className="landing-footer page-width">
        <Logo subtitle />
        <span>© 2026 MotoNote. Gestão que movimenta.</span>
        <span>Copyright by OnionCode</span>
      </footer>
    </div>
  )
}
