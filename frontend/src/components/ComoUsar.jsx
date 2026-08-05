import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, UserPlus, Bike, Package, BarChart3, CreditCard,
  Download, KeyRound, ShieldCheck, LayoutDashboard, Banknote, Fuel,
  HandCoins, Settings, ChevronDown,
} from 'lucide-react'
import { Button } from './Button'
import { useSeoMeta } from '../utils/seoMeta'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

// Substitui o <details>/<summary> nativo: a altura do corpo animada
// suavemente (ver .doc-item-collapse em App.css) depende de nós
// controlarmos display/visibilidade via classe — o <details> nativo aplica
// display:none (ou content-visibility:hidden nos browsers mais novos) no
// conteúdo fechado por conta própria, o que corta a transição de CSS antes
// dela rodar. aria-expanded no botão mantém a semântica de disclosure pra
// leitor de tela, que era o principal ganho "de graça" do <details>.
function DocItem({ tela }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`doc-item ${open ? 'is-open' : ''}`}>
      <button type="button" className="doc-item-summary" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="feature-icon"><tela.icon size={19} /></span>
        <span className="doc-item-heading">
          <strong>{tela.titulo}</strong>
          <small>{tela.resumo}</small>
        </span>
        <ChevronDown className="doc-item-chevron" size={18} />
      </button>
      <div className="doc-item-collapse">
        <div className="doc-item-body">
          <p>{tela.texto}</p>
          <img src={`/docs/${tela.print}.jpg`} alt={`Print da tela ${tela.titulo}`} loading="lazy" />
        </div>
      </div>
    </div>
  )
}

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

const telas = [
  {
    icon: LayoutDashboard,
    titulo: 'Visão geral',
    resumo: 'O painel inicial da sua operação.',
    texto: 'Total de entregas, faturamento bruto e líquido, motoboys ativos, ticket médio, valores pendentes, gastos e vales do período — com filtro por motoboy e por período (hoje, semana ou mês). Os gráficos mostram entregas e faturamento por dia, além do ranking de motoboys por faturamento.',
    print: 'visao-geral',
  },
  {
    icon: Package,
    titulo: 'Entregas',
    resumo: 'Onde você lança cada entrega do dia.',
    texto: 'Registre o motoboy responsável, o valor, a forma de pagamento, o valor do pedido (quando o pagamento é em dinheiro) e a data. A lista ao lado mostra as entregas do período selecionado, com o status de recebimento de cada uma e a opção de excluir.',
    print: 'entregas',
  },
  {
    icon: Bike,
    titulo: 'Motoboys',
    resumo: 'Sua equipe de entregadores.',
    texto: 'Cadastre, edite ou remova os motoboys da sua operação. Cada motoboy pode ganhar um login próprio (e-mail e senha) pra acessar um portal restrito, só com as próprias entregas e relatórios.',
    print: 'motoboys',
  },
  {
    icon: Banknote,
    titulo: 'Valores Pendentes',
    resumo: 'Dinheiro que o motoboy ainda não repassou.',
    texto: 'Entregas recebidas em espécie pelo motoboy que ainda não chegaram a você. Selecione uma ou várias e dê baixa assim que o valor for repassado.',
    print: 'valores-pendentes',
  },
  {
    icon: Fuel,
    titulo: 'Gastos',
    resumo: 'Gasolina, manutenção e outros custos da moto.',
    texto: 'Acompanhe os gastos que os motoboys registram no próprio portal. Esses valores entram no cálculo do faturamento líquido mostrado na Visão geral.',
    print: 'gastos',
  },
  {
    icon: HandCoins,
    titulo: 'Vale',
    resumo: 'Adiantamentos e descontos dos motoboys.',
    texto: 'Registre um vale, acompanhe o status (Pendente ou Concluído) e edite ou exclua quando precisar. Útil pra controlar adiantamentos que serão descontados depois.',
    print: 'vale',
  },
  {
    icon: BarChart3,
    titulo: 'Relatórios',
    resumo: 'Feche o período com números exatos.',
    texto: 'Escolha uma data de início e fim (e, se quiser, um motoboy específico) pra ver o total de entregas e o valor do intervalo, com exportação direta pra Excel.',
    print: 'relatorios',
  },
  {
    icon: Settings,
    titulo: 'Configurações',
    resumo: 'Sua conta, assinatura e aparência do sistema.',
    texto: 'Altere seus dados de acesso e senha, gerencie sua assinatura (tudo pelo Portal do Cliente do Stripe) e escolha o tema claro/escuro e a cor de destaque do sistema.',
    print: 'configuracoes',
  },
]

export function ComoUsar({ onBack, onTermos, onPrivacidade }) {
  useSeoMeta({
    title: 'Como usar',
    description: 'Do cadastro ao fechamento financeiro — veja como organizar sua operação de entregas em poucos passos, com o guia rápido do MotoNote.',
    path: '/como-usar',
  })

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

        <Reveal as="section" className="docs-section page-width" id="documentacao">
          <div className="section-heading">
            <div className="eyebrow">Documentação</div>
            <h2>Tela por tela,<br /><em>com print de verdade.</em></h2>
            <p>Clique em cada uma pra ver como ela se parece e o que faz.</p>
          </div>
          <div className="doc-list">
            {telas.map((tela) => (
              <DocItem tela={tela} key={tela.titulo} />
            ))}
          </div>
        </Reveal>

        <section className="contact-banner page-width">
          <div>
            <div className="eyebrow">Pronto pra começar?</div>
            <h2>Volte pra tela inicial<br /><em>e crie sua conta.</em></h2>
          </div>
          <Button variant="light" onClick={onBack}>Voltar para o início <span><ArrowRight size={17} /></span></Button>
        </section>
      </main>
      <footer className="landing-footer page-width">
        <Logo subtitle />
        <span>© 2026 MotoNote. Gestão que movimenta.</span>
        <a href="/termos" className="text-link" onClick={(e) => { e.preventDefault(); onTermos() }}>Termos de Uso</a>
        <a href="/privacidade" className="text-link" onClick={(e) => { e.preventDefault(); onPrivacidade() }}>Privacidade</a>
        <span>Copyright by OnionCode</span>
      </footer>
    </div>
  )
}
